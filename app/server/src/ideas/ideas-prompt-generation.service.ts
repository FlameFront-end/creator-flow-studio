import {
  ConflictException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiSettingsService } from '../ai-settings/ai-settings.service';
import { PromptService } from '../prompt/prompt.service';
import { PromptTemplateKey } from '../prompt-templates/entities/prompt-template.entity';
import {
  normalizeAiRunLogError,
  normalizeAiRunLogRawResponse,
} from './ai-run-log-normalizer';
import { AiOperation, AiRunLog } from './entities/ai-run-log.entity';
import { GenerationStatus } from './entities/generation-status.enum';
import { Idea } from './entities/idea.entity';
import { Script } from './entities/script.entity';
import {
  DEFAULT_IMAGE_MAX_PROMPT_CHARS,
  DEFAULT_VIDEO_MAX_PROMPT_CHARS,
} from './ideas.constants';
import { LLM_PROVIDER_TOKEN } from './llm/llm-provider.interface';
import type { LlmProvider } from './llm/llm-provider.interface';
import { isLlmTimeoutError, LlmResponseError } from './llm/llm-response.error';
import {
  buildMockImagePrompt,
  buildMockVideoPrompt,
} from './mock/ai-test-fallback';

type PromptResponse = {
  prompt?: unknown;
};

@Injectable()
export class IdeasPromptGenerationService {
  private static readonly MOCK_PROVIDER_NAME = 'mock-test-fallback';
  private static readonly MOCK_MODEL_NAME = 'mock-ai';

  constructor(
    private readonly aiSettingsService: AiSettingsService,
    private readonly promptService: PromptService,
    @Inject(LLM_PROVIDER_TOKEN)
    private readonly llmProvider: LlmProvider,
    @InjectRepository(Idea)
    private readonly ideasRepository: Repository<Idea>,
    @InjectRepository(Script)
    private readonly scriptsRepository: Repository<Script>,
    @InjectRepository(AiRunLog)
    private readonly logsRepository: Repository<AiRunLog>,
  ) {}

  async generateImagePrompt(ideaId: string): Promise<{ prompt: string }> {
    return this.generatePrompt({
      ideaId,
      templateKey: PromptTemplateKey.IMAGE_PROMPT,
      operation: AiOperation.IMAGE_PROMPT,
      promptKind: 'image',
      responseSchemaName: 'image_prompt_output',
      updateField: 'imagePrompt',
      normalizePrompt: (data) => this.normalizeImagePrompt(data),
      buildMockPrompt: buildMockImagePrompt,
    });
  }

  async generateVideoPrompt(ideaId: string): Promise<{ prompt: string }> {
    return this.generatePrompt({
      ideaId,
      templateKey: PromptTemplateKey.VIDEO_PROMPT,
      operation: AiOperation.VIDEO_PROMPT,
      promptKind: 'video',
      responseSchemaName: 'video_prompt_output',
      updateField: 'videoPrompt',
      normalizePrompt: (data) => this.normalizeVideoPrompt(data),
      buildMockPrompt: buildMockVideoPrompt,
    });
  }

  private async generatePrompt(params: {
    ideaId: string;
    templateKey: PromptTemplateKey;
    operation: AiOperation;
    promptKind: 'image' | 'video';
    responseSchemaName: string;
    updateField: 'imagePrompt' | 'videoPrompt';
    normalizePrompt: (data: PromptResponse) => string;
    buildMockPrompt: () => string;
  }): Promise<{ prompt: string }> {
    const idea = await this.ideasRepository.findOne({
      where: { id: params.ideaId },
    });
    if (!idea) {
      throw new NotFoundException('Idea not found');
    }
    const script = await this.findLatestSucceededScript(idea.id);
    if (!script) {
      throw new ConflictException('Script is required. Generate script first.');
    }

    const startedAt = Date.now();
    const runtimeConfig = await this.aiSettingsService.getRuntimeConfig();
    try {
      const scriptShotList = this.toShotListText(script.shotList);
      const promptPreview = await this.promptService.preview({
        personaId: idea.personaId,
        templateKey: params.templateKey,
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
          language: runtimeConfig.responseLanguage,
          response_language: runtimeConfig.responseLanguage,
          output_language: runtimeConfig.responseLanguage,
        },
      });
      const response = await this.llmProvider.generateJson<PromptResponse>({
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
- Write the "prompt" value strictly in "${runtimeConfig.responseLanguage}", matching the locale exactly and using only that language/script.
- Do not switch to any other language or include characters from other scripts (e.g., no 日常 or other non-${runtimeConfig.responseLanguage} glyphs).
- Required shape:
{
  "prompt":"${params.promptKind} generation prompt text"
}`,
        maxTokens: runtimeConfig.maxTokens,
        temperature: 0.7,
        config: runtimeConfig,
        responseSchema: {
          name: params.responseSchemaName,
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

      const prompt = params.normalizePrompt(response.data);
      await this.updateIdeaPrompt(idea.id, params.updateField, prompt);
      await this.logsRepository.save(
        this.logsRepository.create({
          provider: response.provider,
          model: response.model,
          operation: params.operation,
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
        const prompt = params.buildMockPrompt();
        await this.updateIdeaPrompt(idea.id, params.updateField, prompt);
        await this.logsRepository.save(
          this.logsRepository.create({
            provider: IdeasPromptGenerationService.MOCK_PROVIDER_NAME,
            model: IdeasPromptGenerationService.MOCK_MODEL_NAME,
            operation: params.operation,
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
          operation: params.operation,
          projectId: idea.projectId,
          ideaId: idea.id,
          status: GenerationStatus.FAILED,
          latencyMs: Date.now() - startedAt,
          tokens: null,
          requestId: null,
          error: normalizeAiRunLogError(details.message),
          errorCode: details.code,
          rawResponse: normalizeAiRunLogRawResponse(details.rawResponse),
        }),
      );
      if (isLlmTimeoutError(error)) {
        throw new GatewayTimeoutException(
          'AI provider timed out. Please try again in a moment.',
        );
      }
      throw error;
    }
  }

  private async updateIdeaPrompt(
    ideaId: string,
    field: 'imagePrompt' | 'videoPrompt',
    prompt: string,
  ): Promise<void> {
    if (field === 'imagePrompt') {
      await this.ideasRepository.update(ideaId, { imagePrompt: prompt });
      return;
    }
    await this.ideasRepository.update(ideaId, { videoPrompt: prompt });
  }

  private normalizeImagePrompt(data: PromptResponse): string {
    return this.normalizePrompt(data, DEFAULT_IMAGE_MAX_PROMPT_CHARS, 'image');
  }

  private normalizeVideoPrompt(data: PromptResponse): string {
    return this.normalizePrompt(data, DEFAULT_VIDEO_MAX_PROMPT_CHARS, 'video');
  }

  private normalizePrompt(
    data: PromptResponse,
    maxChars: number,
    kind: 'image' | 'video',
  ): string {
    if (typeof data.prompt !== 'string' || !data.prompt.trim()) {
      throw new Error(`LLM returned empty ${kind} prompt`);
    }
    return data.prompt.trim().slice(0, maxChars);
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
}
