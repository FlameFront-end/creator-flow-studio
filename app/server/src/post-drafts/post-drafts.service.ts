import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PolicyRule, PolicyRuleSeverity, PolicyRuleType } from '../policy-rules/entities/policy-rule.entity';
import { Asset, AssetType } from '../ideas/entities/asset.entity';
import { Caption } from '../ideas/entities/caption.entity';
import { GenerationStatus } from '../ideas/entities/generation-status.enum';
import { Idea } from '../ideas/entities/idea.entity';
import { ApprovePostDraftDto } from './dto/approve-post-draft.dto';
import { CreatePostDraftFromIdeaDto } from './dto/create-post-draft-from-idea.dto';
import {
  ModerationCheck,
  ModerationCheckItem,
  ModerationChecksPayload,
  ModerationCheckStatus,
} from './entities/moderation-check.entity';
import { PostDraft, PostDraftStatus } from './entities/post-draft.entity';

type PostDraftExportPayload = {
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
export class PostDraftsService {
  private static readonly NSFW_KEYWORDS = [
    'porn',
    'sex',
    'nude',
    'naked',
    'эрот',
    'обнажен',
    '18+',
  ];

  private static readonly TOXICITY_KEYWORDS = [
    'kill',
    'hate',
    'idiot',
    'stupid',
    'ненавиж',
    'убей',
    'тупой',
  ];

  private static readonly FORBIDDEN_TOPIC_KEYWORDS = [
    'drugs',
    'weapon',
    'terror',
    'violence',
    'наркот',
    'оруж',
    'террор',
    'насилие',
  ];

  constructor(
    @InjectRepository(Idea)
    private readonly ideasRepository: Repository<Idea>,
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
    @InjectRepository(Caption)
    private readonly captionsRepository: Repository<Caption>,
    @InjectRepository(PostDraft)
    private readonly postDraftsRepository: Repository<PostDraft>,
    @InjectRepository(ModerationCheck)
    private readonly moderationChecksRepository: Repository<ModerationCheck>,
    @InjectRepository(PolicyRule)
    private readonly policyRulesRepository: Repository<PolicyRule>,
  ) {}

  async createFromIdea(
    ideaId: string,
    dto: CreatePostDraftFromIdeaDto,
  ): Promise<PostDraftExportPayload> {
    await this.ensureIdeaExists(ideaId);

    const [succeededAssets, succeededCaptions] = await Promise.all([
      this.assetsRepository.find({
        where: { ideaId, status: GenerationStatus.SUCCEEDED },
        order: { createdAt: 'DESC' },
      }),
      this.captionsRepository.find({
        where: { ideaId, status: GenerationStatus.SUCCEEDED },
        order: { createdAt: 'DESC' },
      }),
    ]);

    const selectedAssetIds = this.resolveSelectedAssetIds(
      dto.assetIds,
      succeededAssets,
    );
    const selectedCaptionId = this.resolveSelectedCaptionId(
      dto.captionId,
      succeededCaptions,
    );

    const draft = await this.postDraftsRepository.save(
      this.postDraftsRepository.create({
        ideaId,
        captionId: selectedCaptionId,
        selectedAssets: selectedAssetIds,
        status: PostDraftStatus.DRAFT,
        scheduledAt: dto.scheduledAt ?? null,
      }),
    );

    return this.buildDraftExportPayload(draft);
  }

  async findLatestByIdea(ideaId: string): Promise<PostDraftExportPayload | null> {
    await this.ensureIdeaExists(ideaId);
    const draft = await this.postDraftsRepository.findOne({
      where: { ideaId },
      order: { createdAt: 'DESC' },
    });
    if (!draft) {
      return null;
    }
    return this.buildDraftExportPayload(draft);
  }

  async moderate(postDraftId: string): Promise<PostDraftExportPayload> {
    const draft = await this.findDraftByIdOrThrow(postDraftId);
    if (draft.status === PostDraftStatus.ARCHIVED) {
      throw new ConflictException('Archived draft cannot be moderated');
    }

    const [idea, caption, selectedAssets, hardDontRules] = await Promise.all([
      this.ideasRepository.findOne({ where: { id: draft.ideaId } }),
      this.findCaptionForDraft(draft),
      this.findAssetsForDraft(draft),
      this.policyRulesRepository.find({
        where: {
          type: PolicyRuleType.DONT,
          severity: PolicyRuleSeverity.HARD,
        },
      }),
    ]);

    if (!idea) {
      throw new NotFoundException('Idea not found for post draft');
    }

    const textCorpus = this.buildModerationCorpus(idea, caption, selectedAssets);
    const checks: ModerationChecksPayload = {
      nsfw: this.evaluateKeywords(textCorpus, PostDraftsService.NSFW_KEYWORDS),
      toxicity: this.evaluateKeywords(
        textCorpus,
        PostDraftsService.TOXICITY_KEYWORDS,
      ),
      forbiddenTopics: this.evaluateKeywords(
        textCorpus,
        PostDraftsService.FORBIDDEN_TOPIC_KEYWORDS,
      ),
      policy: this.evaluatePolicyRules(textCorpus, hardDontRules),
    };

    const passed = Object.values(checks).every((item) => item.passed);
    const failedChecks = Object.entries(checks)
      .filter(([, item]) => !item.passed)
      .map(([name]) => name);

    await this.moderationChecksRepository.save(
      this.moderationChecksRepository.create({
        postDraftId,
        checks,
        status: passed
          ? ModerationCheckStatus.PASSED
          : ModerationCheckStatus.FAILED,
        notes: passed
          ? 'All moderation checks passed'
          : `Failed checks: ${failedChecks.join(', ')}`,
      }),
    );

    return this.buildDraftExportPayload(draft);
  }

  async approve(
    postDraftId: string,
    dto: ApprovePostDraftDto,
  ): Promise<PostDraftExportPayload> {
    const draft = await this.findDraftByIdOrThrow(postDraftId);
    if (draft.status === PostDraftStatus.ARCHIVED) {
      throw new ConflictException('Archived draft cannot be approved');
    }
    if (draft.status === PostDraftStatus.PUBLISHED) {
      throw new ConflictException('Published draft cannot be approved again');
    }
    if (draft.status === PostDraftStatus.APPROVED) {
      return this.buildDraftExportPayload(draft);
    }

    const latestCheck = await this.findLatestCheckByDraftId(postDraftId);
    if (!latestCheck) {
      throw new ConflictException('Run checks before approving draft');
    }

    const overrideReason = dto.overrideReason?.trim();
    if (
      latestCheck.status !== ModerationCheckStatus.PASSED &&
      !overrideReason
    ) {
      throw new ConflictException(
        'Moderation checks did not pass. Provide overrideReason to approve.',
      );
    }

    if (overrideReason) {
      const previousNotes = latestCheck.notes?.trim();
      const overrideNote = `Override reason: ${overrideReason}`;
      latestCheck.notes = previousNotes
        ? `${previousNotes}\n${overrideNote}`
        : overrideNote;
      await this.moderationChecksRepository.save(latestCheck);
    }

    draft.status = PostDraftStatus.APPROVED;
    await this.postDraftsRepository.save(draft);

    return this.buildDraftExportPayload(draft);
  }

  async markPublished(postDraftId: string): Promise<PostDraftExportPayload> {
    const draft = await this.findDraftByIdOrThrow(postDraftId);
    if (draft.status === PostDraftStatus.ARCHIVED) {
      throw new ConflictException('Archived draft cannot be published');
    }
    if (draft.status === PostDraftStatus.PUBLISHED) {
      return this.buildDraftExportPayload(draft);
    }
    if (draft.status !== PostDraftStatus.APPROVED) {
      throw new ConflictException(
        'Draft must be approved before marking as published',
      );
    }

    draft.status = PostDraftStatus.PUBLISHED;
    await this.postDraftsRepository.save(draft);
    return this.buildDraftExportPayload(draft);
  }

  async unapprove(postDraftId: string): Promise<PostDraftExportPayload> {
    const draft = await this.findDraftByIdOrThrow(postDraftId);
    if (draft.status === PostDraftStatus.ARCHIVED) {
      throw new ConflictException('Archived draft cannot be unapproved');
    }
    if (draft.status === PostDraftStatus.PUBLISHED) {
      throw new ConflictException('Published draft cannot be unapproved');
    }
    if (draft.status === PostDraftStatus.DRAFT) {
      return this.buildDraftExportPayload(draft);
    }

    draft.status = PostDraftStatus.DRAFT;
    await this.postDraftsRepository.save(draft);
    return this.buildDraftExportPayload(draft);
  }

  async export(postDraftId: string): Promise<PostDraftExportPayload> {
    const draft = await this.findDraftByIdOrThrow(postDraftId);
    return this.buildDraftExportPayload(draft);
  }

  private async buildDraftExportPayload(
    draft: PostDraft,
  ): Promise<PostDraftExportPayload> {
    const selectedAssetIds = this.normalizeSelectedAssets(draft.selectedAssets);

    const [idea, caption, latestModeration, selectedAssets] = await Promise.all([
      this.ideasRepository.findOne({ where: { id: draft.ideaId } }),
      this.findCaptionForDraft(draft),
      this.findLatestCheckByDraftId(draft.id),
      this.findAssetsByIds(draft.ideaId, selectedAssetIds),
    ]);

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

  private async ensureIdeaExists(ideaId: string): Promise<void> {
    const exists = await this.ideasRepository.existsBy({ id: ideaId });
    if (!exists) {
      throw new NotFoundException('Idea not found');
    }
  }

  private async findDraftByIdOrThrow(postDraftId: string): Promise<PostDraft> {
    const draft = await this.postDraftsRepository.findOne({
      where: { id: postDraftId },
    });
    if (!draft) {
      throw new NotFoundException('Post draft not found');
    }
    return draft;
  }

  private async findLatestCheckByDraftId(
    postDraftId: string,
  ): Promise<ModerationCheck | null> {
    return this.moderationChecksRepository.findOne({
      where: { postDraftId },
      order: { createdAt: 'DESC' },
    });
  }

  private async findCaptionForDraft(draft: PostDraft): Promise<Caption | null> {
    if (!draft.captionId) {
      return null;
    }
    return this.captionsRepository.findOne({
      where: { id: draft.captionId, ideaId: draft.ideaId },
    });
  }

  private async findAssetsForDraft(draft: PostDraft): Promise<Asset[]> {
    return this.findAssetsByIds(
      draft.ideaId,
      this.normalizeSelectedAssets(draft.selectedAssets),
    );
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

  private resolveSelectedAssetIds(
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

  private resolveSelectedCaptionId(
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

  private buildModerationCorpus(
    idea: Idea,
    caption: Caption | null,
    selectedAssets: Asset[],
  ): string {
    const parts = [
      idea.topic,
      idea.hook,
      caption?.text ?? '',
      ...(caption?.hashtags ?? []),
      ...selectedAssets.map((asset) => asset.sourcePrompt ?? ''),
    ];
    return parts.join('\n').toLowerCase();
  }

  private evaluateKeywords(
    corpus: string,
    keywords: string[],
  ): ModerationCheckItem {
    const hits = Array.from(
      new Set(
        keywords
          .map((keyword) => keyword.toLowerCase())
          .filter((keyword) => corpus.includes(keyword)),
      ),
    );

    return {
      passed: hits.length === 0,
      score: hits.length / Math.max(keywords.length, 1),
      hits,
    };
  }

  private evaluatePolicyRules(
    corpus: string,
    hardDontRules: PolicyRule[],
  ): ModerationCheckItem {
    const hits = Array.from(
      new Set(
        hardDontRules
          .map((rule) => rule.text.trim())
          .filter(Boolean)
          .filter((ruleText) => corpus.includes(ruleText.toLowerCase())),
      ),
    );

    return {
      passed: hits.length === 0,
      score: hits.length / Math.max(hardDontRules.length, 1),
      hits,
    };
  }
}
