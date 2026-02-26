import { Grid, Group, Paper, Stack, Text, ThemeIcon, Title } from '@ui/core'

import { AppBadge } from '../../../shared/components/AppBadge'
import { IconBulb, IconFileAnalytics, IconSparkles } from '@tabler/icons-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AppTabs } from '../../../shared/components/AppTabs'
import {
  buildIdeasLabRoute,
  isIdeasLabWorkspaceRoute,
  type IdeasLabWorkspaceRoute,
} from '../../../shared/model/routes'
import { AppButton } from '../../../shared/components/AppButton'
import { AiLogsPanel } from '../components/AiLogsPanel'
import { IdeaResultsPanel } from '../components/results/IdeaResultsPanel'
import { IdeasGenerationPanel } from '../components/IdeasGenerationPanel'
import { IdeasLabModals } from '../components/IdeasLabModals'
import { IdeasListPanel } from '../components/list/IdeasListPanel'
import { useIdeasLabController } from '../hooks/useIdeasLabController'

const workspaceSteps: {
  value: IdeasLabWorkspaceRoute
  label: string
  icon: typeof IconSparkles
}[] = [
  {
    value: 'brief',
    label: 'Бриф',
    icon: IconSparkles,
  },
  {
    value: 'ideas',
    label: 'Идеи и результаты',
    icon: IconBulb,
  },
  {
    value: 'logs',
    label: 'Логи',
    icon: IconFileAnalytics,
  },
]

export function IdeasLabPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { workspace: workspaceParam } = useParams<{ workspace?: string }>()
  const controller = useIdeasLabController()
  const workspace: IdeasLabWorkspaceRoute = isIdeasLabWorkspaceRoute(workspaceParam)
    ? workspaceParam
    : 'brief'

  const ideasCount = controller.ideasQuery.data?.length ?? 0
  const logsCount = controller.logsQuery.data?.length ?? 0
  const isPendingIdeasNavigation = searchParams.get('pendingIdeas') === '1'

  const buildWorkspaceRoute = useCallback(
    (nextWorkspace: IdeasLabWorkspaceRoute, options?: { pendingIdeas?: boolean }) => {
      const nextSearch = new URLSearchParams(searchParams)
      if (options?.pendingIdeas) {
        nextSearch.set('pendingIdeas', '1')
      } else {
        nextSearch.delete('pendingIdeas')
      }
      const query = nextSearch.toString()
      const base = buildIdeasLabRoute(nextWorkspace)
      return query ? `${base}?${query}` : base
    },
    [searchParams],
  )

  useEffect(() => {
    if (!isIdeasLabWorkspaceRoute(workspaceParam)) {
      navigate(buildIdeasLabRoute('brief'), { replace: true })
    }
  }, [workspaceParam, navigate])

  useEffect(() => {
    if (workspace !== 'ideas' || !isPendingIdeasNavigation || ideasCount === 0) {
      return
    }
    navigate(buildWorkspaceRoute('ideas'), { replace: true })
  }, [buildWorkspaceRoute, ideasCount, isPendingIdeasNavigation, navigate, workspace])

  useEffect(() => {
    if (!isPendingIdeasNavigation || controller.isWaitingForIdeas) {
      return
    }
    navigate(buildWorkspaceRoute(workspace), { replace: true })
  }, [buildWorkspaceRoute, controller.isWaitingForIdeas, isPendingIdeasNavigation, navigate, workspace])

  const workspaceHint = useMemo(() => {
    if (workspace === 'brief') {
      return 'Сформулируйте задачу: проект, персонаж, тема и количество идей.'
    }
    if (workspace === 'ideas') {
      return 'Список идей и результаты по выбранной идее находятся на одном экране.'
    }
    return 'История запусков ИИ и диагностика ошибок.'
  }, [workspace])

  return (
    <Stack gap="md" className="ideas-lab-page">
      <Paper className="panel-surface ideas-lab-hero" radius={24} p="lg">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start" className="ideas-lab-hero-top">
            <Stack gap={6}>
              <Group gap="sm">
                <ThemeIcon size={34} radius="xl" variant="light" color="cyan">
                  <IconSparkles size={18} />
                </ThemeIcon>
                <Title order={3} className="ideas-lab-title">
                  Лаборатория идей
                </Title>
              </Group>
              <Text size="sm" className="ideas-lab-subtitle">
                {workspaceHint}
              </Text>
            </Stack>

            <Group gap="xs" wrap="wrap" className="ideas-lab-badges">
              <AppBadge variant="light" className="ideas-lab-badge ideas-lab-badge-neutral">
                Идей: {ideasCount}
              </AppBadge>
              <AppBadge color="cyan" variant="light" className="ideas-lab-badge ideas-lab-badge-info">
                Логов: {logsCount}
              </AppBadge>
            </Group>
          </Group>

          <AppTabs
            value={workspace}
            onChange={(value) => {
              const nextWorkspace = value ?? undefined
              if (!isIdeasLabWorkspaceRoute(nextWorkspace)) {
                return
              }
              navigate(buildWorkspaceRoute(nextWorkspace))
            }}
            className="ideas-lab-tabs"
            listClassName="ideas-lab-tabs-list"
            tabClassName="ideas-lab-tabs-tab"
            items={workspaceSteps.map((step) => {
              const StepIcon = step.icon
              const isActive = workspace === step.value
              return {
                value: step.value,
                label: step.label,
                leftSection: (
                  <ThemeIcon size={20} radius="xl" variant={isActive ? 'filled' : 'light'} color={isActive ? 'cyan' : 'gray'}>
                    <StepIcon size={12} />
                  </ThemeIcon>
                ),
              }
            })}
          />
        </Stack>
      </Paper>

      <Stack gap="sm" className="ideas-lab-canvas">
        {workspace === 'brief' ? (
          <Stack gap="sm">
            <IdeasGenerationPanel
              controller={controller}
              onGenerationAccepted={() =>
                navigate(buildWorkspaceRoute('ideas', { pendingIdeas: true }))
              }
            />
            {ideasCount > 0 ? (
              <Group justify="flex-end">
                <AppButton buttonVariant="white" onClick={() => navigate(buildWorkspaceRoute('ideas'))}>
                  Перейти к идеям
                </AppButton>
              </Group>
            ) : null}
          </Stack>
        ) : null}

        {workspace === 'ideas' ? (
          <Grid gutter="sm" align="start">
            <Grid.Col span={{ base: 12, xl: 5 }}>
              <IdeasListPanel
                controller={controller}
                showPendingState={isPendingIdeasNavigation && controller.isWaitingForIdeas && ideasCount === 0}
              />
            </Grid.Col>
            <Grid.Col span={{ base: 12, xl: 7 }}>
              <IdeaResultsPanel controller={controller} />
            </Grid.Col>
          </Grid>
        ) : null}

        {workspace === 'logs' ? <AiLogsPanel controller={controller} /> : null}
      </Stack>

      <IdeasLabModals controller={controller} />
    </Stack>
  )
}


