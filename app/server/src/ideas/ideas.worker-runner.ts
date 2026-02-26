import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { UnrecoverableError, Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import type { AiRuntimeConfig } from '../ai-settings/ai-settings.types';
import { PromptService } from '../prompt/prompt.service';
import { PromptTemplateKey } from '../prompt-templates/entities/prompt-template.entity';
import {
  GenerateCaptionJobData,
  GenerateImageJobData,
  GenerateIdeasJobData,
  GenerateScriptJobData,
  GenerateVideoJobData,
} from './ai-queue.service';
import { AiOperation, AiRunLog } from './entities/ai-run-log.entity';
import { Asset } from './entities/asset.entity';
import { Caption } from './entities/caption.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import {
  AI_GENERATION_QUEUE,
  DEFAULT_MAX_SCRIPT_CHARS,
} from './ideas.constants';
import { LLM_PROVIDER_TOKEN } from './llm/llm-provider.interface';
import type { LlmProvider } from './llm/llm-provider.interface';
import { LlmResponseError } from './llm/llm-response.error';
import { buildRedisConnection } from './redis.config';
import {
  normalizeAiRunLogError,
  normalizeAiRunLogRawResponse,
} from './ai-run-log-normalizer';
import { IMAGE_PROVIDER_TOKEN } from './providers/image-provider.interface';
import type { ImageProvider } from './providers/image-provider.interface';
import { VIDEO_PROVIDER_TOKEN } from './providers/video-provider.interface';
import type { VideoProvider } from './providers/video-provider.interface';
import { LocalObjectStorageService } from '../storage/local-object-storage.service';
import {
  buildMockCaption,
  buildMockIdeas,
  buildMockScript,
} from './mock/ai-test-fallback';
import {
  CaptionResponse,
  IdeasResponse,
  IdeasWorkerResponseNormalizerService,
  ScriptResponse,
} from './ideas-worker-response-normalizer.service';

@Injectable()
export class IdeasWorkerRunner implements OnModuleDestroy {
  private static readonly MOCK_PROVIDER_NAME = 'mock-test-fallback';
  private static readonly MOCK_MODEL_NAME = 'mock-ai';
  private readonly logger = new Logger(IdeasWorkerRunner.name);
  private worker: Worker | null = null;
  private readonly aiTestMode = this.toBoolean(process.env.AI_TEST_MODE, false);
  private readonly maxScriptChars = this.toNumber(
    process.env.SCRIPT_MAX_CHARS,
    DEFAULT_MAX_SCRIPT_CHARS,
  );

