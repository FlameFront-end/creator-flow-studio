import { Divider, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title, Tooltip } from '@ui/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  aiSettingsApi,
  type AiProvider,
  type AiSettings,
  type TestAiSettingsResponse,
} from '../../../shared/api/services/aiSettings.api'
import { AppButton } from '../../../shared/components/AppButton'
import { AppBadge } from '../../../shared/components/AppBadge'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../../shared/lib/toast'
import { ROUTES } from '../../../shared/model/routes'
import {
  readPersistedModelsByProvider,
  removePersistedProviderModel,
  upsertPersistedProviderModel,
} from '../model/aiProviderSettings.storage'
import { AI_SETTINGS_QUERY_KEY } from '../model/promptStudio.queryKeys'

type FormState = {
  provider: AiProvider
  model: string
  apiKey: string
  baseUrl: string
  responseLanguage: string
  maxTokens: number | ''
  aiTestMode: boolean
  isEnabled: boolean
}

const DEFAULT_LM_STUDIO_BASE_URL = 'http://127.0.0.1:1234'
const PROVIDER_LABEL: Record<AiProvider, string> = {
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  'openai-compatible': 'Local (LM Studio / OpenAI-compatible)',
}
const maskedApiKeyInputStyle = {
  WebkitTextSecurity: 'disc',
} as CSSProperties

