import type { CSSProperties } from 'react'
import type { AiProvider, AiSettings } from '../../../shared/api/services/aiSettings.api'
import type { PersistedModelsByProvider } from './aiProviderSettings.storage'

export type FormState = {
  provider: AiProvider
  model: string
  apiKey: string
  baseUrl: string
  responseLanguage: string
  maxTokens: number | ''
  isEnabled: boolean
}

export type AiProviderFormField = 'model' | 'apiKey' | 'baseUrl' | 'maxTokens'

export const DEFAULT_LM_STUDIO_BASE_URL = 'http://127.0.0.1:1234'

export const PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  'openai-compatible': 'Local (LM Studio / OpenAI-compatible)',
}

export const maskedApiKeyInputStyle = {
  WebkitTextSecurity: 'disc',
} as CSSProperties

export const normalizeOpenAiCompatibleBaseUrl = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }
  const withoutTrailingSlash = trimmed.replace(/\/+$/, '')
  if (/\/v1$/i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash
  }
  return `${withoutTrailingSlash}/v1`
}

export const formatModelsCount = (count: number): string => {
  const mod100 = count % 100
  const mod10 = count % 10
  if (mod100 >= 11 && mod100 <= 14) {
    return `${count} моделей`
  }
  if (mod10 === 1) {
    return `${count} модель`
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} модели`
  }
  return `${count} моделей`
}

export const resolveActiveProfile = (settings: AiSettings) =>
  settings.models.find((item) => item.id === settings.activeModelId) ??
  settings.models.find((item) => item.active) ??
  null

export const buildFormState = (settings: AiSettings): FormState => ({
  provider: resolveActiveProfile(settings)?.provider ?? 'openai-compatible',
  model: '',
  apiKey: '',
  baseUrl: '',
  responseLanguage: 'Русский',
  maxTokens: '',
  isEnabled: resolveActiveProfile(settings)?.isEnabled ?? true,
})

export const normalizeForCompare = (state: FormState) => ({
  provider: state.provider,
  model: state.model.trim(),
  baseUrl:
    state.provider === 'openai-compatible'
      ? normalizeOpenAiCompatibleBaseUrl(state.baseUrl)
      : state.baseUrl.trim(),
  responseLanguage: state.responseLanguage.trim(),
  maxTokens: typeof state.maxTokens === 'number' ? state.maxTokens : null,
  isEnabled: state.isEnabled,
  apiKey: state.apiKey.trim(),
})

export const buildVerificationSignature = (state: FormState): string =>
  JSON.stringify({
    provider: state.provider,
    model: state.model.trim(),
    apiKey: state.apiKey.trim(),
    baseUrl:
      state.provider === 'openai-compatible'
        ? normalizeOpenAiCompatibleBaseUrl(state.baseUrl)
        : '',
    responseLanguage: state.responseLanguage.trim(),
    maxTokens: typeof state.maxTokens === 'number' ? state.maxTokens : null,
  })

export const mapSavedModelsByProvider = (
  settings: AiSettings,
): PersistedModelsByProvider => {
  const next: PersistedModelsByProvider = {}

  for (const item of settings.models ?? []) {
    const modelName = item.model.trim()
    if (!modelName) {
      continue
    }

    const providerModels = next[item.provider] ?? []
    if (!providerModels.includes(modelName)) {
      next[item.provider] = [...providerModels, modelName]
    }
  }

  return next
}
