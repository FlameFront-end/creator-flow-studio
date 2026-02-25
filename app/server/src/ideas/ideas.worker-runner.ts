import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { UnrecoverableError, Worker } from 'bullmq';
import { Repository } from 'typeorm';
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
import { Idea, IdeaFormat } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import {
  AI_GENERATION_QUEUE,
  AiJobName,
  DEFAULT_LLM_MAX_TOKENS,
  DEFAULT_MAX_HASHTAGS,
  DEFAULT_MAX_SCRIPT_CHARS,
  DEFAULT_MAX_SHOTS,
} from './ideas.constants';
import {
  LLM_PROVIDER_TOKEN,
} from './llm/llm-provider.interface';
import type { LlmProvider } from './llm/llm-provider.interface';
import { buildRedisConnection } from './redis.config';
import {
  IMAGE_PROVIDER_TOKEN,
} from './providers/image-provider.interface';
import type { ImageProvider } from './providers/image-provider.interface';
import {
  VIDEO_PROVIDER_TOKEN,
} from './providers/video-provider.interface';
import type { VideoProvider } from './providers/video-provider.interface';
import { LocalObjectStorageService } from '../storage/local-object-storage.service';
import {
  buildMockCaption,
  buildMockIdeas,
  buildMockScript,
} from './mock/ai-test-fallback';

type IdeasResponse = {
  ideas?: Array<{
    topic?: unknown;
    hook?: unknown;
    format?: unknown;
  }>;
};

type ScriptResponse = {
  text?: unknown;
  script?: unknown;
  shotList?: unknown;
};

