import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
import { PromptService } from '../prompt/prompt.service';
import { PromptTemplateKey } from '../prompt-templates/entities/prompt-template.entity';

@Injectable()
export class IdeasService {
  constructor(
    private readonly aiQueueService: AiQueueService,
    private readonly promptService: PromptService,
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
      const response = await this.llmProvider.generateJson<{ prompt?: unknown }>({
        prompt: `${promptPreview.prompt}

Return JSON with shape:
{
  "prompt":"detailed image prompt"
}`,
        maxTokens: 900,
        temperature: 0.7,
      });

      const prompt = this.normalizeImagePrompt(response.data);
      await this.ideasRepository.update(idea.id, { imagePrompt: prompt });
      await this.logsRepository.save(
        this.logsRepository.create({
          provider: this.llmProvider.name,
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
      await this.logsRepository.save(
        this.logsRepository.create({
          provider: this.llmProvider.name,
          model:
            process.env.LLM_MODEL ??
            process.env.OPENROUTER_MODEL ??
            process.env.OPENAI_MODEL ??
            'unknown-model',
          operation: AiOperation.IMAGE_PROMPT,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          error: this.toErrorMessage(error),
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
        sourcePrompt: idea.imagePrompt,
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

    const latestImagesByIdea = new Map<string, Asset>();
    for (const asset of assets) {
      if (asset.type !== AssetType.IMAGE) {
        continue;
      }
      if (!latestImagesByIdea.has(asset.ideaId)) {
        latestImagesByIdea.set(asset.ideaId, asset);
      }
    }

    return ideas.map((idea) => ({
      ...idea,
      latestScript: latestScriptsByIdea.get(idea.id) ?? null,
      latestCaption: latestCaptionsByIdea.get(idea.id) ?? null,
      latestImage: latestImagesByIdea.get(idea.id) ?? null,
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

    const result = await this.ideasRepository.delete({ projectId: query.projectId });
    return { deleted: result.affected ?? 0 };
  }

  async clearLogs(query: ListAiRunLogsQueryDto) {
    if (!query.projectId) {
      return { deleted: 0 };
    }

    const result = await this.logsRepository.delete({ projectId: query.projectId });
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
      return error.message.slice(0, 500);
    }
    return 'Unknown image prompt generation error';
  }
}
