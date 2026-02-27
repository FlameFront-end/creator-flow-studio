import type { AiProvider } from '../../../shared/api/services/aiSettings.api'

const AI_MODELS_BY_PROVIDER_STORAGE_KEY = 'prompt_studio_ai_models_by_provider_v1'
export const AI_MODELS_BY_PROVIDER_UPDATED_EVENT = 'prompt_studio_ai_models_by_provider_updated'
const MAX_MODELS_PER_PROVIDER = 12

export type PersistedModelsByProvider = Partial<Record<AiProvider, string[]>>

const normalizeModel = (value: string): string => value.trim()
const PROVIDERS: readonly AiProvider[] = ['openai', 'openrouter', 'openai-compatible'] as const

export const readPersistedModelsByProvider = (): PersistedModelsByProvider => {
  if (typeof window === 'undefined') {
    return {}
  }

  const raw = window.localStorage.getItem(AI_MODELS_BY_PROVIDER_STORAGE_KEY)
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const result: PersistedModelsByProvider = {}
    for (const provider of PROVIDERS) {
      const list = (parsed as Record<string, unknown>)[provider]
      if (!Array.isArray(list)) {
        continue
      }

      const normalized = list
        .filter((item): item is string => typeof item === 'string')
        .map(normalizeModel)
        .filter(Boolean)
        .slice(0, MAX_MODELS_PER_PROVIDER)

      if (normalized.length) {
        result[provider] = Array.from(new Set(normalized))
      }
    }

    return result
  } catch {
    return {}
  }
}

export const mergePersistedModelsByProvider = (
  incoming: PersistedModelsByProvider,
): PersistedModelsByProvider => {
  const current = readPersistedModelsByProvider()
  const next: PersistedModelsByProvider = { ...current }

  for (const provider of PROVIDERS) {
    const merged = [
      ...(incoming[provider] ?? []),
      ...(current[provider] ?? []),
    ]
      .map(normalizeModel)
      .filter(Boolean)

    if (merged.length) {
      next[provider] = Array.from(new Set(merged)).slice(0, MAX_MODELS_PER_PROVIDER)
    }
  }

  writePersistedModelsByProvider(next)
  return next
}

export const writePersistedModelsByProvider = (
  value: PersistedModelsByProvider,
) => {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(
    AI_MODELS_BY_PROVIDER_STORAGE_KEY,
    JSON.stringify(value),
  )
  window.dispatchEvent(new CustomEvent(AI_MODELS_BY_PROVIDER_UPDATED_EVENT))
}

export const upsertPersistedProviderModel = (
  provider: AiProvider,
  model: string,
): PersistedModelsByProvider => {
  const normalizedModel = normalizeModel(model)
  const current = readPersistedModelsByProvider()
  if (!normalizedModel) {
    return current
  }

  const nextList = [
    normalizedModel,
    ...(current[provider] ?? []).filter((item) => item !== normalizedModel),
  ].slice(0, MAX_MODELS_PER_PROVIDER)

  const next: PersistedModelsByProvider = {
    ...current,
    [provider]: nextList,
  }
  writePersistedModelsByProvider(next)
  return next
}

export const removePersistedProviderModel = (
  provider: AiProvider,
  model: string,
): PersistedModelsByProvider => {
  const normalizedModel = normalizeModel(model)
  const current = readPersistedModelsByProvider()
  const nextList = (current[provider] ?? []).filter(
    (item) => item !== normalizedModel,
  )
  const next: PersistedModelsByProvider = {
    ...current,
    [provider]: nextList,
  }
  writePersistedModelsByProvider(next)
  return next
}
