import {
  ActionIcon,
  Box,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core'
import { IconBook2, IconLogout2, IconMoonStars, IconSun } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../shared/model/routes'
import type { AdminView } from '../hooks/useDashboardView'

type DashboardHeroProps = {
  view: AdminView
  onViewChange: (nextView: AdminView) => void
  onLogout: () => void
}

export const DashboardHero = ({ view, onViewChange, onLogout }: DashboardHeroProps) => {
  const navigate = useNavigate()
  const { colorScheme, setColorScheme } = useMantineColorScheme()

  return (
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
            <Tooltip label={colorScheme === 'dark' ? 'Переключить на светлую' : 'Переключить на темную'}>
              <ActionIcon
                variant="light"
                color="cyan"
                radius="xl"
                onClick={() => setColorScheme(colorScheme === 'dark' ? 'light' : 'dark')}
              >
                {colorScheme === 'dark' ? <IconSun size={18} /> : <IconMoonStars size={18} />}
              </ActionIcon>
            </Tooltip>
            <Button leftSection={<IconBook2 size={16} />} variant="default" onClick={() => navigate(ROUTES.ABOUT)}>
              Инструкция
            </Button>
            <Button leftSection={<IconLogout2 size={16} />} variant="light" color="red" onClick={onLogout}>
              Выйти
            </Button>
          </Group>
        </Group>

        <Box className="dashboard-hero-switch-wrap">
          <SegmentedControl
            className="main-switch dashboard-hero-switch"
            value={view}
            onChange={(value) => onViewChange(value as AdminView)}
            data={[
              { label: 'Проекты', value: 'projects' },
              { label: 'Промпт-студия', value: 'prompt-studio' },
              { label: 'Идеи и сценарии', value: 'ideas-lab' },
            ]}
          />
        </Box>
      </Stack>
    </Paper>
  )
}

