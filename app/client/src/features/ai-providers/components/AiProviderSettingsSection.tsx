import { Stack } from '@ui/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  aiSettingsApi,
  type AiProvider,
  type TestAiSettingsResponse,
} from '../../../shared/api/services/aiSettings.api'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast } from '../../../shared/lib/toast'
import { useFormErrors } from '../../../shared/lib/useFormErrors'
import { ROUTES } from '../../../shared/model/routes'
import {
  mergePersistedModelsByProvider,
  readPersistedModelsByProvider,
  removePersistedProviderModel,
  upsertPersistedProviderModel,
} from '../model/aiProviderSettings.storage'
import { AI_SETTINGS_QUERY_KEY } from '../model/aiProviders.queryKeys'
import { AiProviderConnectionFormCard } from './AiProviderConnectionFormCard'
import { AiProviderModelsLibrary } from './AiProviderModelsLibrary'
import { AiProviderSettingsHero } from './AiProviderSettingsHero'
import { AiProviderSettingsLoadingState } from './AiProviderSettingsLoadingState'
import {
  buildFormState,
  buildVerificationSignature,
  mapSavedModelsByProvider,
  normalizeForCompare,
  normalizeOpenAiCompatibleBaseUrl,
  resolveActiveProfile,
  type AiProviderFormField,
  type FormState,
} from '../model/aiProviderSettingsSection.model'

