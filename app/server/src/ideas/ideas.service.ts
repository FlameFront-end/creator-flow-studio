import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { Persona } from '../personas/entities/persona.entity';
import { Project } from '../projects/entities/project.entity';
import { AiQueueService } from './ai-queue.service';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { GenerateImageDto } from './dto/generate-image.dto';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { ListAiRunLogsQueryDto } from './dto/list-ai-run-logs-query.dto';
import { ListIdeasQueryDto } from './dto/list-ideas-query.dto';
import { AiOperation, AiRunLog } from './entities/ai-run-log.entity';
import { Caption } from './entities/caption.entity';
import { Asset, AssetType } from './entities/asset.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea, IdeaFormat } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import {
  DEFAULT_IMAGE_MAX_PROMPT_CHARS,
  DEFAULT_IDEA_COUNT,
  DEFAULT_IDEA_FORMAT,
} from './ideas.constants';
import { LLM_PROVIDER_TOKEN } from './llm/llm-provider.interface';
import type { LlmProvider } from './llm/llm-provider.interface';
import { LlmResponseError } from './llm/llm-response.error';
import { PromptService } from '../prompt/prompt.service';
import { PromptTemplateKey } from '../prompt-templates/entities/prompt-template.entity';
import { buildMockImagePrompt } from './mock/ai-test-fallback';
import { LocalObjectStorageService } from '../storage/local-object-storage.service';

@Injectable()
export class IdeasService {
  private static readonly MOCK_PROVIDER_NAME = 'mock-test-fallback';
  private static readonly MOCK_MODEL_NAME = 'mock-ai';

  constructor(
    private readonly aiSettingsService: AiSettingsService,
    private readonly aiQueueService: AiQueueService,
    private readonly promptService: PromptService,
    private readonly objectStorageService: LocalObjectStorageService,
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: LlmProvider,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
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

  async enqueueIdeasGeneration(dto: GenerateIdeasDto) {
    await Promise.all([
      this.ensureProjectExists(dto.projectId),
      this.ensurePersonaExists(dto.personaId),
    ]);

    const count = dto.count ?? DEFAULT_IDEA_COUNT;
    const format = dto.format ?? (DEFAULT_IDEA_FORMAT as IdeaFormat);
    const job = await this.aiQueueService.enqueueIdeasJob({
      ...dto,
      count,
      format,
    });

    return {
      jobId: String(job.id),
      status: GenerationStatus.QUEUED,
    };
  }

  async enqueueScriptGeneration(ideaId: string, dto: GenerateScriptDto) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const hasCompleted = await this.scriptsRepository.exists({
      where: {
        ideaId,
        status: GenerationStatus.SUCCEEDED,
      },
    });
    if (hasCompleted && !dto.regenerate) {
      throw new ConflictException(
        'Script already generated. Use regenerate=true to run again.',
      );
    }

    const script = await this.scriptsRepository.save(
      this.scriptsRepository.create({
        ideaId,
        status: GenerationStatus.QUEUED,
      }),
    );
    const job = await this.aiQueueService.enqueueScriptJob({
      ideaId,
      scriptId: script.id,
    });

    return {
      jobId: String(job.id),
      scriptId: script.id,
      status: script.status,
    };
  }

  async enqueueCaptionGeneration(ideaId: string, dto: GenerateCaptionDto) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const hasCompleted = await this.captionsRepository.exists({
      where: {
        ideaId,
        status: GenerationStatus.SUCCEEDED,
      },
    });
    if (hasCompleted && !dto.regenerate) {
      throw new ConflictException(
        'Caption already generated. Use regenerate=true to run again.',
      );
    }

    const caption = await this.captionsRepository.save(
      this.captionsRepository.create({
        ideaId,
        status: GenerationStatus.QUEUED,
      }),
    );
    const job = await this.aiQueueService.enqueueCaptionJob({
      ideaId,
      captionId: caption.id,
    });

