import { Divider, Group, NumberInput, Paper, Select, SimpleGrid, Stack, Text, TextInput, Title, Tooltip } from '@ui/core'
import type { Dispatch, FormEvent, SetStateAction } from 'react'
import type { AiProvider, TestAiSettingsResponse } from '../../../shared/api/services/aiSettings.api'
import { AppButton } from '../../../shared/components/AppButton'
import {
  type AiProviderFormField,
  DEFAULT_LM_STUDIO_BASE_URL,
  maskedApiKeyInputStyle,
  normalizeOpenAiCompatibleBaseUrl,
  PROVIDER_LABEL,
  type FormState,
} from '../model/aiProviderSettingsSection.model'

type AiProviderConnectionFormCardProps = {
  form: FormState
  setForm: Dispatch<SetStateAction<FormState | null>>
  isApiKeyReadonly: boolean
  setIsApiKeyReadonly: (value: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTestConnection: () => void
  testPending: boolean
  savePending: boolean
  isVerifiedForCurrentForm: boolean
  testDisabledReason: string
  saveDisabledReason: string
  lastTestResult: TestAiSettingsResponse | null
  lastTestError: string | null
  isDirty: boolean
  fieldErrors: Partial<Record<AiProviderFormField, string>>
  verificationError: string | null
  clearFieldError: (field: AiProviderFormField) => void
  clearVerificationError: () => void
}

export function AiProviderConnectionFormCard({
  form,
  setForm,
  isApiKeyReadonly,
  setIsApiKeyReadonly,
  onSubmit,
  onTestConnection,
  testPending,
  savePending,
  isVerifiedForCurrentForm,
  testDisabledReason,
  saveDisabledReason,
  lastTestResult,
  lastTestError,
  isDirty,
  fieldErrors,
  verificationError,
  clearFieldError,
  clearVerificationError,
}: AiProviderConnectionFormCardProps) {
  const maxTokensError = fieldErrors.maxTokens ?? null
  const baseUrlError = form.provider === 'openai-compatible' ? fieldErrors.baseUrl ?? null : null

  return (
    <form onSubmit={onSubmit} noValidate autoComplete="off">
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
                        baseUrl: prev.baseUrl,
                        apiKey: value === 'openai-compatible' ? '' : prev.apiKey,
                      }
                    : prev,
                )
                clearFieldError('apiKey')
                clearFieldError('baseUrl')
                clearVerificationError()
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
                if (nextValue.trim()) {
                  clearFieldError('model')
                }
                clearVerificationError()
              }}
              required
              maxLength={255}
              error={fieldErrors.model}
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
                clearVerificationError()
              }}
              required
            />

            <Stack gap={0}>
              <Group align="flex-end" gap="xs" wrap="nowrap" className="ai-provider-inline-field-action">
                <NumberInput
                  label="Максимум токенов"
                  value={form.maxTokens}
                  onChange={(value) => {
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            maxTokens: typeof value === 'number' ? value : '',
                          }
                        : prev,
                    )
                    if (
                      typeof value === 'number' &&
                      !Number.isNaN(value) &&
                      value >= 128 &&
                      value <= 8000
                    ) {
                      clearFieldError('maxTokens')
                    }
                    clearVerificationError()
                  }}
                  onBlur={() => {
                    if (
                      typeof form.maxTokens === 'number' &&
                      !Number.isNaN(form.maxTokens) &&
                      form.maxTokens >= 128 &&
                      form.maxTokens <= 8000
                    ) {
                      clearFieldError('maxTokens')
                    }
                  }}
                  min={128}
                  max={8000}
                  required
                  style={{ flex: 1 }}
                  error={Boolean(maxTokensError)}
                />
                <AppButton
                  type="button"
                  size="sm"
                  buttonVariant="muted"
                  className="ai-provider-recommend-btn"
                  onClick={() => {
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            maxTokens: 1200,
                          }
                        : prev,
                    )
                    clearFieldError('maxTokens')
                    clearVerificationError()
                  }}
                >
                  Подставить
                </AppButton>
              </Group>
              {maxTokensError ? (
                <div className="appui-Input-error" style={{ marginTop: '6px', fontSize: '0.82rem', color: '#ef4444' }}>
                  {maxTokensError}
                </div>
              ) : null}
            </Stack>
          </SimpleGrid>

          {form.provider === 'openai-compatible' ? (
            <>
              <Group align="flex-end" gap="xs" wrap="nowrap" className="ai-provider-inline-field-action">
                <TextInput
                  label="Базовый URL"
                  value={form.baseUrl}
                  autoComplete="off"
                  onChange={(event) => {
                    const nextValue = event.currentTarget.value
                    setForm((prev) => (prev ? { ...prev, baseUrl: nextValue } : prev))
                    if (nextValue.trim()) {
                      clearFieldError('baseUrl')
                    }
                    clearVerificationError()
                  }}
                  onBlur={(event) => {
                    const normalized = normalizeOpenAiCompatibleBaseUrl(event.currentTarget.value)
                    if (!normalized) {
                      return
                    }
                    setForm((prev) => (prev ? { ...prev, baseUrl: normalized } : prev))
                    clearFieldError('baseUrl')
                  }}
                  placeholder="http://127.0.0.1:1234"
                  required
                  maxLength={500}
                  style={{ flex: 1 }}
                  error={Boolean(baseUrlError)}
                />
                <AppButton
                  type="button"
                  size="sm"
                  buttonVariant="muted"
                  className="ai-provider-recommend-btn"
                  onClick={() => {
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            baseUrl: DEFAULT_LM_STUDIO_BASE_URL,
                          }
                        : prev,
                    )
                    clearFieldError('baseUrl')
                    clearVerificationError()
                  }}
                >
                  Подставить
                </AppButton>
              </Group>
              {baseUrlError ? (
                <div className="appui-Input-error" style={{ marginTop: '6px', fontSize: '0.82rem', color: '#ef4444' }}>
                  {baseUrlError}
                </div>
              ) : null}
            </>
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
                if (nextValue.trim()) {
                  clearFieldError('apiKey')
                }
                clearVerificationError()
              }}
              placeholder="Введите API ключ"
              maxLength={512}
              style={maskedApiKeyInputStyle}
              error={fieldErrors.apiKey}
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
                  loading={testPending}
                  disabled={savePending || Boolean(testDisabledReason)}
                >
                  Проверить подключение
                </AppButton>
              </div>
            </Tooltip>
            <Tooltip label={saveDisabledReason} disabled={!saveDisabledReason} withArrow>
              <div style={{ display: 'inline-flex' }}>
                <AppButton
                  type="submit"
                  loading={savePending}
                  disabled={!isVerifiedForCurrentForm}
                >
                  Сохранить
                </AppButton>
              </div>
            </Tooltip>
          </Group>

          {verificationError ? (
            <Text size="sm" c="red">
              {verificationError}
            </Text>
          ) : null}

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
    </form>
  )
}