export function AiProviderSettingsSection() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState | null>(null)
  const [baseline, setBaseline] = useState<FormState | null>(null)
  const [lastTestResult, setLastTestResult] = useState<TestAiSettingsResponse | null>(null)
  const [lastTestError, setLastTestError] = useState<string | null>(null)
  const [lastVerifiedSignature, setLastVerifiedSignature] = useState<string | null>(null)
  const [pendingTestSignature, setPendingTestSignature] = useState<string | null>(null)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [isApiKeyReadonly, setIsApiKeyReadonly] = useState(true)
  const [deleteModelTarget, setDeleteModelTarget] = useState<{
    provider: AiProvider
    modelName: string
  } | null>(null)
  const [modelsByProvider, setModelsByProvider] = useState(() =>
    readPersistedModelsByProvider(),
  )
  const {
    errors: fieldErrors,
    setErrors: setFieldErrors,
    clearError: clearFieldError,
    clearAll: clearFieldErrors,
  } = useFormErrors<AiProviderFormField>()

  const settingsQuery = useQuery({
    queryKey: AI_SETTINGS_QUERY_KEY,
    queryFn: aiSettingsApi.getAiSettings,
  })

  useEffect(() => {
    if (!settingsQuery.data) {
      return
    }

    setModelsByProvider(
      mergePersistedModelsByProvider(mapSavedModelsByProvider(settingsQuery.data)),
    )

    const nextState = buildFormState(settingsQuery.data)
    setForm(nextState)
    setBaseline(nextState)
    setLastVerifiedSignature(null)
    setPendingTestSignature(null)
    setVerificationError(null)
    clearFieldErrors()
  }, [clearFieldErrors, settingsQuery.data])

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
      setVerificationError(null)
      clearFieldErrors()
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
      setVerificationError(null)
      showSuccessToast('Подключение успешно проверено')
    },
    onError: (error) => {
      setLastTestResult(null)
      const fallback = 'Проверка подключения не выполнена'
      setLastTestError(getErrorMessage(error, fallback))
    },
  })

  const removeModelMutation = useMutation({
    mutationFn: aiSettingsApi.removeSavedModel,
    onSuccess: async (_, variables) => {
      setModelsByProvider(
        removePersistedProviderModel(variables.provider, variables.model),
      )
      await refresh()
      setDeleteModelTarget(null)
      showSuccessToast('Модель удалена из библиотеки')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось удалить модель из библиотеки')
    },
  })

  const validate = (state: FormState): boolean => {
    const nextErrors: Partial<Record<AiProviderFormField, string>> = {}

    if (!state.model.trim()) {
      nextErrors.model = 'Укажите модель'
    }

    if (state.provider !== 'openai-compatible' && !state.apiKey.trim()) {
      nextErrors.apiKey = 'Укажите API key'
    }

    if (state.provider === 'openai-compatible' && !state.baseUrl.trim()) {
      nextErrors.baseUrl = 'Укажите базовый URL'
    }

    if (typeof state.maxTokens !== 'number' || Number.isNaN(state.maxTokens)) {
      nextErrors.maxTokens = 'Укажите максимум токенов'
    } else if (state.maxTokens < 128 || state.maxTokens > 8000) {
      nextErrors.maxTokens = 'Максимум токенов должен быть в диапазоне 128..8000'
    }

    setFieldErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
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
      setVerificationError('Сначала проверьте подключение с текущими параметрами')
      return
    }
    setVerificationError(null)
    saveMutation.mutate(buildSavePayload(form))
  }

  const onTestConnection = () => {
    if (!form) {
      return
    }
    if (!validate(form)) {
      return
    }
    setVerificationError(null)
    setLastTestError(null)
    setPendingTestSignature(buildVerificationSignature(form))
    testMutation.mutate(buildTestPayload(form))
  }

  const confirmDeleteModel = () => {
    if (!deleteModelTarget) {
      return
    }
    removeModelMutation.mutate({
      provider: deleteModelTarget.provider,
      model: deleteModelTarget.modelName,
    })
  }

  const onDeleteModel = (provider: AiProvider, modelName: string) => {
    setDeleteModelTarget({
      provider,
      modelName,
    })
  }

  if (settingsQuery.isError) {
    return (
      <AppInlineErrorAlert>
        {getErrorMessage(settingsQuery.error, 'Не удалось загрузить настройки ИИ')}
      </AppInlineErrorAlert>
    )
  }

  if (!form || settingsQuery.isLoading || !settingsQuery.data) {
    return <AiProviderSettingsLoadingState />
  }

  const isVerifiedForCurrentForm =
    lastVerifiedSignature !== null &&
    lastVerifiedSignature === buildVerificationSignature(form)
  const activeProfile = settingsQuery.data ? resolveActiveProfile(settingsQuery.data) : null
  const testDisabledReason = ''
  const saveDisabledReason = !isVerifiedForCurrentForm
    ? 'Сначала нажмите «Проверить подключение»'
    : ''

  return (
    <Stack gap="md" className="ai-provider-settings">
      <AiProviderSettingsHero
        activeProvider={activeProfile?.provider ?? form.provider}
        onOpenGuide={() => navigate(ROUTES.ABOUT)}
      />

      <Stack gap="sm">
        <AiProviderModelsLibrary
          modelsByProvider={modelsByProvider}
          form={form}
          settings={settingsQuery.data}
          onDeleteModel={onDeleteModel}
        />
        <AiProviderConnectionFormCard
          form={form}
          setForm={setForm}
          isApiKeyReadonly={isApiKeyReadonly}
          setIsApiKeyReadonly={setIsApiKeyReadonly}
          onSubmit={onSubmit}
          onTestConnection={onTestConnection}
          testPending={testMutation.isPending}
          savePending={saveMutation.isPending}
          isVerifiedForCurrentForm={isVerifiedForCurrentForm}
          testDisabledReason={testDisabledReason}
          saveDisabledReason={saveDisabledReason}
          lastTestResult={lastTestResult}
          lastTestError={lastTestError}
          isDirty={isDirty}
          fieldErrors={fieldErrors}
          verificationError={verificationError}
          clearFieldError={clearFieldError}
          clearVerificationError={() => setVerificationError(null)}
        />
      </Stack>

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
        loading={removeModelMutation.isPending}
        onClose={() => setDeleteModelTarget(null)}
        onConfirm={confirmDeleteModel}
      />
    </Stack>
  )
}
