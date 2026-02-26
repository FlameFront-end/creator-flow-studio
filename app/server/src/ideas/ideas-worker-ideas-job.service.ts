import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import type { AiRuntimeConfig } from '../ai-settings/ai-settings.types';
import { PromptService } from '../prompt/prompt.service';
import { PromptTemplateKey } from '../prompt-templates/entities/prompt-template.entity';
import { GenerateIdeasJobData } from './ai-queue.service';
import { AiOperation, AiRunLog } from './entities/ai-run-log.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea } from './entities/idea.entity';
import { LLM_PROVIDER_TOKEN } from './llm/llm-provider.interface';
import type { LlmProvider } from './llm/llm-provider.interface';
import { IdeasWorkerErrorService } from './ideas-worker-error.service';
import {
  IdeasResponse,
  IdeasWorkerResponseNormalizerService,
} from './ideas-worker-response-normalizer.service';
import { buildMockIdeas } from './mock/ai-test-fallback';

@Injectable()
export class IdeasWorkerIdeasJobService {
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
    @InjectRepository(AiRunLog)
    private readonly logsRepository: Repository<AiRunLog>,
  ) {}

  async handle(job: Job<GenerateIdeasJobData>): Promise<void> {
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
        responseSchema: {
          name: 'ideas_output',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['ideas'],
            properties: {
              ideas: {
                type: 'array',
                minItems: job.data.count,
                items: {
                  type: 'object',
                  additionalProperties: true,
                  required: ['topic', 'hook', 'format'],
                  properties: {
                    topic: { type: 'string', minLength: 1 },
                    hook: { type: 'string', minLength: 1 },
                    format: { type: 'string', minLength: 1 },
                  },
                },
              },
            },
          },
        },
      });

      const ideas = this.responseNormalizer.normalizeIdeas(
        response.data,
        job.data.format,
      );
      if (ideas.length < job.data.count) {
        throw new Error(
          `LLM returned ${ideas.length} ideas, expected at least ${job.data.count}. Response preview: ${this.responseNormalizer.previewUnknown(response.data)}`,
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
      if (
        this.workerErrorService.shouldUseMockFallback(
          error,
          this.aiTestMode,
          runtimeConfig?.aiTestMode,
        )
      ) {
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
          provider: IdeasWorkerIdeasJobService.MOCK_PROVIDER_NAME,
          projectId: job.data.projectId,
          ideaId: null,
          status: GenerationStatus.SUCCEEDED,
          latencyMs: Date.now() - startedAt,
          tokens: 0,
          requestId: null,
          model: IdeasWorkerIdeasJobService.MOCK_MODEL_NAME,
        });
        return;
      }

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
      throw this.workerErrorService.toQueueError(error);
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
