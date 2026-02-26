import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Asset, AssetType } from '../ideas/entities/asset.entity';
import { Caption } from '../ideas/entities/caption.entity';
import { Idea } from '../ideas/entities/idea.entity';
import {
  ModerationCheck,
  ModerationChecksPayload,
  ModerationCheckStatus,
} from './entities/moderation-check.entity';
import { PostDraft, PostDraftStatus } from './entities/post-draft.entity';

export type PostDraftExportPayload = {
  id: string;
  ideaId: string;
  captionId: string | null;
  selectedAssets: string[];
  status: PostDraftStatus;
  scheduledAt: Date | null;
  createdAt: Date;
  idea: {
    id: string;
    projectId: string;
    personaId: string;
    topic: string;
    hook: string;
    format: string;
  };
  assets: Array<{
    id: string;
    type: string;
    url: string | null;
    mime: string | null;
    width: number | null;
    height: number | null;
    duration: number | null;
    sourcePrompt: string | null;
    provider: string | null;
    status: string;
    error: string | null;
    createdAt: Date;
  }>;
  caption: {
    id: string;
    text: string | null;
    hashtags: string[] | null;
    status: string;
    error: string | null;
    createdAt: Date;
  } | null;
  latestModeration: {
    id: string;
    status: ModerationCheckStatus;
    checks: ModerationChecksPayload;
    notes: string | null;
    createdAt: Date;
  } | null;
};

@Injectable()
export class PostDraftsDataService {
  constructor(
    @InjectRepository(Idea)
    private readonly ideasRepository: Repository<Idea>,
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
    @InjectRepository(Caption)
    private readonly captionsRepository: Repository<Caption>,
    @InjectRepository(ModerationCheck)
    private readonly moderationChecksRepository: Repository<ModerationCheck>,
  ) {}

  async buildDraftExportPayload(
    draft: PostDraft,
  ): Promise<PostDraftExportPayload> {
    const selectedAssetIds = this.normalizeSelectedAssets(draft.selectedAssets);

    const [idea, caption, latestModeration, selectedAssets] = await Promise.all(
      [
        this.ideasRepository.findOne({ where: { id: draft.ideaId } }),
        this.findCaptionForDraft(draft),
        this.findLatestCheckByDraftId(draft.id),
        this.findAssetsByIds(draft.ideaId, selectedAssetIds),
      ],
    );

    if (!idea) {
      throw new NotFoundException('Idea not found for post draft');
    }

    return {
      id: draft.id,
      ideaId: draft.ideaId,
      captionId: draft.captionId,
      selectedAssets: selectedAssetIds,
      status: draft.status,
      scheduledAt: draft.scheduledAt,
      createdAt: draft.createdAt,
      idea: {
        id: idea.id,
        projectId: idea.projectId,
        personaId: idea.personaId,
        topic: idea.topic,
        hook: idea.hook,
        format: idea.format,
      },
      assets: selectedAssets.map((asset) => ({
        id: asset.id,
        type: asset.type,
        url: asset.url,
        mime: asset.mime,
        width: asset.width,
        height: asset.height,
        duration: asset.duration,
        sourcePrompt: asset.sourcePrompt,
        provider: asset.provider,
        status: asset.status,
        error: asset.error,
        createdAt: asset.createdAt,
      })),
      caption: caption
        ? {
            id: caption.id,
            text: caption.text,
            hashtags: caption.hashtags,
            status: caption.status,
            error: caption.error,
            createdAt: caption.createdAt,
          }
        : null,
      latestModeration: latestModeration
        ? {
            id: latestModeration.id,
            status: latestModeration.status,
            checks: latestModeration.checks,
            notes: latestModeration.notes,
            createdAt: latestModeration.createdAt,
          }
        : null,
    };
  }

  async findCaptionForDraft(draft: PostDraft): Promise<Caption | null> {
    if (!draft.captionId) {
      return null;
    }
    return this.captionsRepository.findOne({
      where: { id: draft.captionId, ideaId: draft.ideaId },
    });
  }

  async findAssetsForDraft(draft: PostDraft): Promise<Asset[]> {
    return this.findAssetsByIds(
      draft.ideaId,
      this.normalizeSelectedAssets(draft.selectedAssets),
    );
  }

  resolveSelectedAssetIds(
    requestedAssetIds: string[] | undefined,
    availableAssets: Asset[],
  ): string[] {
    const availableAssetsMap = new Map(
      availableAssets.map((asset) => [asset.id, asset]),
    );

    if (requestedAssetIds?.length) {
      const uniqueRequested = this.normalizeSelectedAssets(requestedAssetIds);
      const invalidAssetIds = uniqueRequested.filter(
        (assetId) => !availableAssetsMap.has(assetId),
      );
      if (invalidAssetIds.length) {
        throw new BadRequestException(
          'Some selected assets are not available for this idea',
        );
      }
      return uniqueRequested;
    }

    const selected: string[] = [];
    const latestVideo = availableAssets.find(
      (asset) => asset.type === AssetType.VIDEO,
    );
    const latestImage = availableAssets.find(
      (asset) => asset.type === AssetType.IMAGE,
    );

    if (latestVideo) {
      selected.push(latestVideo.id);
    }
    if (latestImage && !selected.includes(latestImage.id)) {
      selected.push(latestImage.id);
    }
    if (!selected.length && availableAssets[0]) {
      selected.push(availableAssets[0].id);
    }

    return selected;
  }

  resolveSelectedCaptionId(
    requestedCaptionId: string | undefined,
    availableCaptions: Caption[],
  ): string | null {
    if (requestedCaptionId) {
      const isAvailable = availableCaptions.some(
        (caption) => caption.id === requestedCaptionId,
      );
      if (!isAvailable) {
        throw new BadRequestException(
          'Selected caption is not available for this idea',
        );
      }
      return requestedCaptionId;
    }
    return availableCaptions[0]?.id ?? null;
  }

  private async findLatestCheckByDraftId(
    postDraftId: string,
  ): Promise<ModerationCheck | null> {
    return this.moderationChecksRepository.findOne({
      where: { postDraftId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findAssetsByIds(
    ideaId: string,
    assetIds: string[],
  ): Promise<Asset[]> {
    if (!assetIds.length) {
      return [];
    }

    const assets = await this.assetsRepository.find({
      where: {
        id: In(assetIds),
        ideaId,
      },
    });
    const assetById = new Map(assets.map((asset) => [asset.id, asset]));
    return assetIds
      .map((id) => assetById.get(id))
      .filter((asset): asset is Asset => Boolean(asset));
  }

  private normalizeSelectedAssets(value: unknown): string[] {
    if (!Array.isArray(value)) {
      return [];
    }
    const normalized = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }
}
