import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  LlmJsonRequest,
  LlmJsonResponse,
  LlmProvider,
} from './llm-provider.interface';
import { LlmResponseError } from './llm-response.error';
import {
  AI_HTTP_TIMEOUT_MS,
  fetchWithTimeout,
  isAbortError,
  toErrorMessage,
} from '../../common/network/fetch-with-timeout';

type OpenRouterChatCompletionResponse = {
  id?: string;
  model?: string;
  usage?: {
    total_tokens?: number;
  };
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
export class OpenRouterProvider implements LlmProvider {
  readonly name = 'openrouter';
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly siteUrl =
    process.env.OPENROUTER_SITE_URL ?? 'http://localhost';
  private readonly appName =
    process.env.OPENROUTER_APP_NAME ?? 'creator-flow-studio';

  async generateJson<T>({
    prompt,
    maxTokens,
    temperature,
    config,
  }: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    const apiKey =
      config?.provider === this.name
        ? config.apiKey
        : (process.env.OPENROUTER_API_KEY ?? '');
    const model =
      config?.provider === this.name
        ? config.model
        : (process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-exp:free');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENROUTER_API_KEY is not configured for AI generation',
      );
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(this.endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': this.siteUrl,
          'X-Title': this.appName,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'Return a single valid JSON object only. No markdown, no prose, no extra keys.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        }),
      });
    } catch (error) {
      const message = isAbortError(error)
        ? `OpenRouter request timed out after ${AI_HTTP_TIMEOUT_MS}ms`
        : `OpenRouter request failed before response: ${toErrorMessage(error, 'unknown network error')}`;
      throw new LlmResponseError(message, 'provider_request_failed');
    }

    const payload = (await response.json()) as OpenRouterChatCompletionResponse;
    if (!response.ok) {
      throw new LlmResponseError(
        payload.error?.message ?? 'OpenRouter request failed',
        'provider_request_failed',
        { rawResponse: JSON.stringify(payload) },
      );
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new LlmResponseError(
        'OpenRouter response is empty or malformed',
        'empty_response',
        { rawResponse: JSON.stringify(payload) },
      );
    }

    let parsed: T;
    try {
      parsed = JSON.parse(content) as T;
    } catch {
      throw new LlmResponseError(
        'OpenRouter returned invalid JSON payload',
        'invalid_json_payload',
        { rawResponse: content },
      );
    }

    return {
      provider: this.name,
      model: payload.model || model,
      tokens: payload.usage?.total_tokens ?? null,
      requestId: response.headers.get('x-request-id'),
      data: parsed,
    };
  }
}