    return {
      jobId: String(job.id),
      captionId: caption.id,
      status: caption.status,
    };
  }

  async generateImagePrompt(ideaId: string) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const startedAt = Date.now();
    const runtimeConfig = await this.aiSettingsService.getRuntimeConfig();
    try {
      const promptPreview = await this.promptService.preview({
        personaId: idea.personaId,
        templateKey: PromptTemplateKey.IMAGE_PROMPT,
        variables: {
          topic: idea.topic,
          idea_topic: idea.topic,
          hook: idea.hook,
          idea_hook: idea.hook,
          format: idea.format,
        },
      });
      const response = await this.llmProvider.generateJson<{
        prompt?: unknown;
      }>({
        prompt: `${promptPreview.prompt}

STRICT OUTPUT CONTRACT:
- Return a single JSON object only.
- Do not use markdown code fences.
- Do not include explanations or extra keys.
- Required shape:
{
  "prompt":"detailed image prompt"
}`,
        maxTokens: runtimeConfig.maxTokens,
        temperature: 0.7,
        config: runtimeConfig,
        responseSchema: {
          name: 'image_prompt_output',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['prompt'],
            properties: {
              prompt: {
                type: 'string',
                minLength: 1,
              },
            },
          },
        },
      });

      const prompt = this.normalizeImagePrompt(response.data);
      await this.ideasRepository.update(idea.id, { imagePrompt: prompt });
      await this.logsRepository.save(
        this.logsRepository.create({
          provider: response.provider,
          model: response.model,
          operation: AiOperation.IMAGE_PROMPT,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.SUCCEEDED,
          latencyMs: Date.now() - startedAt,
          tokens: response.tokens,
          requestId: response.requestId,
          error: null,
        }),
      );

      return { prompt };
    } catch (error) {
      if (this.shouldUseMockFallback(error, runtimeConfig.aiTestMode)) {
        const prompt = buildMockImagePrompt();
        await this.ideasRepository.update(idea.id, { imagePrompt: prompt });
        await this.logsRepository.save(
          this.logsRepository.create({
            provider: IdeasService.MOCK_PROVIDER_NAME,
            model: IdeasService.MOCK_MODEL_NAME,
            operation: AiOperation.IMAGE_PROMPT,
            projectId: idea.projectId,
            ideaId: idea.id,
            status: GenerationStatus.SUCCEEDED,
            latencyMs: Date.now() - startedAt,
            tokens: 0,
            requestId: null,
            error: null,
          }),
        );

        return { prompt };
      }

      const details = this.extractErrorDetails(error);
      await this.logsRepository.save(
        this.logsRepository.create({
          provider: runtimeConfig.provider,
          model: runtimeConfig.model || 'unknown-model',
          operation: AiOperation.IMAGE_PROMPT,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          error: details.message,
          errorCode: details.code,
          rawResponse: details.rawResponse,
        }),
      );
      throw error;
    }
  }

  async generateVideoPrompt(ideaId: string) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }

    const startedAt = Date.now();
    const runtimeConfig = await this.aiSettingsService.getRuntimeConfig();
    try {
      const promptPreview = await this.promptService.preview({
        personaId: idea.personaId,
        templateKey: PromptTemplateKey.VIDEO_PROMPT,
        variables: {
          topic: idea.topic,
          idea_topic: idea.topic,
          hook: idea.hook,
          idea_hook: idea.hook,
          format: idea.format,
        },
      });
      const response = await this.llmProvider.generateJson<{
        prompt?: unknown;
      }>({
        prompt: `${promptPreview.prompt}

STRICT OUTPUT CONTRACT:
- Return a single JSON object only.
- Do not use markdown code fences.
- Do not include explanations or extra keys.
- Required shape:
{
  "prompt":"detailed video prompt"
}`,
        maxTokens: runtimeConfig.maxTokens,
        temperature: 0.7,
        config: runtimeConfig,
        responseSchema: {
          name: 'video_prompt_output',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['prompt'],
            properties: {
              prompt: {
                type: 'string',
                minLength: 1,
              },
            },
          },
        },
      });

      const prompt = this.normalizeImagePrompt(response.data);
      await this.ideasRepository.update(idea.id, { videoPrompt: prompt });
      await this.logsRepository.save(
        this.logsRepository.create({
          provider: response.provider,
          model: response.model,
          operation: AiOperation.VIDEO_PROMPT,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.SUCCEEDED,
          latencyMs: Date.now() - startedAt,
          tokens: response.tokens,
          requestId: response.requestId,
          error: null,
        }),
      );

      return { prompt };
    } catch (error) {
      if (this.shouldUseMockFallback(error, runtimeConfig.aiTestMode)) {
        const prompt = buildMockImagePrompt();
        await this.ideasRepository.update(idea.id, { videoPrompt: prompt });
        await this.logsRepository.save(
          this.logsRepository.create({
            provider: IdeasService.MOCK_PROVIDER_NAME,
            model: IdeasService.MOCK_MODEL_NAME,
            operation: AiOperation.VIDEO_PROMPT,
            projectId: idea.projectId,
            ideaId: idea.id,
            status: GenerationStatus.SUCCEEDED,
            latencyMs: Date.now() - startedAt,
            tokens: 0,
            requestId: null,
            error: null,
          }),
        );

        return { prompt };
      }

      const details = this.extractErrorDetails(error);
      await this.logsRepository.save(
        this.logsRepository.create({
          provider: runtimeConfig.provider,
          model: runtimeConfig.model || 'unknown-model',
          operation: AiOperation.VIDEO_PROMPT,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          error: details.message,
          errorCode: details.code,
          rawResponse: details.rawResponse,
        }),
      );
      throw error;
    }
  }

  async enqueueImageGeneration(ideaId: string, dto: GenerateImageDto) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }
    if (!idea.imagePrompt?.trim()) {
      throw new ConflictException(
        'Image prompt is empty. Generate image prompt first.',
      );
    }

    const hasCompleted = await this.assetsRepository.exists({
      where: {
        ideaId,
        type: AssetType.IMAGE,
        status: GenerationStatus.SUCCEEDED,
      },
    });
    if (hasCompleted && !dto.regenerate) {
      throw new ConflictException(
        'Image already generated. Use regenerate=true to run again.',
      );
    }

    const asset = await this.assetsRepository.save(
      this.assetsRepository.create({
        ideaId,
        type: AssetType.IMAGE,
        sourcePrompt: idea.imagePrompt,
        status: GenerationStatus.QUEUED,
      }),
    );

    const job = await this.aiQueueService.enqueueImageJob({
      ideaId,
      assetId: asset.id,
    });

    return {
      jobId: String(job.id),
      assetId: asset.id,
      status: asset.status,
    };
  }

  async enqueueVideoGeneration(ideaId: string, dto: GenerateImageDto) {
    const idea = await this.ideasRepository.findOne({ where: { id: ideaId } });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }
    if (!idea.videoPrompt?.trim()) {
      throw new ConflictException(
        'Video prompt is empty. Generate video prompt first.',
      );
    }

    const hasCompleted = await this.assetsRepository.exists({
      where: {
        ideaId,
        type: AssetType.VIDEO,
        status: GenerationStatus.SUCCEEDED,
      },
    });
    if (hasCompleted && !dto.regenerate) {
      throw new ConflictException(
        'Video already generated. Use regenerate=true to run again.',
      );
    }

    const asset = await this.assetsRepository.save(
      this.assetsRepository.create({
        ideaId,
        type: AssetType.VIDEO,
        sourcePrompt: idea.videoPrompt,
        status: GenerationStatus.QUEUED,
      }),
    );

    const job = await this.aiQueueService.enqueueVideoJob({
      ideaId,
      assetId: asset.id,
    });

    return {
      jobId: String(job.id),
      assetId: asset.id,
      status: asset.status,
    };
  }

  async findAll(query: ListIdeasQueryDto) {
    const where = query.projectId ? { projectId: query.projectId } : {};
    const ideas = await this.ideasRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (!ideas.length) {
      return [];
    }

    const ideaIds = ideas.map((idea) => idea.id);
    const [scripts, captions, assets] = await Promise.all([
      this.scriptsRepository.find({
        where: ideaIds.map((id) => ({ ideaId: id })),
        order: { createdAt: 'DESC' },
      }),
      this.captionsRepository.find({
        where: ideaIds.map((id) => ({ ideaId: id })),
        order: { createdAt: 'DESC' },
      }),
      this.assetsRepository.find({
        where: ideaIds.map((id) => ({ ideaId: id })),
        order: { createdAt: 'DESC' },
      }),
    ]);

    const latestScriptsByIdea = new Map<string, Script>();
    for (const script of scripts) {
      if (!latestScriptsByIdea.has(script.ideaId)) {
        latestScriptsByIdea.set(script.ideaId, script);
      }
    }

    const latestCaptionsByIdea = new Map<string, Caption>();
    for (const caption of captions) {
      if (!latestCaptionsByIdea.has(caption.ideaId)) {
        latestCaptionsByIdea.set(caption.ideaId, caption);
      }
    }
    const scriptSucceededCountByIdea = new Map<string, number>();
    for (const script of scripts) {
      if (script.status === GenerationStatus.SUCCEEDED) {
        scriptSucceededCountByIdea.set(
          script.ideaId,
          (scriptSucceededCountByIdea.get(script.ideaId) ?? 0) + 1,
        );
      }
    }
    const captionSucceededCountByIdea = new Map<string, number>();
    for (const caption of captions) {
      if (caption.status === GenerationStatus.SUCCEEDED) {
        captionSucceededCountByIdea.set(
          caption.ideaId,
          (captionSucceededCountByIdea.get(caption.ideaId) ?? 0) + 1,
        );
      }
    }

    const currentImagesByIdea = new Map<string, Asset>();
    const currentVideosByIdea = new Map<string, Asset>();
    const latestImageStatusByIdea = new Map<string, GenerationStatus>();
    const latestVideoStatusByIdea = new Map<string, GenerationStatus>();
    const imageAssetsCountByIdea = new Map<string, number>();
    const videoAssetsCountByIdea = new Map<string, number>();
    const imageSucceededCountByIdea = new Map<string, number>();
    const videoSucceededCountByIdea = new Map<string, number>();
    for (const asset of assets) {
      if (asset.type === AssetType.IMAGE) {
        if (!latestImageStatusByIdea.has(asset.ideaId)) {
          latestImageStatusByIdea.set(asset.ideaId, asset.status);
        }
        imageAssetsCountByIdea.set(
          asset.ideaId,
          (imageAssetsCountByIdea.get(asset.ideaId) ?? 0) + 1,
        );
        if (asset.status === GenerationStatus.SUCCEEDED) {
          imageSucceededCountByIdea.set(
            asset.ideaId,
            (imageSucceededCountByIdea.get(asset.ideaId) ?? 0) + 1,
          );
          if (!currentImagesByIdea.has(asset.ideaId)) {
            currentImagesByIdea.set(asset.ideaId, asset);
          }
        }
        continue;
      }
      if (asset.type === AssetType.VIDEO) {
        if (!latestVideoStatusByIdea.has(asset.ideaId)) {
          latestVideoStatusByIdea.set(asset.ideaId, asset.status);
        }
        videoAssetsCountByIdea.set(
          asset.ideaId,
          (videoAssetsCountByIdea.get(asset.ideaId) ?? 0) + 1,
        );
        if (asset.status === GenerationStatus.SUCCEEDED) {
          videoSucceededCountByIdea.set(
            asset.ideaId,
            (videoSucceededCountByIdea.get(asset.ideaId) ?? 0) + 1,
          );
          if (!currentVideosByIdea.has(asset.ideaId)) {
            currentVideosByIdea.set(asset.ideaId, asset);
          }
        }
      }
    }

    return ideas.map((idea) => ({
      ...idea,
      latestScript: latestScriptsByIdea.get(idea.id) ?? null,
      latestCaption: latestCaptionsByIdea.get(idea.id) ?? null,
      latestImage: currentImagesByIdea.get(idea.id) ?? null,
      latestVideo: currentVideosByIdea.get(idea.id) ?? null,
      latestImageStatus: latestImageStatusByIdea.get(idea.id) ?? null,
      latestVideoStatus: latestVideoStatusByIdea.get(idea.id) ?? null,
      scriptSucceededCount: scriptSucceededCountByIdea.get(idea.id) ?? 0,
      captionSucceededCount: captionSucceededCountByIdea.get(idea.id) ?? 0,
      imageAssetsCount: imageAssetsCountByIdea.get(idea.id) ?? 0,
      videoAssetsCount: videoAssetsCountByIdea.get(idea.id) ?? 0,
      imageSucceededCount: imageSucceededCountByIdea.get(idea.id) ?? 0,
      videoSucceededCount: videoSucceededCountByIdea.get(idea.id) ?? 0,
    }));
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

  async clearIdeas(query: ListIdeasQueryDto) {
    if (!query.projectId) {
      return { deleted: 0 };
    }

    const result = await this.ideasRepository.delete({
      projectId: query.projectId,
    });
    return { deleted: result.affected ?? 0 };
  }

  async clearLogs(query: ListAiRunLogsQueryDto) {
    if (!query.projectId) {
      return { deleted: 0 };
    }

    const result = await this.logsRepository.delete({
      projectId: query.projectId,
    });
    return { deleted: result.affected ?? 0 };
  }

  async removeIdea(ideaId: string) {
    const result = await this.ideasRepository.delete({ id: ideaId });
    if (!result.affected) {
      throw new NotFoundException('Idea not found');
    }
    return { deleted: 1 };
  }

  async removeLog(logId: string) {
    const result = await this.logsRepository.delete({ id: logId });
    if (!result.affected) {
      throw new NotFoundException('Log not found');
    }
    return { deleted: 1 };
  }

  async removeAsset(assetId: string) {
    const asset = await this.assetsRepository.findOne({
      where: { id: assetId },
    });
    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.url) {
      await this.objectStorageService.removeByPublicUrl(asset.url);
    }

    const result = await this.assetsRepository.delete({ id: assetId });
    if (!result.affected) {
      throw new NotFoundException('Asset not found');
    }

    return { deleted: 1 };
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const exists = await this.projectsRepository.existsBy({ id: projectId });
    if (!exists) {
      throw new NotFoundException('Project not found');
    }
  }

  private async ensurePersonaExists(personaId: string): Promise<void> {
    const exists = await this.personasRepository.existsBy({ id: personaId });
    if (!exists) {
      throw new NotFoundException('Persona not found');
    }
  }

  private normalizeImagePrompt(data: { prompt?: unknown }): string {
    if (typeof data.prompt !== 'string' || !data.prompt.trim()) {
      throw new Error('LLM returned empty image prompt');
    }
    return data.prompt.trim().slice(0, DEFAULT_IMAGE_MAX_PROMPT_CHARS);
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Unknown prompt generation error';
  }

  private shouldUseMockFallback(error: unknown, aiTestMode: boolean): boolean {
    if (!aiTestMode) {
      return false;
    }
    return this.toErrorMessage(error)
      .toLowerCase()
      .includes('is not configured for ai generation');
  }

  private extractErrorDetails(error: unknown): {
    message: string;
    code: string | null;
    rawResponse: string | null;
  } {
    if (error instanceof LlmResponseError) {
      return {
        message: error.message,
        code: error.code,
        rawResponse: error.rawResponse,
      };
    }
    return {
      message: this.toErrorMessage(error),
      code: null,
      rawResponse: null,
    };
  }
}
