export const AI_PROVIDER_VALUES = [
  'openai',
  'openrouter',
  'openai-compatible',
] as const;

export type AiProviderName = (typeof AI_PROVIDER_VALUES)[number];
export type AiSettingsSource = 'env' | 'database';

export const DEFAULT_AI_MAX_TOKENS = 1400;
export const AI_MIN_MAX_TOKENS = 128;
export const AI_MAX_MAX_TOKENS = 8000;
export const DEFAULT_AI_RESPONSE_LANGUAGE = 'Русский';

export type AiRuntimeConfig = {
  provider: AiProviderName;
  apiKey: string;
  model: string;
  baseUrl: string | null;
  responseLanguage: string;
  maxTokens: number;
  aiTestMode: boolean;
  source: AiSettingsSource;
};

export type AiModelProfileView = {
  id: string;
  provider: AiProviderName;
  model: string;
  baseUrl: string | null;
  responseLanguage: string;
  maxTokens: number;
  isEnabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
  active: boolean;
};

export type AiSettingsView = {
  models: AiModelProfileView[];
  activeModelId: string | null;
};

export type AiConnectionTestResult = {
  ok: true;
  provider: AiProviderName;
  model: string;
  latencyMs: number;
  source: AiSettingsSource;
};
