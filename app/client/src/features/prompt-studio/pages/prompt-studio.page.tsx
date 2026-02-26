import { Group, Paper, Select, Stack, Text, Title } from '@ui/core'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppTabs } from '../../../shared/components/AppTabs'
import { buildPromptStudioRoute, type PromptStudioWorkspaceRoute } from '../../../shared/model/routes'
import { personasApi } from '../../../shared/api/services/personas.api'
import { projectsApi } from '../../../shared/api/services/projects.api'
import { PersonasSection } from '../components/PersonasSection'
import { PolicyRulesSection } from '../components/PolicyRulesSection'
import { PromptPreviewSection } from '../components/PromptPreviewSection'
import { PromptTemplatesSection } from '../components/PromptTemplatesSection'
import { PERSONAS_QUERY_KEY, PROJECTS_QUERY_KEY } from '../../ideas-lab/model/ideasLab.constants'

const DEFAULT_WORKSPACE: PromptStudioWorkspaceRoute = 'personas'

const isPromptStudioWorkspace = (value: string | undefined): value is PromptStudioWorkspaceRoute =>
  value === 'personas' ||
  value === 'rules' ||
  value === 'templates' ||
  value === 'preview'

export function PromptStudioPage() {
  const navigate = useNavigate()
  const { workspace: workspaceParam } = useParams<{ workspace?: string }>()
  const workspace: PromptStudioWorkspaceRoute = isPromptStudioWorkspace(workspaceParam)
    ? workspaceParam
    : DEFAULT_WORKSPACE
  const [projectId, setProjectId] = useState<string | null>(null)
  const [personaId, setPersonaId] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: projectsApi.getProjects,
  })
  const activeProjectId = useMemo(
    () => projectId ?? projectsQuery.data?.[0]?.id ?? null,
    [projectId, projectsQuery.data],
  )

  const personasQuery = useQuery({
    queryKey: [...PERSONAS_QUERY_KEY, activeProjectId],
    queryFn: () => personasApi.getPersonas(activeProjectId ?? undefined),
    enabled: Boolean(activeProjectId),
  })

  useEffect(() => {
    if (!isPromptStudioWorkspace(workspaceParam)) {
      navigate(buildPromptStudioRoute(DEFAULT_WORKSPACE), { replace: true })
    }
  }, [navigate, workspaceParam])

  const activePersonaId = useMemo(() => {
    const personas = personasQuery.data ?? []
    if (!personas.length) {
      return null
    }
    if (personaId && personas.some((item) => item.id === personaId)) {
      return personaId
    }
    return personas[0].id
  }, [personaId, personasQuery.data])
  const requiresPersonaContext = workspace !== 'personas'

  const handleTabChange = (value: string | null) => {
    if (!value || !isPromptStudioWorkspace(value)) {
      return
    }
    navigate(buildPromptStudioRoute(value))
  }

  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>База генерации</Title>
        <Text size="sm" c="dimmed">
          Здесь настраиваются персонажи, ограничения и шаблоны для генерации. Запуск генерации контента - в разделе «Идеи и сценарии».
        </Text>
        <Paper className="inner-surface" radius="md" p="md">
          <Stack gap="xs">
            <Title order={5}>Контекст настройки</Title>
            <Text size="sm" c="dimmed">
              {requiresPersonaContext
                ? 'Выберите проект и персонажа. Текущая вкладка работает в выбранном контексте.'
                : 'Выберите проект для управления персонажами.'}
            </Text>
            <Group gap="md" align="flex-end">
              <div
                style={
                  requiresPersonaContext
                    ? { flex: 1, minWidth: '240px' }
                    : { width: '50%', minWidth: '240px' }
                }
              >
                <Select
                  label="Проект"
                  value={activeProjectId}
                  data={(projectsQuery.data ?? []).map((project) => ({
                    value: project.id,
                    label: project.name,
                  }))}
                  onChange={(value) => {
                    setProjectId(value)
                    setPersonaId(null)
                  }}
                  placeholder="Выберите проект"
                  searchable
                />
              </div>
              {requiresPersonaContext ? (
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <Select
                    label="Персонаж"
                    value={activePersonaId}
                    data={(personasQuery.data ?? []).map((persona) => ({
                      value: persona.id,
                      label: persona.name,
                    }))}
                    onChange={setPersonaId}
                    placeholder={activeProjectId ? 'Выберите персонажа' : 'Сначала выберите проект'}
                    disabled={!activeProjectId}
                    searchable
                  />
                </div>
              ) : null}
            </Group>
          </Stack>
        </Paper>
        <AppTabs
          value={workspace}
          onChange={handleTabChange}
          className="studio-tabs"
          items={[
            { value: 'personas', label: 'Персонажи' },
            { value: 'rules', label: 'Ограничения' },
            { value: 'templates', label: 'Промпты' },
            { value: 'preview', label: 'Превью' },
          ]}
        >
          <AppTabs.Panel value="personas" pt="md">
            <PersonasSection projectId={activeProjectId} />
          </AppTabs.Panel>

          <AppTabs.Panel value="rules" pt="md">
            <PolicyRulesSection personaId={activePersonaId} />
          </AppTabs.Panel>

          <AppTabs.Panel value="templates" pt="md">
            <PromptTemplatesSection personaId={activePersonaId} />
          </AppTabs.Panel>

          <AppTabs.Panel value="preview" pt="md">
            <PromptPreviewSection personaId={activePersonaId} />
          </AppTabs.Panel>
        </AppTabs>
      </Stack>
    </Paper>
  )
}

