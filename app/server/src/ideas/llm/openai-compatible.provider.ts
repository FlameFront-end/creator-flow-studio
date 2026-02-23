import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  LlmJsonRequest,
  LlmJsonResponse,
  LlmProvider,
} from './llm-provider.interface';

type OpenAiCompatibleChatCompletionResponse = {
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
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = 'openai-compatible';
  private readonly apiKey = process.env.LLM_API_KEY ?? '';
  private readonly model = process.env.LLM_MODEL ?? '';
  private readonly baseUrl = process.env.LLM_BASE_URL ?? '';

  async generateJson<T>({
    prompt,
    maxTokens,
    temperature,
  }: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'LLM_API_KEY is not configured for AI generation',
      );
    }
    if (!this.model) {
      throw new ServiceUnavailableException(
        'LLM_MODEL is not configured for AI generation',
      );
    }
    if (!this.baseUrl) {
      throw new ServiceUnavailableException(
        'LLM_BASE_URL is not configured for AI generation',
      );
    }

    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
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
      (await response.json()) as OpenAiCompatibleChatCompletionResponse;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        payload.error?.message ?? 'OpenAI-compatible request failed',
      );
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new ServiceUnavailableException(
        'OpenAI-compatible response is empty or malformed',
      );
    }

    let parsed: T;
    try {
      parsed = JSON.parse(content) as T;
    } catch {
      throw new ServiceUnavailableException(
        'OpenAI-compatible provider returned invalid JSON payload',
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
