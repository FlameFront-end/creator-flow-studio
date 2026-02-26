import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import {
  LlmJsonRequest,
  LlmJsonResponse,
  LlmProvider,
} from './llm-provider.interface';
import { LlmResponseError } from './llm-response.error';

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
  private readonly endpoint = 'https://api.openai.com/v1/chat/completions';

  async generateJson<T>({
    prompt,
    maxTokens,
    temperature,
    config,
  }: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    const apiKey =
      config?.provider === this.name
        ? config.apiKey
        : (process.env.OPENAI_API_KEY ?? '');
    const model =
      config?.provider === this.name
        ? config.model
        : (process.env.OPENAI_MODEL ?? 'gpt-4o-mini');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENAI_API_KEY is not configured for AI generation',
      );
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
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

    const payload = (await response.json()) as OpenAiChatCompletionResponse;
    if (!response.ok) {
      throw new LlmResponseError(
        payload.error?.message ?? 'OpenAI request failed',
        'provider_request_failed',
        { rawResponse: JSON.stringify(payload) },
      );
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new LlmResponseError('OpenAI response is empty or malformed', 'empty_response', {
        rawResponse: JSON.stringify(payload),
      });
    }

    let parsed: T;
    try {
      parsed = JSON.parse(content) as T;
    } catch {
      throw new LlmResponseError(
        'OpenAI returned invalid JSON payload',
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
