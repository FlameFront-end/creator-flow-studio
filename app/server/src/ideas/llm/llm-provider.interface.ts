import type { AiRuntimeConfig } from '../../ai-settings/ai-settings.types';

export type LlmJsonRequest = {
  prompt: string;
  maxTokens: number;
  temperature: number;
  config?: AiRuntimeConfig;
  responseSchema?: {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
  };
};

export type LlmJsonResponse<T> = {
  provider: string;
  model: string;
  tokens: number | null;
  requestId: string | null;
  data: T;
};

export interface LlmProvider {
  readonly name: string;
  generateJson<T>(request: LlmJsonRequest): Promise<LlmJsonResponse<T>>;
}

export const LLM_PROVIDER_TOKEN = Symbol('LLM_PROVIDER_TOKEN');
