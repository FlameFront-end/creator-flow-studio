import { Paper, Stack, Text, Title } from '@ui/core'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppTabs } from '../../../shared/components/AppTabs'
import { buildPromptStudioRoute, type PromptStudioWorkspaceRoute } from '../../../shared/model/routes'
import { AiProviderSettingsSection } from '../components/AiProviderSettingsSection'
import {
  AI_MODELS_BY_PROVIDER_UPDATED_EVENT,
  readPersistedModelsByProvider,
} from '../model/aiProviderSettings.storage'
import { PersonasSection } from '../components/PersonasSection'
import { PolicyRulesSection } from '../components/PolicyRulesSection'
import { PromptPreviewSection } from '../components/PromptPreviewSection'
import { PromptTemplatesSection } from '../components/PromptTemplatesSection'

const DEFAULT_WORKSPACE: PromptStudioWorkspaceRoute = 'personas'

const isPromptStudioWorkspace = (value: string | undefined): value is PromptStudioWorkspaceRoute =>
  value === 'personas' ||
  value === 'rules' ||
  value === 'templates' ||
  value === 'preview' ||
  value === 'providers'

export function PromptStudioPage() {
  const navigate = useNavigate()
  const { workspace: workspaceParam } = useParams<{ workspace?: string }>()
  const workspace: PromptStudioWorkspaceRoute = isPromptStudioWorkspace(workspaceParam)
    ? workspaceParam
    : DEFAULT_WORKSPACE
  const [modelsRevision, setModelsRevision] = useState(0)

  useEffect(() => {
    if (!isPromptStudioWorkspace(workspaceParam)) {
      navigate(buildPromptStudioRoute(DEFAULT_WORKSPACE), { replace: true })
    }
  }, [navigate, workspaceParam])

  useEffect(() => {
    const handleModelsUpdated = () => setModelsRevision((value) => value + 1)
    window.addEventListener(AI_MODELS_BY_PROVIDER_UPDATED_EVENT, handleModelsUpdated)
    window.addEventListener('storage', handleModelsUpdated)
    return () => {
      window.removeEventListener(AI_MODELS_BY_PROVIDER_UPDATED_EVENT, handleModelsUpdated)
      window.removeEventListener('storage', handleModelsUpdated)
    }
  }, [])

  const hasSavedModels = useMemo(() => {
    const models = readPersistedModelsByProvider()
    return (
      (models.openai?.length ?? 0) > 0 ||
      (models.openrouter?.length ?? 0) > 0 ||
      (models['openai-compatible']?.length ?? 0) > 0
    )
  }, [modelsRevision])

  const handleTabChange = (value: string | null) => {
    if (!value || !isPromptStudioWorkspace(value)) {
      return
    }
    navigate(buildPromptStudioRoute(value))
  }

  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>Настройка ИИ</Title>
        <Text size="sm" c="dimmed">
          Здесь вы задаете базовый контекст модели: персонажей, ограничения и промпты. Основная генерация контента - в разделе «Идеи и сценарии».
        </Text>
        <AppTabs
          value={workspace}
          onChange={handleTabChange}
          className="studio-tabs"
          items={[
            { value: 'personas', label: 'Персонажи' },
            { value: 'rules', label: 'Ограничения' },
            { value: 'templates', label: 'Промпты' },
            { value: 'preview', label: 'Превью' },
            {
              value: 'providers',
              label: 'Модели',
              rightSection: !hasSavedModels ? (
                <span
                  className="studio-tab-alert-dot"
                  aria-label="Нет сохранённых моделей"
                  title="Нет сохранённых моделей"
                />
              ) : undefined,
            },
          ]}
        >
          <AppTabs.Panel value="personas" pt="md">
            <PersonasSection />
          </AppTabs.Panel>

          <AppTabs.Panel value="rules" pt="md">
            <PolicyRulesSection />
          </AppTabs.Panel>

          <AppTabs.Panel value="templates" pt="md">
            <PromptTemplatesSection />
          </AppTabs.Panel>

          <AppTabs.Panel value="preview" pt="md">
            <PromptPreviewSection />
          </AppTabs.Panel>

          <AppTabs.Panel value="providers" pt="md">
            <AiProviderSettingsSection />
          </AppTabs.Panel>
        </AppTabs>
      </Stack>
    </Paper>
  )
}

