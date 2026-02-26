import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import type { AiRuntimeConfig } from '../ai-settings/ai-settings.types';
import { PromptService } from '../prompt/prompt.service';
import { PromptTemplateKey } from '../prompt-templates/entities/prompt-template.entity';
import { GenerateCaptionJobData } from './ai-queue.service';
import { AiOperation, AiRunLog } from './entities/ai-run-log.entity';
import { Caption } from './entities/caption.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import { LLM_PROVIDER_TOKEN } from './llm/llm-provider.interface';
import type { LlmProvider } from './llm/llm-provider.interface';
import { IdeasWorkerErrorService } from './ideas-worker-error.service';
import {
  CaptionResponse,
  IdeasWorkerResponseNormalizerService,
} from './ideas-worker-response-normalizer.service';
import { buildMockCaption } from './mock/ai-test-fallback';

@Injectable()
export class IdeasWorkerCaptionJobService {
  private static readonly MOCK_PROVIDER_NAME = 'mock-test-fallback';
  private static readonly MOCK_MODEL_NAME = 'mock-ai';
  private readonly aiTestMode = this.toBoolean(process.env.AI_TEST_MODE, false);

  constructor(
    private readonly aiSettingsService: AiSettingsService,
    private readonly promptService: PromptService,
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: LlmProvider,
    private readonly responseNormalizer: IdeasWorkerResponseNormalizerService,
    private readonly workerErrorService: IdeasWorkerErrorService,
    @InjectRepository(Idea)
    private readonly ideasRepository: Repository<Idea>,
    @InjectRepository(Caption)
    private readonly captionsRepository: Repository<Caption>,
    @InjectRepository(Script)
    private readonly scriptsRepository: Repository<Script>,
    @InjectRepository(AiRunLog)
    private readonly logsRepository: Repository<AiRunLog>,
  ) {}

  async handle(job: Job<GenerateCaptionJobData>): Promise<void> {
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
    const script = await this.findLatestSucceededScript(idea.id);
    if (!script) {
      await this.failCaption(
        caption.id,
        'Script is required. Generate script first.',
      );
      return;
    }

    try {
      runtimeConfig = await this.aiSettingsService.getRuntimeConfig();
      const scriptShotList = this.toShotListText(script.shotList);
      const promptPreview = await this.promptService.preview({
        personaId: idea.personaId,
        templateKey: PromptTemplateKey.CAPTION,
        variables: {
          topic: idea.topic,
          idea_topic: idea.topic,
          hook: idea.hook,
          idea_hook: idea.hook,
          format: idea.format,
          script: script.text ?? '',
          script_text: script.text ?? '',
          shot_list: scriptShotList,
          shots: scriptShotList,
        },
      });
      const response = await this.llmProvider.generateJson<CaptionResponse>({
        prompt: `${promptPreview.prompt}

SCRIPT CONTEXT:
Script text:
${script.text ?? 'n/a'}
Shot list:
${scriptShotList}

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
      if (
        this.workerErrorService.shouldUseMockFallback(
          error,
          this.aiTestMode,
          runtimeConfig?.aiTestMode,
        )
      ) {
        const mockCaption = buildMockCaption();
        await this.captionsRepository.update(caption.id, {
          text: mockCaption.text,
          hashtags: mockCaption.hashtags,
          status: GenerationStatus.SUCCEEDED,
          error: null,
        });
        await this.createLog({
          operation: AiOperation.CAPTION,
          provider: IdeasWorkerCaptionJobService.MOCK_PROVIDER_NAME,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.SUCCEEDED,
          latencyMs: Date.now() - startedAt,
          tokens: 0,
          requestId: null,
          model: IdeasWorkerCaptionJobService.MOCK_MODEL_NAME,
        });
        return;
      }

      await this.failCaption(
        caption.id,
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
      throw this.workerErrorService.toQueueError(error);
    }
  }

  private async failCaption(captionId: string, error: string): Promise<void> {
    await this.captionsRepository.update(captionId, {
      status: GenerationStatus.FAILED,
      error: this.workerErrorService.truncateError(error),
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

  private async findLatestSucceededScript(
    ideaId: string,
  ): Promise<Script | null> {
    return this.scriptsRepository.findOne({
      where: {
        ideaId,
        status: GenerationStatus.SUCCEEDED,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  private toShotListText(shotList: string[] | null): string {
    if (!shotList?.length) {
      return '-';
    }
    return shotList
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item, index) => `${index + 1}. ${item}`)
      .join('\n');
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
}
