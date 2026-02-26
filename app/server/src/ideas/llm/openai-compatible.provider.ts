import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  LlmJsonRequest,
  LlmJsonResponse,
  LlmProvider,
} from './llm-provider.interface';
import { LlmResponseError } from './llm-response.error';

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
  error?:
    | {
        message?: string;
      }
    | string;
};

type ParsedProviderPayload = {
  payload: OpenAiCompatibleChatCompletionResponse | null;
  rawText: string;
};

@Injectable()
export class OpenAiCompatibleProvider implements LlmProvider {
  readonly name = 'openai-compatible';
  private readonly logger = new Logger(OpenAiCompatibleProvider.name);

  async generateJson<T>({
    prompt,
    maxTokens,
    temperature,
    config,
    responseSchema,
  }: LlmJsonRequest): Promise<LlmJsonResponse<T>> {
    const apiKey =
      config?.provider === this.name ? config.apiKey : process.env.LLM_API_KEY ?? '';
    const model =
      config?.provider === this.name ? config.model : process.env.LLM_MODEL ?? '';
    const baseUrl =
      config?.provider === this.name
        ? config.baseUrl ?? ''
        : process.env.LLM_BASE_URL ?? '';

    if (!apiKey) {
      this.logger.debug(
        'LLM_API_KEY is empty for openai-compatible provider. Request will be sent without Authorization header.',
      );
    }
    if (!model) {
      throw new ServiceUnavailableException(
        'LLM_MODEL is not configured for AI generation',
      );
    }
    if (!baseUrl) {
      throw new ServiceUnavailableException(
        'LLM_BASE_URL is not configured for AI generation',
      );
    }

    const endpoint = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

    const primaryAttempt = await this.sendRequest({
      endpoint,
      apiKey,
      model,
      prompt,
      temperature,
      maxTokens,
      responseSchema,
      includeResponseFormat: true,
    });

    let activeAttempt = primaryAttempt;
    if (
      !primaryAttempt.response.ok &&
      this.shouldRetryWithoutResponseFormat(
        primaryAttempt.response.status,
        primaryAttempt.rawText,
      )
    ) {
      activeAttempt = await this.sendRequest({
        endpoint,
        apiKey,
        model,
        prompt,
        temperature,
        maxTokens,
        responseSchema,
        includeResponseFormat: false,
      });
    }

    const { response, payload, rawText } = activeAttempt;
    if (!response.ok) {
      const fallbackMessage = `OpenAI-compatible request failed (${response.status} ${response.statusText || 'unknown-status'})`;
      const providerErrorMessage = this.extractProviderErrorMessage(payload);
      throw new LlmResponseError(
        providerErrorMessage ?? fallbackMessage,
        'provider_request_failed',
        { rawResponse: rawText || JSON.stringify(payload) },
      );
    }

    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) {
      throw new LlmResponseError(
        'OpenAI-compatible response is empty or malformed',
        'empty_response',
        { rawResponse: rawText || JSON.stringify(payload) },
      );
    }

    const parsed = this.tryParseJson<T>(content);
    if (parsed === null) {
      this.logger.error(
        `Failed to parse JSON from provider response. Model=${payload.model || model}. Content preview: ${content.slice(0, 500)}`,
      );
      throw new LlmResponseError(
        'OpenAI-compatible provider returned invalid JSON payload',
        'invalid_json_payload',
        { rawResponse: content },
      );
    }

    if (
      payload.model &&
      payload.model.trim().toLowerCase() !== model.trim().toLowerCase()
    ) {
      throw new LlmResponseError(
        `Requested model "${model}" is unavailable.`,
        'provider_request_failed',
        { rawResponse: rawText || JSON.stringify(payload) },
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

  private tryParseJson<T>(content: string): T | null {
    const normalized = content.trim();
    const fenceMatch = normalized.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    const fromFence = fenceMatch?.[1]?.trim() ?? '';
    const extracted = this.extractFirstJsonCandidate(normalized);
    const extractedFromFence = fromFence
      ? this.extractFirstJsonCandidate(fromFence)
      : '';

    const candidates = [
      normalized,
      fromFence,
      extracted,
      extractedFromFence,
    ].filter((value): value is string => Boolean(value));

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate) as T;
      } catch {
        continue;
      }
    }

    return null;
  }

  private extractFirstJsonCandidate(value: string): string {
    const startObject = value.indexOf('{');
    const startArray = value.indexOf('[');
    const start =
      startObject === -1
        ? startArray
        : startArray === -1
          ? startObject
          : Math.min(startObject, startArray);

    if (start === -1) {
      return '';
    }

    const opening = value[start];
    const closing = opening === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < value.length; index += 1) {
      const char = value[index];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }
      if (char === opening) {
        depth += 1;
      } else if (char === closing) {
        depth -= 1;
        if (depth === 0) {
          return value.slice(start, index + 1).trim();
        }
      }
    }

    return '';
  }

  private async sendRequest(args: {
    endpoint: string;
    apiKey: string;
    model: string;
    prompt: string;
    temperature: number;
    maxTokens: number;
    responseSchema?: {
      name: string;
      schema: Record<string, unknown>;
      strict?: boolean;
    };
    includeResponseFormat: boolean;
  }): Promise<{
    response: Response;
    payload: OpenAiCompatibleChatCompletionResponse;
    rawText: string;
  }> {
    const requestBody: Record<string, unknown> = {
      model: args.model,
      temperature: args.temperature,
      max_tokens: args.maxTokens,
      messages: [
        {
          role: 'system',
          content:
            'Return a single valid JSON object only. No markdown, no prose, no extra keys.',
        },
        {
          role: 'user',
          content: args.prompt,
        },
      ],
    };

    if (args.includeResponseFormat) {
      requestBody.response_format = {
        type: 'json_schema',
        json_schema: {
          name: args.responseSchema?.name ?? 'structured_output',
          strict: args.responseSchema?.strict ?? true,
          schema: args.responseSchema?.schema ?? {
            type: 'object',
            additionalProperties: true,
          },
        },
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (args.apiKey.trim()) {
      headers.Authorization = `Bearer ${args.apiKey}`;
    }

    const response = await fetch(args.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    const { payload, rawText } = await this.parsePayload(response);
    return { response, payload: payload ?? {}, rawText };
  }

  private async parsePayload(response: Response): Promise<ParsedProviderPayload> {
    const rawText = await response.text();
    if (!rawText.trim()) {
      return { payload: null, rawText };
    }

    try {
      return {
        payload: JSON.parse(rawText) as OpenAiCompatibleChatCompletionResponse,
        rawText,
      };
    } catch {
      return { payload: null, rawText };
    }
  }

  private shouldRetryWithoutResponseFormat(
    status: number,
    rawText: string,
  ): boolean {
    if (status !== 400) {
      return false;
    }

    const normalized = rawText.toLowerCase();
    return normalized.includes('response_format');
  }

  private extractProviderErrorMessage(
    payload: OpenAiCompatibleChatCompletionResponse,
  ): string | null {
    if (!payload.error) {
      return null;
    }
    if (typeof payload.error === 'string') {
      return payload.error.trim() || null;
    }
    if (typeof payload.error.message === 'string') {
      return payload.error.message.trim() || null;
    }
    return null;
  }
}

