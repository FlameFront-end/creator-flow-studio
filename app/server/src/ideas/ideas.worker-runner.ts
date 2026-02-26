import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import type { AiRuntimeConfig } from '../ai-settings/ai-settings.types';
import { PromptService } from '../prompt/prompt.service';
import { PromptTemplateKey } from '../prompt-templates/entities/prompt-template.entity';
import {
  AiQueueService,
  GenerateCaptionJobData,
  GenerateImageJobData,
  GenerateIdeasJobData,
  GenerateScriptJobData,
  GenerateVideoJobData,
} from './ai-queue.service';
import { AiOperation, AiRunLog } from './entities/ai-run-log.entity';
import { Asset } from './entities/asset.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import {
  AI_GENERATION_QUEUE,
  DEFAULT_MAX_SCRIPT_CHARS,
} from './ideas.constants';
import { LLM_PROVIDER_TOKEN } from './llm/llm-provider.interface';
import type { LlmProvider } from './llm/llm-provider.interface';
import { buildRedisConnection } from './redis.config';
import { IMAGE_PROVIDER_TOKEN } from './providers/image-provider.interface';
import type { ImageProvider } from './providers/image-provider.interface';
import { VIDEO_PROVIDER_TOKEN } from './providers/video-provider.interface';
import type { VideoProvider } from './providers/video-provider.interface';
import { LocalObjectStorageService } from '../storage/local-object-storage.service';
import { buildMockScript } from './mock/ai-test-fallback';
import {
  IdeasWorkerResponseNormalizerService,
  ScriptResponse,
} from './ideas-worker-response-normalizer.service';
import { IdeasWorkerCaptionJobService } from './ideas-worker-caption-job.service';
import { IdeasWorkerErrorService } from './ideas-worker-error.service';
import { IdeasWorkerIdeasJobService } from './ideas-worker-ideas-job.service';

@Injectable()
export class IdeasWorkerRunner implements OnModuleDestroy {
  private static readonly MOCK_PROVIDER_NAME = 'mock-test-fallback';
  private static readonly MOCK_MODEL_NAME = 'mock-ai';
  private readonly logger = new Logger(IdeasWorkerRunner.name);
  private worker: Worker | null = null;
  private readonly aiTestMode = this.toBoolean(process.env.AI_TEST_MODE, false);
  private readonly workerConcurrency = this.toPositiveInt(
    process.env.WORKER_CONCURRENCY,
    2,
  );
  private readonly maxScriptChars = this.toNumber(
    process.env.SCRIPT_MAX_CHARS,
    DEFAULT_MAX_SCRIPT_CHARS,
  );

  constructor(
    private readonly aiQueueService: AiQueueService,
    private readonly ideasWorkerCaptionJobService: IdeasWorkerCaptionJobService,
    private readonly ideasWorkerIdeasJobService: IdeasWorkerIdeasJobService,
    private readonly aiSettingsService: AiSettingsService,
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: LlmProvider,
    @Inject(IMAGE_PROVIDER_TOKEN)
    private readonly imageProvider: ImageProvider,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: VideoProvider,
    private readonly objectStorageService: LocalObjectStorageService,
    private readonly promptService: PromptService,
    private readonly responseNormalizer: IdeasWorkerResponseNormalizerService,
    private readonly workerErrorService: IdeasWorkerErrorService,
    @InjectRepository(Idea)
    private readonly ideasRepository: Repository<Idea>,
    @InjectRepository(Script)
    private readonly scriptsRepository: Repository<Script>,
    @InjectRepository(AiRunLog)
    private readonly logsRepository: Repository<AiRunLog>,
    @InjectRepository(Asset)
    private readonly assetsRepository: Repository<Asset>,
  ) {}

