export type LlmJsonRequest = {
  prompt: string;
  maxTokens: number;
  temperature: number;
};

export type LlmJsonResponse<T> = {
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

