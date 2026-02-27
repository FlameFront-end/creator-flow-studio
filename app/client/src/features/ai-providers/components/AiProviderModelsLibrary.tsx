import { Group, Paper, Stack, Text, Title } from '@ui/core'
import type { AiProvider, AiSettings } from '../../../shared/api/services/aiSettings.api'
import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import type { PersistedModelsByProvider } from '../model/aiProviderSettings.storage'
import {
  formatModelsCount,
  PROVIDER_LABEL,
  resolveActiveProfile,
  type FormState,
} from '../model/aiProviderSettingsSection.model'

type AiProviderModelsLibraryProps = {
  modelsByProvider: PersistedModelsByProvider
  form: FormState
  settings: AiSettings
  onDeleteModel: (provider: AiProvider, modelName: string) => void
}

export function AiProviderModelsLibrary({
  modelsByProvider,
  form,
  settings,
  onDeleteModel,
}: AiProviderModelsLibraryProps) {
  const hasAnySavedModels =
    (modelsByProvider.openai?.length ?? 0) > 0 ||
    (modelsByProvider.openrouter?.length ?? 0) > 0 ||
    (modelsByProvider['openai-compatible']?.length ?? 0) > 0
  const activeProfile = resolveActiveProfile(settings)

  return (
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
                      const isSelected =
                        form.provider === providerKey &&
                        form.model.trim() === modelName
                      const isActiveProfile =
                        activeProfile?.provider === providerKey &&
                        activeProfile.model === modelName

                      return (
                        <Group key={`${providerKey}:${modelName}`} className="ai-provider-model-row" gap={8}>
                          <AppButton
                            type="button"
                            size="xs"
                            variant={isSelected || isActiveProfile ? 'filled' : 'default'}
                            className="ai-provider-model-select-btn"
                          >
                            {modelName}
                          </AppButton>
                          <AppButton
                            type="button"
                            size="xs"
                            variant="subtle"
                            color="red"
                            onClick={() => onDeleteModel(providerKey, modelName)}
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
  )
}