  start(): void {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(
      AI_GENERATION_QUEUE,
      async (job: Job) => {
        switch (job.name) {
          case 'generate-ideas':
            await this.ideasWorkerIdeasJobService.handle(
              job as Job<GenerateIdeasJobData>,
            );
            return;
          case 'generate-script':
            await this.handleGenerateScript(job as Job<GenerateScriptJobData>);
            return;
          case 'generate-caption':
            await this.ideasWorkerCaptionJobService.handle(
              job as Job<GenerateCaptionJobData>,
            );
            return;
          case 'generate-image':
            await this.handleGenerateImage(job as Job<GenerateImageJobData>);
            return;
          case 'generate-video':
            await this.handleGenerateVideo(job as Job<GenerateVideoJobData>);
            return;
          default:
            this.logger.warn(`Unknown job "${job.name}" skipped`);
        }
      },
      {
        connection: buildRedisConnection(),
        concurrency: this.workerConcurrency,
      },
    );

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      this.logger.error(
        `Job "${job?.name}" failed: ${error.message}`,
        error.stack,
      );
      if (!job) {
        return;
      }
      void this.moveFailedJobToDlq(job, error);
    });

    this.worker.on('completed', (job: Job) => {
      this.logger.log(`Job "${job.name}" completed (id=${job.id})`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }

  private async handleGenerateScript(job: Job<GenerateScriptJobData>) {
    const startedAt = Date.now();
    let runtimeConfig: AiRuntimeConfig | null = null;
    const script = await this.scriptsRepository.findOne({
      where: { id: job.data.scriptId },
    });
    if (!script) {
      throw new Error(`Script "${job.data.scriptId}" not found`);
    }

    await this.scriptsRepository.update(script.id, {
      status: GenerationStatus.RUNNING,
      error: null,
    });

    const idea = await this.ideasRepository.findOne({
      where: { id: job.data.ideaId },
    });
    if (!idea) {
      await this.failScript(script.id, 'Idea not found');
      return;
    }

    try {
      runtimeConfig = await this.aiSettingsService.getRuntimeConfig();
      const promptPreview = await this.promptService.preview({
        personaId: idea.personaId,
        templateKey: PromptTemplateKey.SCRIPT,
        variables: {
          topic: idea.topic,
          idea_topic: idea.topic,
          hook: idea.hook,
          idea_hook: idea.hook,
          format: idea.format,
        },
      });
      const response = await this.llmProvider.generateJson<ScriptResponse>({
        prompt: `${promptPreview.prompt}

STRICT OUTPUT CONTRACT:
- Return a single JSON object only.
- Do not use markdown code fences.
- Do not include explanations or extra keys.
- Required shape:
{
  "text":"script text",
  "shotList":["shot 1", "shot 2"]
}
Do not return formats like reel_title/structure/reel_concept.
`,
        maxTokens: runtimeConfig.maxTokens,
        temperature: 0.7,
        config: runtimeConfig,
        responseSchema: {
          name: 'script_output',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['text', 'shotList'],
            properties: {
              text: {
                type: 'string',
                minLength: 1,
              },
              shotList: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      });

      const scriptText = this.responseNormalizer.normalizeScriptText(
        response.data,
        this.maxScriptChars,
      );
      const shotList = this.responseNormalizer.normalizeShotList(response.data);

      await this.scriptsRepository.update(script.id, {
        text: scriptText,
        shotList,
        status: GenerationStatus.SUCCEEDED,
        error: null,
      });

      await this.createLog({
        operation: AiOperation.SCRIPT,
        projectId: idea.projectId,
        ideaId: idea.id,
        status: GenerationStatus.SUCCEEDED,
        latencyMs: Date.now() - startedAt,
        tokens: response.tokens,
        requestId: response.requestId,
        provider: response.provider,
        model: response.model,
      });
    } catch (error) {
      if (
        this.workerErrorService.shouldUseMockFallback(
          error,
          this.aiTestMode,
          runtimeConfig?.aiTestMode,
        )
      ) {
        const mockScript = buildMockScript();
        await this.scriptsRepository.update(script.id, {
          text: mockScript.text,
          shotList: mockScript.shotList,
          status: GenerationStatus.SUCCEEDED,
          error: null,
        });
        await this.createLog({
          operation: AiOperation.SCRIPT,
          provider: IdeasWorkerRunner.MOCK_PROVIDER_NAME,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.SUCCEEDED,
          latencyMs: Date.now() - startedAt,
          tokens: 0,
          requestId: null,
          model: IdeasWorkerRunner.MOCK_MODEL_NAME,
        });
        return;
      }

      await this.failScript(
        script.id,
        this.workerErrorService.toErrorMessage(error),
      );
      if (
        this.workerErrorService.shouldLogFailureForAttempt(
          job.attemptsMade,
          this.workerErrorService.resolveMaxAttempts(job.opts.attempts),
        )
      ) {
        const failedConfig =
          runtimeConfig ?? (await this.aiSettingsService.getRuntimeConfig());
        const details = this.workerErrorService.extractErrorDetails(error);
        await this.createLog({
          operation: AiOperation.SCRIPT,
          provider: failedConfig.provider,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          model: failedConfig.model || 'unknown-model',
          error: details.message,
          errorCode: details.code,
          rawResponse: details.rawResponse,
        });
      }
      throw this.workerErrorService.toQueueError(error);
    }
  }

  private async handleGenerateImage(job: Job<GenerateImageJobData>) {
    const startedAt = Date.now();
    let savedAssetUrl: string | null = null;
    const asset = await this.assetsRepository.findOne({
      where: { id: job.data.assetId },
    });
    if (!asset) {
      throw new Error(`Asset "${job.data.assetId}" not found`);
    }

    await this.assetsRepository.update(asset.id, {
      status: GenerationStatus.RUNNING,
      error: null,
    });

    const idea = await this.ideasRepository.findOne({
      where: { id: job.data.ideaId },
    });
    if (!idea) {
      await this.failAsset(asset.id, 'Idea not found');
      return;
    }

    try {
      if (!idea.imagePrompt?.trim()) {
        throw new Error('Image prompt is empty. Generate image prompt first.');
      }
      const generated = await this.imageProvider.generate({
        prompt: idea.imagePrompt,
        ideaId: idea.id,
      });
      savedAssetUrl = await this.objectStorageService.save({
        bytes: generated.bytes,
        mime: generated.mime,
        ideaId: idea.id,
      });

      try {
        await this.assetsRepository.update(asset.id, {
          status: GenerationStatus.SUCCEEDED,
          error: null,
          provider: this.imageProvider.name,
          mime: generated.mime,
          width: generated.width,
          height: generated.height,
          url: savedAssetUrl,
          sourcePrompt: idea.imagePrompt,
        });
      } catch (error) {
        await this.cleanupOrphanStorageFile(savedAssetUrl);
        savedAssetUrl = null;
        throw error;
      }

      await this.createLog({
        operation: AiOperation.IMAGE,
        provider: this.imageProvider.name,
        projectId: idea.projectId,
        ideaId: idea.id,
        status: GenerationStatus.SUCCEEDED,
        latencyMs: Date.now() - startedAt,
        tokens: null,
        requestId: null,
        model: 'mock-image-v1',
      });
    } catch (error) {
      await this.failAsset(
        asset.id,
        this.workerErrorService.toErrorMessage(error),
      );
      if (
        this.workerErrorService.shouldLogFailureForAttempt(
          job.attemptsMade,
          this.workerErrorService.resolveMaxAttempts(job.opts.attempts),
        )
      ) {
        const details = this.workerErrorService.extractErrorDetails(error);
        await this.createLog({
          operation: AiOperation.IMAGE,
          provider: this.imageProvider.name,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          model: 'mock-image-v1',
          error: details.message,
          errorCode: details.code,
          rawResponse: details.rawResponse,
        });
      }
      throw this.workerErrorService.toQueueError(error);
    }
  }

  private async handleGenerateVideo(job: Job<GenerateVideoJobData>) {
    const startedAt = Date.now();
    const asset = await this.assetsRepository.findOne({
      where: { id: job.data.assetId },
    });
    if (!asset) {
      throw new Error(`Asset "${job.data.assetId}" not found`);
    }
    const idea = await this.ideasRepository.findOne({
      where: { id: job.data.ideaId },
    });
    if (!idea) {
      await this.failAsset(asset.id, 'Idea not found');
      return;
    }

    await this.assetsRepository.update(asset.id, {
      status: GenerationStatus.RUNNING,
      error: null,
    });

    try {
      if (!idea.videoPrompt?.trim()) {
        throw new Error('Video prompt is empty. Generate video prompt first.');
      }

      const generated = await this.videoProvider.generate({
        prompt: idea.videoPrompt,
        ideaId: idea.id,
      });

      await this.assetsRepository.update(asset.id, {
        status: GenerationStatus.SUCCEEDED,
        error: null,
        provider: this.videoProvider.name,
        mime: generated.mime,
        width: generated.width,
        height: generated.height,
        duration: generated.duration,
        url: generated.url,
        sourcePrompt: idea.videoPrompt,
      });

      await this.createLog({
        operation: AiOperation.VIDEO,
        provider: this.videoProvider.name,
        projectId: idea.projectId,
        ideaId: idea.id,
        status: GenerationStatus.SUCCEEDED,
        latencyMs: Date.now() - startedAt,
        tokens: null,
        requestId: null,
        model: 'mock-video-v1',
      });
    } catch (error) {
      await this.failAsset(
        asset.id,
        this.workerErrorService.toErrorMessage(error),
      );
      if (
        this.workerErrorService.shouldLogFailureForAttempt(
          job.attemptsMade,
          this.workerErrorService.resolveMaxAttempts(job.opts.attempts),
        )
      ) {
        const details = this.workerErrorService.extractErrorDetails(error);
        await this.createLog({
          operation: AiOperation.VIDEO,
          provider: this.videoProvider.name,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          model: 'mock-video-v1',
          error: details.message,
          errorCode: details.code,
          rawResponse: details.rawResponse,
        });
      }
      throw this.workerErrorService.toQueueError(error);
    }
  }

  private async failScript(scriptId: string, error: string) {
    await this.scriptsRepository.update(scriptId, {
      status: GenerationStatus.FAILED,
      error: this.workerErrorService.truncateError(error),
    });
  }

  private async failAsset(assetId: string, error: string) {
    await this.assetsRepository.update(assetId, {
      status: GenerationStatus.FAILED,
      error: this.workerErrorService.truncateError(error),
    });
  }

  private async cleanupOrphanStorageFile(
    publicUrl: string | null,
  ): Promise<void> {
    if (!publicUrl) {
      return;
    }

    try {
      const removed =
        await this.objectStorageService.removeByPublicUrl(publicUrl);
      if (!removed) {
        this.logger.warn(
          `Compensating cleanup could not remove orphan storage file "${publicUrl}"`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Compensating cleanup failed for orphan storage file "${publicUrl}": ${this.workerErrorService.toErrorMessage(error)}`,
      );
    }
  }

  private async createLog(params: {
    operation: AiOperation;
    provider?: string;
    projectId: string | null;
    ideaId: string | null;
    status: GenerationStatus;
    model: string;
    latencyMs: number | null;
    tokens: number | null;
    requestId: string | null;
    error?: string;
    errorCode?: string | null;
    rawResponse?: string | null;
  }) {
    await this.logsRepository.save(
      this.logsRepository.create({
        provider: params.provider ?? this.llmProvider.name,
        model: params.model,
        operation: params.operation,
        projectId: params.projectId,
        ideaId: params.ideaId,
        status: params.status,
        latencyMs: params.latencyMs,
        tokens: params.tokens,
        requestId: params.requestId,
        error: params.error
          ? this.workerErrorService.truncateError(params.error)
          : null,
        errorCode: params.errorCode ?? null,
        rawResponse: params.rawResponse
          ? this.workerErrorService.truncateRawResponse(params.rawResponse)
          : null,
      }),
    );
  }

  private toNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  private toPositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }
    return parsed;
  }

  private toBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value == null) {
      return fallback;
    }
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['0', 'false', 'no', 'off'].includes(normalized)) {
      return false;
    }
    return fallback;
  }

  private async moveFailedJobToDlq(job: Job, error: Error): Promise<void> {
    const maxAttempts = this.workerErrorService.resolveMaxAttempts(
      job.opts.attempts,
    );
    if (job.attemptsMade < maxAttempts) {
      return;
    }

    try {
      await this.aiQueueService.enqueueDlqJob({
        originalQueue: AI_GENERATION_QUEUE,
        originalJobId: job.id ? String(job.id) : null,
        originalName: job.name,
        attemptsMade: job.attemptsMade,
        maxAttempts,
        failedAt: new Date().toISOString(),
        errorMessage: error.message,
        errorStack: error.stack ?? null,
        data: job.data,
      });
    } catch (dlqError) {
      this.logger.error(
        `Failed to move job "${job.name}" to DLQ: ${this.workerErrorService.toErrorMessage(dlqError)}`,
      );
    }
  }
}
