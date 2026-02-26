import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListAiRunLogsQueryDto } from './dto/list-ai-run-logs-query.dto';
import {
  DEFAULT_IDEAS_PAGE_LIMIT,
  ListIdeasQueryDto,
} from './dto/list-ideas-query.dto';
import { AiRunLog } from './entities/ai-run-log.entity';
import { Asset, AssetType } from './entities/asset.entity';
import { Caption } from './entities/caption.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea } from './entities/idea.entity';
import { Script } from './entities/script.entity';

type IdeasPageCursor = {
  createdAt: string;
  id: string;
};

type IdeasListItem = Idea & {
  latestScript: Script | null;
  latestCaption: Caption | null;
  latestImage: Asset | null;
  latestVideo: Asset | null;
  latestImageStatus: GenerationStatus | null;
  latestVideoStatus: GenerationStatus | null;
  scriptSucceededCount: number;
  captionSucceededCount: number;
  imageAssetsCount: number;
  videoAssetsCount: number;
  imageSucceededCount: number;
  videoSucceededCount: number;
};

export type IdeasPageResponse = {
  items: IdeasListItem[];
  nextCursor: IdeasPageCursor | null;
  hasMore: boolean;
};

@Injectable()
export class IdeasReadService {
  constructor(
    @InjectRepository(Idea)
    private readonly ideasRepository: Repository<Idea>,
    @InjectRepository(Script)
    private readonly scriptsRepository: Repository<Script>,
    @InjectRepository(Caption)
    private readonly captionsRepository: Repository<Caption>,
    @InjectRepository(AiRunLog)
    private readonly logsRepository: Repository<AiRunLog>,
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
  ) {}

  async findAll(query: ListIdeasQueryDto): Promise<IdeasPageResponse> {
    const limit = query.limit ?? DEFAULT_IDEAS_PAGE_LIMIT;
    const cursor = this.resolveIdeasCursor(query);

    const qb = this.ideasRepository
      .createQueryBuilder('idea')
      .orderBy('idea.createdAt', 'DESC')
      .addOrderBy('idea.id', 'DESC')
      .take(limit + 1);

    if (query.projectId) {
      qb.where('idea.projectId = :projectId', {
        projectId: query.projectId,
      });
    }

    if (cursor) {
      qb.andWhere(
        '(idea.createdAt < :cursorCreatedAt OR (idea.createdAt = :cursorCreatedAt AND idea.id < :cursorId))',
        {
          cursorCreatedAt: cursor.createdAt,
          cursorId: cursor.id,
        },
      );
    }

    const ideasBatch = await qb.getMany();
    const hasMore = ideasBatch.length > limit;
    const ideas = hasMore ? ideasBatch.slice(0, limit) : ideasBatch;

    if (!ideas.length) {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    const ideaIds = ideas.map((idea) => idea.id);
    const [
      latestScriptsByIdea,
      latestCaptionsByIdea,
      scriptSucceededCountByIdea,
      captionSucceededCountByIdea,
      latestAssetStatusesByIdea,
      latestSucceededAssetsByIdea,
      assetCountsByIdea,
    ] = await Promise.all([
      this.fetchLatestScriptsByIdea(ideaIds),
      this.fetchLatestCaptionsByIdea(ideaIds),
      this.fetchScriptSucceededCountByIdea(ideaIds),
      this.fetchCaptionSucceededCountByIdea(ideaIds),
      this.fetchLatestAssetStatusesByIdea(ideaIds),
      this.fetchLatestSucceededAssetsByIdea(ideaIds),
      this.fetchAssetCountsByIdea(ideaIds),
    ]);

    const items = ideas.map((idea) => {
      const counts = assetCountsByIdea.get(idea.id);
      return {
        ...idea,
        latestScript: latestScriptsByIdea.get(idea.id) ?? null,
        latestCaption: latestCaptionsByIdea.get(idea.id) ?? null,
        latestImage:
          latestSucceededAssetsByIdea.imageByIdea.get(idea.id) ?? null,
        latestVideo:
          latestSucceededAssetsByIdea.videoByIdea.get(idea.id) ?? null,
        latestImageStatus:
          latestAssetStatusesByIdea.imageStatusByIdea.get(idea.id) ?? null,
        latestVideoStatus:
          latestAssetStatusesByIdea.videoStatusByIdea.get(idea.id) ?? null,
        scriptSucceededCount: scriptSucceededCountByIdea.get(idea.id) ?? 0,
        captionSucceededCount: captionSucceededCountByIdea.get(idea.id) ?? 0,
        imageAssetsCount: counts?.imageAssetsCount ?? 0,
        videoAssetsCount: counts?.videoAssetsCount ?? 0,
        imageSucceededCount: counts?.imageSucceededCount ?? 0,
        videoSucceededCount: counts?.videoSucceededCount ?? 0,
      };
    });

    const lastIdea = items[items.length - 1];
    const nextCursor =
      hasMore && lastIdea
        ? {
            createdAt: lastIdea.createdAt.toISOString(),
            id: lastIdea.id,
          }
        : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  }

  async findOne(ideaId: string) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const [scripts, captions, assets] = await Promise.all([
      this.scriptsRepository.find({
        where: { ideaId },
        order: { createdAt: 'DESC' },
      }),
      this.captionsRepository.find({
        where: { ideaId },
        order: { createdAt: 'DESC' },
      }),
      this.assetsRepository.find({
        where: { ideaId },
        order: { createdAt: 'DESC' },
      }),
    ]);

    return {
      ...idea,
      scripts,
      captions,
      assets,
    };
  }

