import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  LlmJsonRequest,
  LlmJsonResponse,
  LlmProvider,
} from './llm-provider.interface';

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
  private readonly apiKey = process.env.OPENROUTER_API_KEY ?? '';
  private readonly model =
    process.env.OPENROUTER_MODEL ?? 'google/gemini-2.0-flash-exp:free';
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  private readonly siteUrl = process.env.OPENROUTER_SITE_URL ?? 'http://localhost';
  private readonly appName = process.env.OPENROUTER_APP_NAME ?? 'creator-flow-studio';

  async generateJson<T>({
    prompt,
    maxTokens,
    temperature,
  }: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'OPENROUTER_API_KEY is not configured for AI generation',
      );
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': this.siteUrl,
        'X-Title': this.appName,
      },
      body: JSON.stringify({
        model: this.model,
        temperature,
        max_tokens: maxTokens,
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

    const payload =
      (await response.json()) as OpenRouterChatCompletionResponse;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        payload.error?.message ?? 'OpenRouter request failed',
      );
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new ServiceUnavailableException(
        'OpenRouter response is empty or malformed',
      );
    }

    let parsed: T;
    try {
      parsed = JSON.parse(content) as T;
    } catch {
      throw new ServiceUnavailableException(
        'OpenRouter returned invalid JSON payload',
      );
    }

    return {
      model: payload.model || this.model,
      tokens: payload.usage?.total_tokens ?? null,
      requestId: response.headers.get('x-request-id'),
      data: parsed,
    };
  }
}
