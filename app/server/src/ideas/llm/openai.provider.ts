import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  LlmJsonRequest,
  LlmJsonResponse,
  LlmProvider,
} from './llm-provider.interface';

type OpenAiChatCompletionResponse = {
  id: string;
  model: string;
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
export class OpenAiProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly apiKey = process.env.OPENAI_API_KEY ?? '';
  private readonly model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  async generateJson<T>({
    prompt,
    maxTokens,
    temperature,
  }: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY is not configured for AI generation',
      );
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
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

    const payload = (await response.json()) as OpenAiChatCompletionResponse;
    if (!response.ok) {
      throw new ServiceUnavailableException(
        payload.error?.message ?? 'OpenAI request failed',
      );
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new ServiceUnavailableException(
        'OpenAI response is empty or malformed',
      );
    }

    let parsed: T;
    try {
      parsed = JSON.parse(content) as T;
    } catch {
      throw new ServiceUnavailableException(
        'OpenAI returned invalid JSON payload',
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

