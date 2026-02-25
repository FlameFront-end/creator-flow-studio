import { Paper, Stack, Text, Title } from '@ui/core'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppTabs } from '../../shared/components/AppTabs'
import { buildPromptStudioRoute, type PromptStudioWorkspaceRoute } from '../../shared/model/routes'
import { PersonasSection } from './components/PersonasSection'
import { PolicyRulesSection } from './components/PolicyRulesSection'
import { PromptPreviewSection } from './components/PromptPreviewSection'
import { PromptTemplatesSection } from './components/PromptTemplatesSection'

const DEFAULT_WORKSPACE: PromptStudioWorkspaceRoute = 'personas'

const isPromptStudioWorkspace = (value: string | undefined): value is PromptStudioWorkspaceRoute =>
  value === 'personas' || value === 'rules' || value === 'templates' || value === 'preview'

export function PromptStudioPage() {
  const navigate = useNavigate()
  const { workspace: workspaceParam } = useParams<{ workspace?: string }>()
  const workspace: PromptStudioWorkspaceRoute = isPromptStudioWorkspace(workspaceParam)
    ? workspaceParam
    : DEFAULT_WORKSPACE

  useEffect(() => {
    if (!isPromptStudioWorkspace(workspaceParam)) {
      navigate(buildPromptStudioRoute(DEFAULT_WORKSPACE), { replace: true })
    }
  }, [navigate, workspaceParam])

  const handleTabChange = (value: string | null) => {
    if (!value || !isPromptStudioWorkspace(value)) {
      return
    }
    navigate(buildPromptStudioRoute(value))
  }

  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>Системные настройки ИИ</Title>
        <Text size="sm" c="dimmed">
          Системный раздел для настройки персонажей, правил и шаблонов. Для повседневной работы используйте раздел «Идеи и сценарии».
        </Text>
        <AppTabs
          value={workspace}
          onChange={handleTabChange}
          className="studio-tabs"
          items={[
            { value: 'personas', label: 'Персонажи' },
            { value: 'rules', label: 'Правила' },
            { value: 'templates', label: 'Шаблоны' },
            { value: 'preview', label: 'Тест шаблона' },
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
        </AppTabs>
      </Stack>
    </Paper>
  )
}

