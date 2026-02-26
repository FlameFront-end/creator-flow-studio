import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Persona } from '../personas/entities/persona.entity';
import { Project } from '../projects/entities/project.entity';
import { AiQueueService } from './ai-queue.service';
import { GenerateCaptionDto } from './dto/generate-caption.dto';
import { GenerateImageDto } from './dto/generate-image.dto';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { ListAiRunLogsQueryDto } from './dto/list-ai-run-logs-query.dto';
import { ListIdeasQueryDto } from './dto/list-ideas-query.dto';
import { AiRunLog } from './entities/ai-run-log.entity';
import { Caption } from './entities/caption.entity';
import { Asset, AssetType } from './entities/asset.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea, IdeaFormat } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import { DEFAULT_IDEA_COUNT, DEFAULT_IDEA_FORMAT } from './ideas.constants';
import { LocalObjectStorageService } from '../storage/local-object-storage.service';
import { IdeasPromptGenerationService } from './ideas-prompt-generation.service';
import { IdeasReadService } from './ideas-read.service';

@Injectable()
export class IdeasService {
  private readonly logger = new Logger(IdeasService.name);

  constructor(
    private readonly aiQueueService: AiQueueService,
    private readonly ideasReadService: IdeasReadService,
    private readonly ideasPromptGenerationService: IdeasPromptGenerationService,
    private readonly objectStorageService: LocalObjectStorageService,
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
      this.ensurePersonaExists(dto.projectId, dto.personaId),
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
    const { script, wasCreated } = await this.withIdeaLock(
      ideaId,
      async (manager) => {
        const scriptsRepository = manager.getRepository(Script);
        const hasCompleted = await scriptsRepository.exists({
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

        const activeScript = await scriptsRepository.findOne({
          where: [
            {
              ideaId,
              status: GenerationStatus.QUEUED,
            },
            {
              ideaId,
              status: GenerationStatus.RUNNING,
            },
          ],
          order: {
            createdAt: 'DESC',
          },
        });
        if (activeScript) {
          return {
            script: activeScript,
            wasCreated: false,
          };
        }

        const script = await scriptsRepository.save(
          scriptsRepository.create({
            ideaId,
            status: GenerationStatus.QUEUED,
          }),
        );
        return {
          script,
          wasCreated: true,
        };
      },
    );

    try {
      const job = await this.aiQueueService.enqueueScriptJob({
        ideaId,
        scriptId: script.id,
      });

      return {
        jobId: String(job.id),
        scriptId: script.id,
        status: script.status,
      };
    } catch (error) {
      if (wasCreated) {
        await this.scriptsRepository.update(script.id, {
          status: GenerationStatus.FAILED,
          error: this.toErrorMessage(error),
        });
      }
      throw error;
    }
  }

  async enqueueCaptionGeneration(ideaId: string, dto: GenerateCaptionDto) {
    const { caption, wasCreated } = await this.withIdeaLock(
      ideaId,
      async (manager) => {
        const captionsRepository = manager.getRepository(Caption);
        const scriptsRepository = manager.getRepository(Script);
        const hasCompleted = await captionsRepository.exists({
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

        const hasCompletedScript = await scriptsRepository.exists({
          where: {
            ideaId,
            status: GenerationStatus.SUCCEEDED,
          },
        });
        if (!hasCompletedScript) {
          throw new ConflictException(
            'Script is required. Generate script first.',
          );
        }

        const activeCaption = await captionsRepository.findOne({
          where: [
            {
              ideaId,
              status: GenerationStatus.QUEUED,
            },
            {
              ideaId,
              status: GenerationStatus.RUNNING,
            },
          ],
          order: {
            createdAt: 'DESC',
          },
        });
        if (activeCaption) {
          return {
            caption: activeCaption,
            wasCreated: false,
          };
        }

        const caption = await captionsRepository.save(
          captionsRepository.create({
            ideaId,
            status: GenerationStatus.QUEUED,
          }),
        );
        return {
          caption,
          wasCreated: true,
        };
      },
    );

    try {
      const job = await this.aiQueueService.enqueueCaptionJob({
        ideaId,
        captionId: caption.id,
      });

      return {
        jobId: String(job.id),
        captionId: caption.id,
        status: caption.status,
      };
    } catch (error) {
      if (wasCreated) {
        await this.captionsRepository.update(caption.id, {
          status: GenerationStatus.FAILED,
          error: this.toErrorMessage(error),
        });
      }
      throw error;
    }
  }

  async generateImagePrompt(ideaId: string) {
    return this.ideasPromptGenerationService.generateImagePrompt(ideaId);
  }

  async generateVideoPrompt(ideaId: string) {
    return this.ideasPromptGenerationService.generateVideoPrompt(ideaId);
  }

  async enqueueImageGeneration(ideaId: string, dto: GenerateImageDto) {
    const { asset, wasCreated } = await this.withIdeaLock(
      ideaId,
      async (manager, idea) => {
        if (!idea.imagePrompt?.trim()) {
          throw new ConflictException(
            'Image prompt is empty. Generate image prompt first.',
          );
        }

        const assetsRepository = manager.getRepository(Asset);
        const hasCompleted = await assetsRepository.exists({
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

        const activeAsset = await assetsRepository.findOne({
          where: [
            {
              ideaId,
              type: AssetType.IMAGE,
              status: GenerationStatus.QUEUED,
            },
            {
              ideaId,
              type: AssetType.IMAGE,
              status: GenerationStatus.RUNNING,
            },
          ],
          order: {
            createdAt: 'DESC',
          },
        });
        if (activeAsset) {
          return {
            asset: activeAsset,
            wasCreated: false,
          };
        }

        const asset = await assetsRepository.save(
          assetsRepository.create({
            ideaId,
            type: AssetType.IMAGE,
            sourcePrompt: idea.imagePrompt,
            status: GenerationStatus.QUEUED,
          }),
        );
        return {
          asset,
          wasCreated: true,
        };
      },
    );

    try {
      const job = await this.aiQueueService.enqueueImageJob({
        ideaId,
        assetId: asset.id,
      });

      return {
        jobId: String(job.id),
        assetId: asset.id,
        status: asset.status,
      };
    } catch (error) {
      if (wasCreated) {
        await this.assetsRepository.update(asset.id, {
          status: GenerationStatus.FAILED,
          error: this.toErrorMessage(error),
        });
      }
      throw error;
    }
  }

  async enqueueVideoGeneration(ideaId: string, dto: GenerateImageDto) {
    const { asset, wasCreated } = await this.withIdeaLock(
      ideaId,
      async (manager, idea) => {
        if (!idea.videoPrompt?.trim()) {
          throw new ConflictException(
            'Video prompt is empty. Generate video prompt first.',
          );
        }

        const assetsRepository = manager.getRepository(Asset);
        const hasCompleted = await assetsRepository.exists({
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

        const activeAsset = await assetsRepository.findOne({
          where: [
            {
              ideaId,
              type: AssetType.VIDEO,
              status: GenerationStatus.QUEUED,
            },
            {
              ideaId,
              type: AssetType.VIDEO,
              status: GenerationStatus.RUNNING,
            },
          ],
          order: {
            createdAt: 'DESC',
          },
        });
        if (activeAsset) {
          return {
            asset: activeAsset,
            wasCreated: false,
          };
        }

        const asset = await assetsRepository.save(
          assetsRepository.create({
            ideaId,
            type: AssetType.VIDEO,
            sourcePrompt: idea.videoPrompt,
            status: GenerationStatus.QUEUED,
          }),
        );
        return {
          asset,
          wasCreated: true,
        };
      },
    );

    try {
      const job = await this.aiQueueService.enqueueVideoJob({
        ideaId,
        assetId: asset.id,
      });

      return {
        jobId: String(job.id),
        assetId: asset.id,
        status: asset.status,
      };
    } catch (error) {
      if (wasCreated) {
        await this.assetsRepository.update(asset.id, {
          status: GenerationStatus.FAILED,
          error: this.toErrorMessage(error),
        });
      }
      throw error;
    }
  }

  findAll(query: ListIdeasQueryDto) {
    return this.ideasReadService.findAll(query);
  }

  findOne(ideaId: string) {
    return this.ideasReadService.findOne(ideaId);
  }

  listLogs(query: ListAiRunLogsQueryDto) {
    return this.ideasReadService.listLogs(query);
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

    let fileRemoved = false;
    if (asset.url) {
      fileRemoved = await this.objectStorageService.removeByPublicUrl(
        asset.url,
      );
    }

    try {
      const result = await this.assetsRepository.delete({ id: assetId });
      if (!result.affected) {
        throw new NotFoundException('Asset not found');
      }
    } catch (error) {
      await this.compensateAssetDeletionFailure(asset, fileRemoved);
      throw error;
    }

    return { deleted: 1 };
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const exists = await this.projectsRepository.existsBy({ id: projectId });
    if (!exists) {
      throw new NotFoundException('Project not found');
    }
  }

  private async ensurePersonaExists(
    projectId: string,
    personaId: string,
  ): Promise<void> {
    const exists = await this.personasRepository.existsBy({
      id: personaId,
      projectId,
    });
    if (!exists) {
      throw new NotFoundException('Persona not found');
    }
  }

  private async withIdeaLock<T>(
    ideaId: string,
    callback: (manager: EntityManager, idea: Idea) => Promise<T>,
  ): Promise<T> {
    return this.ideasRepository.manager.transaction(async (manager) => {
      const idea = await manager.getRepository(Idea).findOne({
        where: { id: ideaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!idea) {
        throw new NotFoundException('Idea not found');
      }
      return callback(manager, idea);
    });
  }

  private async compensateAssetDeletionFailure(
    asset: Asset,
    fileRemoved: boolean,
  ): Promise<void> {
    if (!fileRemoved || !asset.url) {
      return;
    }

    try {
      await this.assetsRepository.update(asset.id, {
        url: null,
        status: GenerationStatus.FAILED,
        error:
          'Asset file was removed but DB deletion failed. URL cleared by compensating cleanup.',
      });
    } catch (error) {
      this.logger.warn(
        `Compensating cleanup failed for asset "${asset.id}": ${this.toErrorMessage(error)}`,
      );
    }
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'unknown error';
  }
}