type CaptionResponse = {
  text?: unknown;
  hashtags?: unknown;
};

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
  private readonly llmMaxTokens = this.toNumber(
    process.env.LLM_MAX_TOKENS,
    DEFAULT_LLM_MAX_TOKENS,
  );

  constructor(
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: LlmProvider,
    @Inject(IMAGE_PROVIDER_TOKEN)
    private readonly imageProvider: ImageProvider,
    @Inject(VIDEO_PROVIDER_TOKEN)
    private readonly videoProvider: VideoProvider,
    private readonly objectStorageService: LocalObjectStorageService,
    private readonly promptService: PromptService,
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
          case AiJobName.GENERATE_IDEAS:
            await this.handleGenerateIdeas(job as Job<GenerateIdeasJobData>);
            return;
          case AiJobName.GENERATE_SCRIPT:
            await this.handleGenerateScript(job as Job<GenerateScriptJobData>);
            return;
          case AiJobName.GENERATE_CAPTION:
            await this.handleGenerateCaption(job as Job<GenerateCaptionJobData>);
            return;
          case AiJobName.GENERATE_IMAGE:
            await this.handleGenerateImage(job as Job<GenerateImageJobData>);
            return;
          case AiJobName.GENERATE_VIDEO:
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
    try {
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

Return JSON with shape:
{
  "ideas": [
    {"topic":"...", "hook":"...", "format":"reel|short|tiktok"}
  ]
}
`,
        maxTokens: this.llmMaxTokens,
        temperature: 0.7,
      });

      const ideas = this.normalizeIdeas(response.data, job.data.format);
      if (!ideas.length) {
        throw new Error('LLM returned an empty ideas list');
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
        model: response.model,
      });
    } catch (error) {
      if (this.shouldUseMockFallback(error)) {
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
        await this.createLog({
          operation: AiOperation.IDEAS,
          projectId: job.data.projectId,
          ideaId: null,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          model: this.getConfiguredLlmModel(),
          error: this.toErrorMessage(error),
        });
      }
      throw this.toQueueError(error);
    }
  }

  private async handleGenerateScript(job: Job<GenerateScriptJobData>) {
    const startedAt = Date.now();
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

Return JSON with shape:
{
  "text":"script text",
  "shotList":["shot 1", "shot 2"]
}
`,
        maxTokens: this.llmMaxTokens,
        temperature: 0.7,
      });

      const scriptText = this.normalizeScriptText(response.data);
      const shotList = this.normalizeShotList(response.data);

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
        model: response.model,
      });
    } catch (error) {
      if (this.shouldUseMockFallback(error)) {
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
        await this.createLog({
          operation: AiOperation.SCRIPT,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          model: this.getConfiguredLlmModel(),
          error: this.toErrorMessage(error),
        });
      }
      throw this.toQueueError(error);
    }
  }

  private async handleGenerateCaption(job: Job<GenerateCaptionJobData>) {
    const startedAt = Date.now();
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

Return JSON with shape:
{
  "text":"caption text",
  "hashtags":["#tag1","#tag2"]
}
`,
        maxTokens: this.llmMaxTokens,
        temperature: 0.8,
      });

      const text = this.normalizeCaptionText(response.data);
      const hashtags = this.normalizeHashtags(response.data);

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
        model: response.model,
      });
    } catch (error) {
      if (this.shouldUseMockFallback(error)) {
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
        await this.createLog({
          operation: AiOperation.CAPTION,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          model: this.getConfiguredLlmModel(),
          error: this.toErrorMessage(error),
        });
      }
      throw this.toQueueError(error);
    }
  }

  private async handleGenerateImage(job: Job<GenerateImageJobData>) {
    const startedAt = Date.now();
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
      const url = await this.objectStorageService.save({
        bytes: generated.bytes,
        mime: generated.mime,
        ideaId: idea.id,
      });

      await this.assetsRepository.update(asset.id, {
        status: GenerationStatus.SUCCEEDED,
        error: null,
        provider: this.imageProvider.name,
        mime: generated.mime,
        width: generated.width,
        height: generated.height,
        url,
        sourcePrompt: idea.imagePrompt,
      });

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
          error: this.toErrorMessage(error),
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
          error: this.toErrorMessage(error),
        });
      }
      throw this.toQueueError(error);
    }
  }

  private normalizeIdeas(data: IdeasResponse, defaultFormat: string) {
    const rawIdeas = Array.isArray(data.ideas) ? data.ideas : [];
    return rawIdeas
      .map((item) => {
        const topic =
          typeof item.topic === 'string' ? item.topic.trim() : undefined;
        const hook = typeof item.hook === 'string' ? item.hook.trim() : undefined;
        const rawFormat =
          typeof item.format === 'string'
            ? item.format.trim().toLowerCase()
            : defaultFormat;
        const format = this.isValidIdeaFormat(rawFormat)
          ? rawFormat
          : (defaultFormat as IdeaFormat);

        if (!topic || !hook) {
          return null;
        }

        return {
          topic: topic.slice(0, 280),
          hook: hook.slice(0, 2000),
          format,
        };
      })
      .filter((item): item is { topic: string; hook: string; format: IdeaFormat } =>
        Boolean(item),
      );
  }

  private normalizeScriptText(data: ScriptResponse): string {
    const value = typeof data.text === 'string' ? data.text : data.script;
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error('LLM returned empty script text');
    }
    return value.trim().slice(0, this.maxScriptChars);
  }

  private normalizeShotList(data: ScriptResponse): string[] {
    const shotList = Array.isArray(data.shotList) ? data.shotList : [];
    return shotList
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, DEFAULT_MAX_SHOTS);
  }

  private normalizeCaptionText(data: CaptionResponse): string {
    if (typeof data.text !== 'string' || !data.text.trim()) {
      throw new Error('LLM returned empty caption text');
    }
    return data.text.trim().slice(0, 3000);
  }

  private normalizeHashtags(data: CaptionResponse): string[] {
    const hashtags = Array.isArray(data.hashtags) ? data.hashtags : [];
    return hashtags
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, DEFAULT_MAX_HASHTAGS);
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
      }),
    );
  }

  private isValidIdeaFormat(value: string): value is IdeaFormat {
    return (
      value === IdeaFormat.REEL ||
      value === IdeaFormat.SHORT ||
      value === IdeaFormat.TIKTOK
    );
  }

  private shouldUseMockFallback(error: unknown): boolean {
    return this.aiTestMode && this.isProviderNotConfiguredError(error);
  }

  private shouldLogFailureForAttempt(job: Job, error: unknown): boolean {
    if (this.isUnrecoverableError(error)) {
      return true;
    }
    const attempts = Number(job.opts.attempts ?? 1);
    return job.attemptsMade + 1 >= attempts;
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
    return error.slice(0, 500);
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

  private getConfiguredLlmModel(): string {
    return (
      process.env.LLM_MODEL ??
      process.env.OPENROUTER_MODEL ??
      process.env.OPENAI_MODEL ??
      'unknown-model'
    );
  }
}