  async listLogs(query: ListAiRunLogsQueryDto) {
    const limit = query.limit ?? 30;
    const qb = this.logsRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .take(limit);

    if (query.projectId) {
      qb.andWhere('log.projectId = :projectId', { projectId: query.projectId });
    }
    if (query.ideaId) {
      qb.andWhere('log.ideaId = :ideaId', { ideaId: query.ideaId });
    }

    return qb.getMany();
  }

  private resolveIdeasCursor(
    query: ListIdeasQueryDto,
  ): { createdAt: string; id: string } | null {
    const hasCreatedAt = Boolean(query.cursorCreatedAt);
    const hasId = Boolean(query.cursorId);

    if (hasCreatedAt !== hasId) {
      throw new BadRequestException(
        'cursorCreatedAt and cursorId must be provided together',
      );
    }

    if (!query.cursorCreatedAt || !query.cursorId) {
      return null;
    }

    const cursorDate = new Date(query.cursorCreatedAt);
    if (Number.isNaN(cursorDate.getTime())) {
      throw new BadRequestException('cursorCreatedAt must be a valid ISO date');
    }
    return {
      createdAt: cursorDate.toISOString(),
      id: query.cursorId,
    };
  }

  private async fetchLatestScriptsByIdea(
    ideaIds: string[],
  ): Promise<Map<string, Script>> {
    const latestScripts = await this.scriptsRepository
      .createQueryBuilder('script')
      .distinctOn(['script.ideaId'])
      .where('script.ideaId IN (:...ideaIds)', { ideaIds })
      .orderBy('script.ideaId', 'ASC')
      .addOrderBy('script.createdAt', 'DESC')
      .getMany();

    return new Map(latestScripts.map((script) => [script.ideaId, script]));
  }

  private async fetchLatestCaptionsByIdea(
    ideaIds: string[],
  ): Promise<Map<string, Caption>> {
    const latestCaptions = await this.captionsRepository
      .createQueryBuilder('caption')
      .distinctOn(['caption.ideaId'])
      .where('caption.ideaId IN (:...ideaIds)', { ideaIds })
      .orderBy('caption.ideaId', 'ASC')
      .addOrderBy('caption.createdAt', 'DESC')
      .getMany();

    return new Map(latestCaptions.map((caption) => [caption.ideaId, caption]));
  }

  private async fetchScriptSucceededCountByIdea(
    ideaIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.scriptsRepository
      .createQueryBuilder('script')
      .select('script.ideaId', 'ideaId')
      .addSelect('COUNT(*)::int', 'count')
      .where('script.ideaId IN (:...ideaIds)', { ideaIds })
      .andWhere('script.status = :status', {
        status: GenerationStatus.SUCCEEDED,
      })
      .groupBy('script.ideaId')
      .getRawMany<{ ideaId: string; count: string }>();

    return new Map(rows.map((row) => [row.ideaId, Number(row.count) || 0]));
  }

  private async fetchCaptionSucceededCountByIdea(
    ideaIds: string[],
  ): Promise<Map<string, number>> {
    const rows = await this.captionsRepository
      .createQueryBuilder('caption')
      .select('caption.ideaId', 'ideaId')
      .addSelect('COUNT(*)::int', 'count')
      .where('caption.ideaId IN (:...ideaIds)', { ideaIds })
      .andWhere('caption.status = :status', {
        status: GenerationStatus.SUCCEEDED,
      })
      .groupBy('caption.ideaId')
      .getRawMany<{ ideaId: string; count: string }>();

    return new Map(rows.map((row) => [row.ideaId, Number(row.count) || 0]));
  }