  constructor(
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

  start(): void {
    if (this.worker) {
      return;
    }

    this.worker = new Worker(
      AI_GENERATION_QUEUE,
      async (job: Job) => {
        switch (job.name) {
          case 'generate-ideas':
            await this.handleGenerateIdeas(job as Job<GenerateIdeasJobData>);
            return;
          case 'generate-script':
            await this.handleGenerateScript(job as Job<GenerateScriptJobData>);
            return;
          case 'generate-caption':
            await this.handleGenerateCaption(
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
        concurrency: 2,
      },
    );

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      this.logger.error(
        `Job "${job?.name}" failed: ${error.message}`,
        error.stack,
      );
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

  private async handleGenerateIdeas(job: Job<GenerateIdeasJobData>) {
    const startedAt = Date.now();
    let runtimeConfig: AiRuntimeConfig | null = null;
    try {
      runtimeConfig = await this.aiSettingsService.getRuntimeConfig();
      const promptPreview = await this.promptService.preview({
        personaId: job.data.personaId,
        templateKey: PromptTemplateKey.IDEAS,
        variables: {
          topic: job.data.topic,
          count: job.data.count,
          format: job.data.format,
        },
      });

      const response = await this.llmProvider.generateJson<IdeasResponse>({
        prompt: `${promptPreview.prompt}

STRICT OUTPUT CONTRACT:
- Return a single JSON object only.
- Do not use markdown code fences.
- Do not include explanations or extra keys.
- Required shape:
{
  "ideas": [
    {"topic":"...", "hook":"...", "format":"reel|short|tiktok"}
  ]
}
If unavailable, return {"ideas": []}.
`,
        maxTokens: runtimeConfig.maxTokens,
        temperature: 0.7,
        config: runtimeConfig,
      });

      const ideas = this.responseNormalizer.normalizeIdeas(
        response.data,
        job.data.format,
      );
      if (!ideas.length) {
        throw new Error(
          `LLM returned an empty ideas list. Response preview: ${this.responseNormalizer.previewUnknown(response.data)}`,
        );
      }

      await this.ideasRepository.save(
        ideas.slice(0, job.data.count).map((item) =>
          this.ideasRepository.create({
            projectId: job.data.projectId,
            personaId: job.data.personaId,
            topic: item.topic,
            hook: item.hook,
            format: item.format,
            status: GenerationStatus.SUCCEEDED,
          }),
        ),
      );

      await this.createLog({
        operation: AiOperation.IDEAS,
        projectId: job.data.projectId,
        ideaId: null,
        status: GenerationStatus.SUCCEEDED,
        latencyMs: Date.now() - startedAt,
        tokens: response.tokens,
        requestId: response.requestId,
        provider: response.provider,
        model: response.model,
      });
    } catch (error) {
      if (this.shouldUseMockFallback(error, runtimeConfig)) {
        const mockIdeas = buildMockIdeas(job.data.count, job.data.format);
        await this.ideasRepository.save(
          mockIdeas.map((item) =>
            this.ideasRepository.create({
              projectId: job.data.projectId,
              personaId: job.data.personaId,
              topic: item.topic,
              hook: item.hook,
              format: item.format,
              status: GenerationStatus.SUCCEEDED,
            }),
          ),
        );

        await this.createLog({
          operation: AiOperation.IDEAS,
          provider: IdeasWorkerRunner.MOCK_PROVIDER_NAME,
          projectId: job.data.projectId,
          ideaId: null,
          status: GenerationStatus.SUCCEEDED,
          latencyMs: Date.now() - startedAt,
          tokens: 0,
          requestId: null,
          model: IdeasWorkerRunner.MOCK_MODEL_NAME,
        });
        return;
      }

      if (this.shouldLogFailureForAttempt(job, error)) {
        const failedConfig =
          runtimeConfig ?? (await this.aiSettingsService.getRuntimeConfig());
        const details = this.extractErrorDetails(error);
        await this.createLog({
          operation: AiOperation.IDEAS,
          provider: failedConfig.provider,
          projectId: job.data.projectId,
          ideaId: null,
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
      throw this.toQueueError(error);
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
      if (this.shouldUseMockFallback(error, runtimeConfig)) {
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

      await this.failScript(script.id, this.toErrorMessage(error));
      if (this.shouldLogFailureForAttempt(job, error)) {
        const failedConfig =
          runtimeConfig ?? (await this.aiSettingsService.getRuntimeConfig());
        const details = this.extractErrorDetails(error);
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
      throw this.toQueueError(error);
    }
  }

  private async handleGenerateCaption(job: Job<GenerateCaptionJobData>) {
    const startedAt = Date.now();
    let runtimeConfig: AiRuntimeConfig | null = null;
    const caption = await this.captionsRepository.findOne({
      where: { id: job.data.captionId },
    });
    if (!caption) {
      throw new Error(`Caption "${job.data.captionId}" not found`);
    }

    await this.captionsRepository.update(caption.id, {
      status: GenerationStatus.RUNNING,
      error: null,
    });

    const idea = await this.ideasRepository.findOne({
      where: { id: job.data.ideaId },
    });
    if (!idea) {
      await this.failCaption(caption.id, 'Idea not found');
      return;
    }

    try {
      runtimeConfig = await this.aiSettingsService.getRuntimeConfig();
      const promptPreview = await this.promptService.preview({
        personaId: idea.personaId,
        templateKey: PromptTemplateKey.CAPTION,
        variables: {
          topic: idea.topic,
          idea_topic: idea.topic,
          hook: idea.hook,
          idea_hook: idea.hook,
          format: idea.format,
        },
      });
      const response = await this.llmProvider.generateJson<CaptionResponse>({
        prompt: `${promptPreview.prompt}

STRICT OUTPUT CONTRACT:
- Return a single JSON object only.
- Do not use markdown code fences.
- Do not include explanations or extra keys.
- Required shape:
{
  "text":"caption text",
  "hashtags":["#tag1","#tag2"]
}
`,
        maxTokens: runtimeConfig.maxTokens,
        temperature: 0.8,
        config: runtimeConfig,
        responseSchema: {
          name: 'caption_output',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['text', 'hashtags'],
            properties: {
              text: {
                type: 'string',
                minLength: 1,
              },
              hashtags: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
          },
        },
      });

      const text = this.responseNormalizer.normalizeCaptionText(response.data);
      const hashtags = this.responseNormalizer.normalizeHashtags(response.data);

      await this.captionsRepository.update(caption.id, {
        text,
        hashtags,
        status: GenerationStatus.SUCCEEDED,
        error: null,
      });

      await this.createLog({
        operation: AiOperation.CAPTION,
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
      if (this.shouldUseMockFallback(error, runtimeConfig)) {
        const mockCaption = buildMockCaption();
        await this.captionsRepository.update(caption.id, {
          text: mockCaption.text,
          hashtags: mockCaption.hashtags,
          status: GenerationStatus.SUCCEEDED,
          error: null,
        });
        await this.createLog({
          operation: AiOperation.CAPTION,
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

      await this.failCaption(caption.id, this.toErrorMessage(error));
      if (this.shouldLogFailureForAttempt(job, error)) {
        const failedConfig =
          runtimeConfig ?? (await this.aiSettingsService.getRuntimeConfig());
        const details = this.extractErrorDetails(error);
        await this.createLog({
          operation: AiOperation.CAPTION,
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
      throw this.toQueueError(error);
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
      await this.failAsset(asset.id, this.toErrorMessage(error));
      if (this.shouldLogFailureForAttempt(job, error)) {
        const details = this.extractErrorDetails(error);
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
      throw this.toQueueError(error);
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
      await this.failAsset(asset.id, this.toErrorMessage(error));
      if (this.shouldLogFailureForAttempt(job, error)) {
        const details = this.extractErrorDetails(error);
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
      throw this.toQueueError(error);
    }
  }

  private async failScript(scriptId: string, error: string) {
    await this.scriptsRepository.update(scriptId, {
      status: GenerationStatus.FAILED,
      error: this.truncateError(error),
    });
  }

  private async failCaption(captionId: string, error: string) {
    await this.captionsRepository.update(captionId, {
      status: GenerationStatus.FAILED,
      error: this.truncateError(error),
    });
  }

  private async failAsset(assetId: string, error: string) {
    await this.assetsRepository.update(assetId, {
      status: GenerationStatus.FAILED,
      error: this.truncateError(error),
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
        `Compensating cleanup failed for orphan storage file "${publicUrl}": ${this.toErrorMessage(error)}`,
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
        error: params.error ? this.truncateError(params.error) : null,
        errorCode: params.errorCode ?? null,
        rawResponse: params.rawResponse
          ? this.truncateRawResponse(params.rawResponse)
          : null,
      }),
    );
  }

  private shouldUseMockFallback(
    error: unknown,
    runtimeConfig: AiRuntimeConfig | null,
  ): boolean {
    const aiTestMode = runtimeConfig?.aiTestMode ?? this.aiTestMode;
    return aiTestMode && this.isProviderNotConfiguredError(error);
  }

  private shouldLogFailureForAttempt(job: Job, error: unknown): boolean {
    void job;
    void error;
    return true;
  }

  private toQueueError(error: unknown): Error {
    if (this.isUnrecoverableError(error)) {
      return new UnrecoverableError(this.toErrorMessage(error));
    }
    if (error instanceof Error) {
      return error;
    }
    return new Error(this.toErrorMessage(error));
  }

  private isUnrecoverableError(error: unknown): boolean {
    const message = this.toErrorMessage(error).toLowerCase();
    return (
      this.isProviderNotConfiguredError(error) ||
      (message.includes('prompt template') && message.includes('not found'))
    );
  }

  private isProviderNotConfiguredError(error: unknown): boolean {
    return this.toErrorMessage(error)
      .toLowerCase()
      .includes('is not configured for ai generation');
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Unknown AI worker error';
  }

  private truncateError(error: string): string {
    return normalizeAiRunLogError(error) ?? '';
  }

  private truncateRawResponse(rawResponse: string): string {
    return normalizeAiRunLogRawResponse(rawResponse) ?? '';
  }

  private toNumber(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
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
