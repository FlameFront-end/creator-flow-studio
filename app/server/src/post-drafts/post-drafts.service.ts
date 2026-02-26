import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PolicyRule,
  PolicyRuleSeverity,
  PolicyRuleType,
} from '../policy-rules/entities/policy-rule.entity';
import { Asset } from '../ideas/entities/asset.entity';
import { Caption } from '../ideas/entities/caption.entity';
import { GenerationStatus } from '../ideas/entities/generation-status.enum';
import { Idea } from '../ideas/entities/idea.entity';
import { ApprovePostDraftDto } from './dto/approve-post-draft.dto';
import { CreatePostDraftFromIdeaDto } from './dto/create-post-draft-from-idea.dto';
import {
  ModerationCheck,
  ModerationCheckStatus,
  ModerationChecksPayload,
} from './entities/moderation-check.entity';
import { PostDraft, PostDraftStatus } from './entities/post-draft.entity';
import {
  PostDraftExportPayload,
  PostDraftsDataService,
} from './post-drafts-data.service';
import { PostDraftsModerationService } from './post-drafts-moderation.service';

@Injectable()
export class PostDraftsService {
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
    private readonly postDraftsModerationService: PostDraftsModerationService,
    private readonly postDraftsDataService: PostDraftsDataService,
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

    const selectedAssetIds = this.postDraftsDataService.resolveSelectedAssetIds(
      dto.assetIds,
      succeededAssets,
    );
    const selectedCaptionId =
      this.postDraftsDataService.resolveSelectedCaptionId(
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

    return this.postDraftsDataService.buildDraftExportPayload(draft);
  }

  async findLatestByIdea(
    ideaId: string,
  ): Promise<PostDraftExportPayload | null> {
    await this.ensureIdeaExists(ideaId);
    const draft = await this.postDraftsRepository.findOne({
      where: { ideaId },
      order: { createdAt: 'DESC' },
    });
    if (!draft) {
      return null;
    }
    return this.postDraftsDataService.buildDraftExportPayload(draft);
  }

  async moderate(postDraftId: string): Promise<PostDraftExportPayload> {
    const draft = await this.findDraftByIdOrThrow(postDraftId);
    if (draft.status === PostDraftStatus.ARCHIVED) {
      throw new ConflictException('Archived draft cannot be moderated');
    }

    const [idea, caption, selectedAssets, hardDontRules] = await Promise.all([
      this.ideasRepository.findOne({ where: { id: draft.ideaId } }),
      this.postDraftsDataService.findCaptionForDraft(draft),
      this.postDraftsDataService.findAssetsForDraft(draft),
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

    const checks: ModerationChecksPayload =
      this.postDraftsModerationService.buildChecks({
        idea,
        caption,
        selectedAssets,
        hardDontRules,
      });

    const passed = this.postDraftsModerationService.isPassed(checks);
    const failedChecks =
      this.postDraftsModerationService.getFailedCheckNames(checks);

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

    return this.postDraftsDataService.buildDraftExportPayload(draft);
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
      return this.postDraftsDataService.buildDraftExportPayload(draft);
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

    return this.postDraftsDataService.buildDraftExportPayload(draft);
  }

  async markPublished(postDraftId: string): Promise<PostDraftExportPayload> {
    const draft = await this.findDraftByIdOrThrow(postDraftId);
    if (draft.status === PostDraftStatus.ARCHIVED) {
      throw new ConflictException('Archived draft cannot be published');
    }
    if (draft.status === PostDraftStatus.PUBLISHED) {
      return this.postDraftsDataService.buildDraftExportPayload(draft);
    }
    if (draft.status !== PostDraftStatus.APPROVED) {
      throw new ConflictException(
        'Draft must be approved before marking as published',
      );
    }

    draft.status = PostDraftStatus.PUBLISHED;
    await this.postDraftsRepository.save(draft);
    return this.postDraftsDataService.buildDraftExportPayload(draft);
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
      return this.postDraftsDataService.buildDraftExportPayload(draft);
    }

    draft.status = PostDraftStatus.DRAFT;
    await this.postDraftsRepository.save(draft);
    return this.postDraftsDataService.buildDraftExportPayload(draft);
  }

  async export(postDraftId: string): Promise<PostDraftExportPayload> {
    const draft = await this.findDraftByIdOrThrow(postDraftId);
    return this.postDraftsDataService.buildDraftExportPayload(draft);
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
}