const normalizeOpenAiCompatibleBaseUrl = (value: string): string => {
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

const formatModelsCount = (count: number): string => {
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

const buildFormState = (settings: AiSettings): FormState => ({
  provider: settings.provider,
  model: settings.source === 'database' ? settings.model : '',
  apiKey: '',
  baseUrl:
    settings.provider === 'openai-compatible'
      ? settings.source === 'database'
        ? settings.baseUrl ?? ''
        : ''
      : settings.baseUrl ?? '',
  responseLanguage: settings.responseLanguage ?? 'Русский',
  maxTokens: settings.source === 'database' ? settings.maxTokens : '',
  aiTestMode: settings.aiTestMode,
  isEnabled: settings.isEnabled,
})

const normalizeForCompare = (state: FormState) => ({
  provider: state.provider,
  model: state.model.trim(),
  baseUrl:
    state.provider === 'openai-compatible'
      ? normalizeOpenAiCompatibleBaseUrl(state.baseUrl)
      : state.baseUrl.trim(),
  responseLanguage: state.responseLanguage.trim(),
  maxTokens: typeof state.maxTokens === 'number' ? state.maxTokens : null,
  aiTestMode: state.aiTestMode,
  isEnabled: state.isEnabled,
  apiKey: state.apiKey.trim(),
})

const buildVerificationSignature = (state: FormState): string =>
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

export function AiProviderSettingsSection() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState | null>(null)
  const [baseline, setBaseline] = useState<FormState | null>(null)
  const [lastTestResult, setLastTestResult] = useState<TestAiSettingsResponse | null>(null)
  const [lastTestError, setLastTestError] = useState<string | null>(null)
  const [lastVerifiedSignature, setLastVerifiedSignature] = useState<string | null>(null)
  const [pendingTestSignature, setPendingTestSignature] = useState<string | null>(null)
  const [isApiKeyReadonly, setIsApiKeyReadonly] = useState(true)
  const [deleteModelTarget, setDeleteModelTarget] = useState<{
    provider: AiProvider
    modelName: string
  } | null>(null)
  const [modelsByProvider, setModelsByProvider] = useState(() =>
    readPersistedModelsByProvider(),
  )

  const settingsQuery = useQuery({
    queryKey: AI_SETTINGS_QUERY_KEY,
    queryFn: aiSettingsApi.getAiSettings,
  })

  useEffect(() => {
    if (!settingsQuery.data) {
      return
    }
    const nextState = buildFormState(settingsQuery.data)
    setForm(nextState)
    setBaseline(nextState)
    setLastVerifiedSignature(null)
    setPendingTestSignature(null)
  }, [settingsQuery.data])

  const isDirty = useMemo(() => {
    if (!form || !baseline) {
      return false
    }
    return JSON.stringify(normalizeForCompare(form)) !== JSON.stringify(normalizeForCompare(baseline))
  }, [baseline, form])

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: AI_SETTINGS_QUERY_KEY })
    await queryClient.refetchQueries({ queryKey: AI_SETTINGS_QUERY_KEY, type: 'active' })
  }

  const saveMutation = useMutation({
    mutationFn: aiSettingsApi.updateAiSettings,
    onSuccess: async () => {
      if (form) {
        setModelsByProvider(upsertPersistedProviderModel(form.provider, form.model))
      }
      await refresh()
      setLastTestResult(null)
      setLastTestError(null)
      setLastVerifiedSignature(null)
      setPendingTestSignature(null)
      showSuccessToast('Настройки ИИ сохранены')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось сохранить настройки ИИ')
    },
  })

  const testMutation = useMutation({
    mutationFn: aiSettingsApi.testAiSettings,
    onSuccess: (result) => {
      setLastTestResult(result)
      setLastTestError(null)
      if (pendingTestSignature) {
        setLastVerifiedSignature(pendingTestSignature)
      }
      showSuccessToast('Подключение успешно проверено')
    },
    onError: (error) => {
      setLastTestResult(null)
      const fallback = 'Проверка подключения не выполнена'
      setLastTestError(getErrorMessage(error, fallback))
    },
  })

  const validate = (state: FormState): boolean => {
    if (!state.model.trim()) {
      showValidationToast('Укажите модель')
      return false
    }

    if (state.provider !== 'openai-compatible' && !state.apiKey.trim()) {
      showValidationToast('Укажите API key')
      return false
    }

    if (state.provider === 'openai-compatible' && !state.baseUrl.trim()) {
      showValidationToast('Для OpenAI-compatible нужен Base URL')
      return false
    }

    if (typeof state.maxTokens !== 'number' || Number.isNaN(state.maxTokens)) {
      showValidationToast('Max tokens должен быть числом')
      return false
    }

    if (state.maxTokens < 128 || state.maxTokens > 8000) {
      showValidationToast('Max tokens должен быть в диапазоне 128..8000')
      return false
    }

    return true
  }

  const buildSavePayload = (state: FormState) => ({
    provider: state.provider,
    model: state.model.trim(),
    apiKey:
      state.provider === 'openai-compatible'
        ? undefined
        : state.apiKey.trim()
          ? state.apiKey.trim()
          : undefined,
    baseUrl:
      state.provider === 'openai-compatible'
        ? normalizeOpenAiCompatibleBaseUrl(state.baseUrl)
        : undefined,
    maxTokens: typeof state.maxTokens === 'number' ? state.maxTokens : undefined,
    responseLanguage: state.responseLanguage.trim() || undefined,
    isEnabled: true,
  })

  const buildTestPayload = (state: FormState) => ({
    provider: state.provider,
    model: state.model.trim(),
    apiKey:
      state.provider === 'openai-compatible'
        ? undefined
        : state.apiKey.trim()
          ? state.apiKey.trim()
          : undefined,
    baseUrl:
      state.provider === 'openai-compatible'
        ? normalizeOpenAiCompatibleBaseUrl(state.baseUrl)
        : undefined,
    responseLanguage: state.responseLanguage.trim() || undefined,
    maxTokens: typeof state.maxTokens === 'number' ? state.maxTokens : undefined,
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!form) {
      return
    }
    if (!validate(form)) {
      return
    }
    if (lastVerifiedSignature !== buildVerificationSignature(form)) {
      showValidationToast('Сначала проверьте подключение с текущими параметрами')
      return
    }
    saveMutation.mutate(buildSavePayload(form))
  }

  const onTestConnection = () => {
    if (!form) {
      return
    }
    if (!validate(form)) {
      return
    }
    setLastTestError(null)
    setPendingTestSignature(buildVerificationSignature(form))
    testMutation.mutate(buildTestPayload(form))
  }

  const confirmDeleteModel = () => {
    if (!deleteModelTarget) {
      return
    }
    setModelsByProvider(
      removePersistedProviderModel(
        deleteModelTarget.provider,
        deleteModelTarget.modelName,
      ),
    )
    setDeleteModelTarget(null)
  }

  if (settingsQuery.isError) {
    return (
      <AppInlineErrorAlert>
        {getErrorMessage(settingsQuery.error, 'Не удалось загрузить настройки ИИ')}
      </AppInlineErrorAlert>
    )
  }

  if (!form || settingsQuery.isLoading) {
    return <Text c="dimmed">Загрузка настроек ИИ...</Text>
  }

  const hasAnySavedModels =
    (modelsByProvider.openai?.length ?? 0) > 0 ||
    (modelsByProvider.openrouter?.length ?? 0) > 0 ||
    (modelsByProvider['openai-compatible']?.length ?? 0) > 0

  const handleSelectSavedModel = (provider: AiProvider, modelName: string) => {
    setForm((prev) => {
      if (!prev) {
        return prev
      }
      return {
        ...prev,
        provider,
        model: modelName,
        baseUrl:
          provider === 'openai-compatible'
            ? prev.baseUrl
            : prev.baseUrl,
      }
    })
  }

  const isVerifiedForCurrentForm =
    lastVerifiedSignature !== null &&
    lastVerifiedSignature === buildVerificationSignature(form)
  const testDisabledReason =
    !isDirty && settingsQuery.data?.source === 'database'
      ? 'Модель уже подключена'
      : ''
  const saveDisabledReason = !isVerifiedForCurrentForm
    ? 'Сначала нажмите «Проверить подключение»'
    : ''

  return (
    <Stack gap="md" className="ai-provider-settings">
      <Paper className="inner-surface ai-provider-hero" radius="md" p="md">
        <Group justify="space-between" align="flex-start" gap="sm">
          <Stack gap={6}>
            <Title order={4}>Подключение AI-провайдера</Title>
            <Text size="sm" c="dimmed">
              Центр управления подключением моделей: OpenAI, OpenRouter или локальный LM Studio.
            </Text>
            <Group gap={8}>
              <AppBadge badgeVariant="info">Активный провайдер: {PROVIDER_LABEL[form.provider]}</AppBadge>
            </Group>
          </Stack>
          <AppButton size="xs" variant="subtle" onClick={() => navigate(ROUTES.ABOUT)}>
            Руководство по LM Studio
          </AppButton>
        </Group>
      </Paper>

      <form onSubmit={onSubmit} noValidate autoComplete="off">
        <Stack gap="sm">
          <Paper className="inner-surface ai-provider-library" radius="md" p="md">
            <Stack gap="sm">
              <Title order={5}>Библиотека моделей</Title>
              <Text size="sm" c="dimmed">
                Быстрое переключение между сохранёнными моделями по всем провайдерам.
              </Text>

              {!hasAnySavedModels ? (
                <Paper className="ai-provider-library-empty-critical" radius="md" p="sm">
                  <Stack gap={4}>
                    <Text size="sm" fw={700}>
                      Нет сохранённых моделей
                    </Text>
                    <Text size="sm" c="dimmed">
                      Сначала проверьте и сохраните хотя бы одну модель в этом разделе.
                    </Text>
                  </Stack>
                </Paper>
              ) : (
                <div className="ai-provider-library-grid">
                  {(Object.keys(PROVIDER_LABEL) as AiProvider[]).map((providerKey) => {
                    const providerModels = modelsByProvider[providerKey] ?? []
                    if (!providerModels.length) {
                      return null
                    }

                    return (
                      <Paper key={providerKey} className="ai-provider-library-card" radius="md" p="sm">
                        <Group justify="space-between" mb={8}>
                          <Text size="sm" fw={700}>
                            {PROVIDER_LABEL[providerKey]}
                          </Text>
                          <AppBadge badgeVariant="neutral">{formatModelsCount(providerModels.length)}</AppBadge>
                        </Group>
                        <Stack gap={6}>
                          {providerModels.map((modelName) => {
                            const isActive =
                              form.provider === providerKey &&
                              form.model.trim() === modelName

                            return (
                              <Group key={`${providerKey}:${modelName}`} className="ai-provider-model-row" gap={8}>
                                <AppButton
                                  type="button"
                                  size="xs"
                                  variant={isActive ? 'filled' : 'default'}
                                  onClick={() => handleSelectSavedModel(providerKey, modelName)}
                                  className="ai-provider-model-select-btn"
                                >
                                  {modelName}
                                </AppButton>
                                <AppButton
                                  type="button"
                                  size="xs"
                                  variant="subtle"
                                  color="red"
                                  onClick={() =>
                                    setDeleteModelTarget({
                                      provider: providerKey,
                                      modelName,
                                    })
                                  }
                                >
                                  Удалить
                                </AppButton>
                              </Group>
                            )
                          })}
                        </Stack>
                      </Paper>
                    )
                  })}
                </div>
              )}
            </Stack>
          </Paper>

          <Paper className="inner-surface ai-provider-form-card" radius="md" p="md">
            <Stack gap="sm">
              <Title order={5}>Параметры подключения</Title>
              <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="sm">
                <Select
                  label="Провайдер"
                  value={form.provider}
                  data={[
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'openrouter', label: 'OpenRouter' },
                    { value: 'openai-compatible', label: 'Local (LM Studio / OpenAI-compatible)' },
                  ]}
                  onChange={(value) => {
                    if (!value) {
                      return
                    }
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            provider: value as AiProvider,
                            model: '',
                            baseUrl:
                              value === 'openai-compatible'
                                ? prev.baseUrl
                                : prev.baseUrl,
                            apiKey: value === 'openai-compatible' ? '' : prev.apiKey,
                        }
                        : prev,
                    )
                  }}
                  required
                />

                <TextInput
                  label="Модель"
                  value={form.model}
                  autoComplete="off"
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value
                    setForm((prev) => (prev ? { ...prev, model: nextValue } : prev))
                  }}
                  required
                  maxLength={255}
                />

                <Select
                  label="Язык ответа"
                  value={form.responseLanguage}
                  data={[
                    { value: 'Русский', label: 'Русский' },
                    { value: 'English', label: 'English' },
                  ]}
                  onChange={(value) => {
                    if (!value) {
                      return
                    }
                    setForm((prev) => (prev ? { ...prev, responseLanguage: value } : prev))
                  }}
                  required
                />

                <Group align="flex-end" gap="xs" wrap="nowrap" className="ai-provider-inline-field-action">
                  <NumberInput
                    label="Max tokens"
                    value={form.maxTokens}
                    onChange={(value) =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              maxTokens: typeof value === 'number' ? value : '',
                            }
                          : prev,
                      )
                    }
                    min={128}
                    max={8000}
                    required
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    type="button"
                    size="sm"
                    buttonVariant="muted"
                    className="ai-provider-recommend-btn"
                    onClick={() =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              maxTokens: 1200,
                            }
                          : prev,
                      )
                    }
                  >
                    Подставить
                  </AppButton>
                </Group>
              </SimpleGrid>

              {form.provider === 'openai-compatible' ? (
                <Group align="flex-end" gap="xs" wrap="nowrap" className="ai-provider-inline-field-action">
                  <TextInput
                    label="Base URL"
                    value={form.baseUrl}
                    autoComplete="off"
                    onChange={(event) => {
                      const nextValue = event.currentTarget.value
                      setForm((prev) => (prev ? { ...prev, baseUrl: nextValue } : prev))
                    }}
                    onBlur={(event) => {
                      const normalized = normalizeOpenAiCompatibleBaseUrl(event.currentTarget.value)
                      if (!normalized) {
                        return
                      }
                      setForm((prev) => (prev ? { ...prev, baseUrl: normalized } : prev))
                    }}
                    placeholder="http://127.0.0.1:1234"
                    required
                    maxLength={500}
                    style={{ flex: 1 }}
                  />
                  <AppButton
                    type="button"
                    size="sm"
                    buttonVariant="muted"
                    className="ai-provider-recommend-btn"
                    onClick={() =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              baseUrl: DEFAULT_LM_STUDIO_BASE_URL,
                            }
                          : prev,
                      )
                    }
                  >
                    Подставить
                  </AppButton>
                </Group>
              ) : null}

              {form.provider !== 'openai-compatible' ? (
                <TextInput
                  label="API key"
                  type="text"
                  value={form.apiKey}
                  required
                  name="api_key_secret"
                  autoComplete="off"
                  inputMode="text"
                  autoCapitalize="off"
                  autoCorrect="off"
                  readOnly={isApiKeyReadonly}
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-bwignore="true"
                  onFocus={() => setIsApiKeyReadonly(false)}
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            apiKey: nextValue,
                          }
                        : prev,
                    )
                  }}
                  placeholder="Введите API ключ"
                  maxLength={512}
                  style={maskedApiKeyInputStyle}
                />
              ) : null}

              <Divider className="ai-provider-actions-divider" />

              <Group justify="flex-end" className="ai-provider-actions">
                <Tooltip label={testDisabledReason} disabled={!testDisabledReason} withArrow>
                  <div style={{ display: 'inline-flex' }}>
                    <AppButton
                      type="button"
                      variant="default"
                      onClick={onTestConnection}
                      loading={testMutation.isPending}
                      disabled={saveMutation.isPending || Boolean(testDisabledReason)}
                    >
                      Проверить подключение
                    </AppButton>
                  </div>
                </Tooltip>
                <Tooltip label={saveDisabledReason} disabled={!saveDisabledReason} withArrow>
                  <div style={{ display: 'inline-flex' }}>
                    <AppButton
                      type="submit"
                      loading={saveMutation.isPending}
                      disabled={!isVerifiedForCurrentForm}
                    >
                      Сохранить
                    </AppButton>
                  </div>
                </Tooltip>
              </Group>

              {lastTestResult ? (
                <Paper className="ai-provider-test-result" radius="md" p="sm">
                  <Stack gap={6}>
                    <Text fw={600} size="sm">
                      Подключение проверено
                    </Text>
                    <Text size="sm" c="dimmed">
                      {PROVIDER_LABEL[lastTestResult.provider]} · {lastTestResult.model} · {lastTestResult.latencyMs} мс
                    </Text>
                    {isDirty && !isVerifiedForCurrentForm ? (
                      <Text size="xs" c="dimmed">
                        После изменений снова нажмите «Проверить подключение».
                      </Text>
                    ) : null}
                  </Stack>
                </Paper>
              ) : null}

              {lastTestError ? (
                <Paper className="ai-provider-test-result ai-provider-test-result-error" radius="md" p="sm">
                  <Stack gap={2}>
                    <Text fw={600} size="sm">
                      Подключение не проверено
                    </Text>
                    <Text size="sm" c="dimmed">
                      {lastTestError}
                    </Text>
                  </Stack>
                </Paper>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      </form>

      <ConfirmActionModal
        opened={Boolean(deleteModelTarget)}
        title="Удалить модель из библиотеки?"
        message={
          deleteModelTarget
            ? `Удалить модель "${deleteModelTarget.modelName}" из списка сохранённых?`
            : ''
        }
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        loading={false}
        onClose={() => setDeleteModelTarget(null)}
        onConfirm={confirmDeleteModel}
      />
    </Stack>
  )
}
