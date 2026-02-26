import { Injectable } from '@nestjs/common';
import { AiSettingsService } from '../../ai-settings/ai-settings.service';
import {
  LlmJsonRequest,
  LlmJsonResponse,
  LlmProvider,
} from './llm-provider.interface';
import { OpenAiCompatibleProvider } from './openai-compatible.provider';
import { OpenAiProvider } from './openai.provider';
import { OpenRouterProvider } from './openrouter.provider';

@Injectable()
export class RoutingLlmProvider implements LlmProvider {
  readonly name = 'routing';

  constructor(
    private readonly aiSettingsService: AiSettingsService,
    private readonly openAiProvider: OpenAiProvider,
    private readonly openRouterProvider: OpenRouterProvider,
    private readonly openAiCompatibleProvider: OpenAiCompatibleProvider,
  ) {}

  async generateJson<T>(request: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    const runtimeConfig =
      request.config ?? (await this.aiSettingsService.getRuntimeConfig());
    const requestWithConfig = {
      ...request,
      config: runtimeConfig,
    };

    switch (runtimeConfig.provider) {
      case 'openai':
        return this.openAiProvider.generateJson<T>(requestWithConfig);
      case 'openrouter':
        return this.openRouterProvider.generateJson<T>(requestWithConfig);
      case 'openai-compatible':
        return this.openAiCompatibleProvider.generateJson<T>(requestWithConfig);
      default:
        return this.openAiProvider.generateJson<T>(requestWithConfig);
    }
  }
}