  private async fetchLatestAssetStatusesByIdea(ideaIds: string[]): Promise<{
    imageStatusByIdea: Map<string, GenerationStatus>;
    videoStatusByIdea: Map<string, GenerationStatus>;
  }> {
    const latestAssets = await this.assetsRepository
      .createQueryBuilder('asset')
      .distinctOn(['asset.ideaId', 'asset.type'])
      .where('asset.ideaId IN (:...ideaIds)', { ideaIds })
      .andWhere('asset.type IN (:...assetTypes)', {
        assetTypes: [AssetType.IMAGE, AssetType.VIDEO],
      })
      .orderBy('asset.ideaId', 'ASC')
      .addOrderBy('asset.type', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC')
      .getMany();

    const imageStatusByIdea = new Map<string, GenerationStatus>();
    const videoStatusByIdea = new Map<string, GenerationStatus>();
    for (const asset of latestAssets) {
      if (asset.type === AssetType.IMAGE) {
        imageStatusByIdea.set(asset.ideaId, asset.status);
        continue;
      }
      if (asset.type === AssetType.VIDEO) {
        videoStatusByIdea.set(asset.ideaId, asset.status);
      }
    }

    return { imageStatusByIdea, videoStatusByIdea };
  }

  private async fetchLatestSucceededAssetsByIdea(ideaIds: string[]): Promise<{
    imageByIdea: Map<string, Asset>;
    videoByIdea: Map<string, Asset>;
  }> {
    const latestSucceededAssets = await this.assetsRepository
      .createQueryBuilder('asset')
      .distinctOn(['asset.ideaId', 'asset.type'])
      .where('asset.ideaId IN (:...ideaIds)', { ideaIds })
      .andWhere('asset.type IN (:...assetTypes)', {
        assetTypes: [AssetType.IMAGE, AssetType.VIDEO],
      })
      .andWhere('asset.status = :status', {
        status: GenerationStatus.SUCCEEDED,
      })
      .orderBy('asset.ideaId', 'ASC')
      .addOrderBy('asset.type', 'ASC')
      .addOrderBy('asset.createdAt', 'DESC')
      .getMany();

    const imageByIdea = new Map<string, Asset>();
    const videoByIdea = new Map<string, Asset>();
    for (const asset of latestSucceededAssets) {
      if (asset.type === AssetType.IMAGE) {
        imageByIdea.set(asset.ideaId, asset);
        continue;
      }
      if (asset.type === AssetType.VIDEO) {
        videoByIdea.set(asset.ideaId, asset);
      }
    }

    return { imageByIdea, videoByIdea };
  }

  private async fetchAssetCountsByIdea(ideaIds: string[]): Promise<
    Map<
      string,
      {
        imageAssetsCount: number;
        videoAssetsCount: number;
        imageSucceededCount: number;
        videoSucceededCount: number;
      }
    >
  > {
    const rows = await this.assetsRepository
      .createQueryBuilder('asset')
      .select('asset.ideaId', 'ideaId')
      .addSelect(
        'SUM(CASE WHEN asset.type = :imageType THEN 1 ELSE 0 END)::int',
        'imageAssetsCount',
      )
      .addSelect(
        'SUM(CASE WHEN asset.type = :videoType THEN 1 ELSE 0 END)::int',
        'videoAssetsCount',
      )
      .addSelect(
        'SUM(CASE WHEN asset.type = :imageType AND asset.status = :succeededStatus THEN 1 ELSE 0 END)::int',
        'imageSucceededCount',
      )
      .addSelect(
        'SUM(CASE WHEN asset.type = :videoType AND asset.status = :succeededStatus THEN 1 ELSE 0 END)::int',
        'videoSucceededCount',
      )
      .where('asset.ideaId IN (:...ideaIds)', { ideaIds })
      .setParameters({
        imageType: AssetType.IMAGE,
        videoType: AssetType.VIDEO,
        succeededStatus: GenerationStatus.SUCCEEDED,
      })
      .groupBy('asset.ideaId')
      .getRawMany<{
        ideaId: string;
        imageAssetsCount: string;
        videoAssetsCount: string;
        imageSucceededCount: string;
        videoSucceededCount: string;
      }>();

    return new Map(
      rows.map((row) => [
        row.ideaId,
        {
          imageAssetsCount: Number(row.imageAssetsCount) || 0,
          videoAssetsCount: Number(row.videoAssetsCount) || 0,
          imageSucceededCount: Number(row.imageSucceededCount) || 0,
          videoSucceededCount: Number(row.videoSucceededCount) || 0,
        },
      ]),
    );
  }
}
