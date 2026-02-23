import {
  ActionIcon,
  Box,
  Button,
  Container,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core'
import { useQueryClient } from '@tanstack/react-query'
import { IconBook2, IconLogout2, IconMoonStars, IconSun } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearAuthToken } from '../../../shared/lib/auth'
import { ROUTES } from '../../../shared/model/routes'
import { IdeasLabPage } from '../../ideas-lab/IdeasLabPage'
import { PromptStudioPage } from '../../prompt-studio/PromptStudioPage'
import { ProjectsPage } from '../../projects/ProjectsPage'

type AdminView = 'projects' | 'prompt-studio' | 'ideas-lab'
const DASHBOARD_VIEW_STORAGE_KEY = 'dashboard_admin_view'

const isAdminView = (value: string | null): value is AdminView =>
  value === 'projects' || value === 'prompt-studio' || value === 'ideas-lab'

const DashboardPage = () => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { colorScheme, setColorScheme } = useMantineColorScheme()
  const [view, setView] = useState<AdminView>(() => {
    if (typeof window === 'undefined') {
      return 'projects'
    }

    const saved = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY)
    return isAdminView(saved) ? saved : 'projects'
  })

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, view)
  }, [view])

  return (
    <Box mih="100vh" py={36}>
      <Container size="xl" className="app-page-container">
        <Stack gap="lg">
          <Paper className="hero-surface" radius={28} p="xl">
            <Stack gap="lg" className="dashboard-hero">
              <Group justify="space-between" align="start" className="dashboard-hero-top">
                <Stack gap={8} className="dashboard-hero-copy">
                  <Title order={2} className="dashboard-hero-title">
                    Панель управления контентом
                  </Title>
                  <Text c="dimmed" className="dashboard-hero-subtitle">
                    Проекты, промпт-студия и генерация идей в одном месте
                  </Text>
                </Stack>

                <Group gap="sm" className="dashboard-hero-actions">
                  <Tooltip label={colorScheme === 'dark' ? 'Переключить на светлую' : 'Переключить на тёмную'}>
                    <ActionIcon
                      variant="light"
                      color="cyan"
                      radius="xl"
                      onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
                    >
                      {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
                    </ActionIcon>
                  </Tooltip>
                  <Button
                    leftSection={<IconBook2 size={16} />}
                    variant="default"
                    onClick={() => navigate(ROUTES.ABOUT)}
                  >
                    Инструкция
                  </Button>
                  <Button
                    leftSection={<IconLogout2 size={16} />}
                    variant="light"
                    color="red"
                    onClick={() => {
                      clearAuthToken()
                      queryClient.clear()
                    }}
                  >
                    Выйти
                  </Button>
                </Group>
              </Group>

              <Box className="dashboard-hero-switch-wrap">
                <SegmentedControl
                  className="main-switch dashboard-hero-switch"
                  value={view}
                  onChange={(value) => {
                    if (isAdminView(value)) {
                      setView(value)
                    }
                  }}
                  data={[
                    { label: 'Проекты', value: 'projects' },
                    { label: 'Промпт-студия', value: 'prompt-studio' },
                    { label: 'Идеи и сценарии', value: 'ideas-lab' },
                  ]}
                />
              </Box>
            </Stack>
          </Paper>

          {view === 'projects' ? <ProjectsPage /> : null}
          {view === 'prompt-studio' ? <PromptStudioPage /> : null}
          {view === 'ideas-lab' ? <IdeasLabPage /> : null}
        </Stack>
      </Container>
    </Box>
  )
}

export default DashboardPage
