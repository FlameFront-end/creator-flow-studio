import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AiSettingsService } from './ai-settings.service';
import { AiSettingsRateLimitService } from './ai-settings-rate-limit.service';
import { TestAiSettingsDto } from './dto/test-ai-settings.dto';
import { AiConnectionTestResult, AiRuntimeConfig } from './ai-settings.types';
import {
  AI_HTTP_TIMEOUT_MS,
  fetchWithTimeout,
  isAbortError,
  toErrorMessage,
} from '../common/network/fetch-with-timeout';

type OpenAiLikeResponse = {
  model?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

@Injectable()
export class AiSettingsConnectionTestService {
  constructor(
    private readonly aiSettingsService: AiSettingsService,
    private readonly aiSettingsRateLimitService: AiSettingsRateLimitService,
  ) {}

  async testConnection(
    dto: TestAiSettingsDto,
    clientKey: string,
  ): Promise<AiConnectionTestResult> {
    await this.aiSettingsRateLimitService.assertCanTestConnection(clientKey);
    const runtime = await this.aiSettingsService.buildRuntimeConfigForTest(dto);

    const startedAt = Date.now();
    const response = await this.executeConnectionCheck(runtime);
    return {
      ok: true,
      provider: runtime.provider,
      model: response.model,
      latencyMs: Date.now() - startedAt,
      source: runtime.source,
    };
  }

  private async executeConnectionCheck(
    runtime: AiRuntimeConfig,
  ): Promise<{ model: string }> {
    if (runtime.provider === 'openai') {
      return this.requestOpenAi(runtime);
    }
    if (runtime.provider === 'openrouter') {
      return this.requestOpenRouter(runtime);
    }
    return this.requestOpenAiCompatible(runtime);
  }

  private async requestOpenAi(
    runtime: AiRuntimeConfig,
  ): Promise<{ model: string }> {
    const response = await this.fetchProviderEndpoint(
      'OpenAI',
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${runtime.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: runtime.model,
          temperature: 0,
          max_tokens: Math.min(runtime.maxTokens, 120),
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: 'Return a JSON object only.',
            },
            {
              role: 'user',
              content: 'Return {"ok": true}',
            },
          ],
        }),
      },
    );

    return this.handleOpenAiLikeResponse(response, runtime.model);
  }

  private async requestOpenRouter(
    runtime: AiRuntimeConfig,
  ): Promise<{ model: string }> {
    const response = await this.fetchProviderEndpoint(
      'OpenRouter',
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${runtime.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            process.env.OPENROUTER_SITE_URL ?? 'http://localhost:5173',
          'X-Title': process.env.OPENROUTER_APP_NAME ?? 'creator-flow-studio',
        },
        body: JSON.stringify({
          model: runtime.model,
          temperature: 0,
          max_tokens: Math.min(runtime.maxTokens, 120),
          messages: [
            {
              role: 'system',
              content: 'Return a JSON object only.',
            },
            {
              role: 'user',
              content: 'Return {"ok": true}',
            },
          ],
        }),
      },
    );

    return this.handleOpenAiLikeResponse(response, runtime.model);
  }

  private async requestOpenAiCompatible(
    runtime: AiRuntimeConfig,
  ): Promise<{ model: string }> {
    const endpoint = `${runtime.baseUrl?.replace(/\/+$/, '')}/chat/completions`;
    const response = await this.fetchProviderEndpoint(
      'OpenAI-compatible',
      endpoint,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${runtime.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: runtime.model,
          temperature: 0,
          max_tokens: Math.min(runtime.maxTokens, 120),
          messages: [
            {
              role: 'system',
              content: 'Return a JSON object only.',
            },
            {
              role: 'user',
              content: 'Return {"ok": true}',
            },
          ],
        }),
      },
    );

    const resolved = await this.handleOpenAiLikeResponse(
      response,
      runtime.model,
    );
    if (
      resolved.model.trim().toLowerCase() !== runtime.model.trim().toLowerCase()
    ) {
      throw new ServiceUnavailableException(
        `Requested model "${runtime.model}" is unavailable.`,
      );
    }

    return resolved;
  }

  private async handleOpenAiLikeResponse(
    response: Response,
    fallbackModel: string,
  ): Promise<{ model: string }> {
    const payload = (await this.safeJson(
      response,
    )) as OpenAiLikeResponse | null;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        payload?.error?.message ?? 'AI connection test failed',
      );
    }

    const content = payload?.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new ServiceUnavailableException(
        'AI connection test returned an empty response',
      );
    }

    return {
      model: payload?.model || fallbackModel,
    };
  }

  private async safeJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private async fetchProviderEndpoint(
    providerLabel: string,
    endpoint: string,
    init: RequestInit,
  ): Promise<Response> {
    try {
      return await fetchWithTimeout(endpoint, init);
    } catch (error) {
      if (isAbortError(error)) {
        throw new ServiceUnavailableException(
          `${providerLabel} connection test timed out after ${AI_HTTP_TIMEOUT_MS}ms`,
        );
      }
      throw new ServiceUnavailableException(
        `${providerLabel} connection test failed: ${toErrorMessage(error, 'unknown network error')}`,
      );
    }
  }
}
