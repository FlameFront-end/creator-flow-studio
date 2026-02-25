import { Group, Paper, Stack, Text, ThemeIcon, Title } from '@ui/core'

import { AppButton } from '../../../shared/components/AppButton'
import { useNavigate } from 'react-router-dom'
import { buildIdeasLabRoute } from '../../../shared/model/routes'
import { aboutIcons, troubleshootingSteps } from '../model/about.content'

export const TroubleshootingSection = () => {
  const TroubleshootingIcon = aboutIcons.troubleshooting
  const navigate = useNavigate()

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon variant="light" color="yellow" radius="xl">
            <TroubleshootingIcon size={16} />
          </ThemeIcon>
          <Title order={4}>Если что-то не работает</Title>
        </Group>
        {troubleshootingSteps.map((step, index) => (
          <Text key={step} size="sm" c="dimmed">
            {index + 1}. {step}
          </Text>
        ))}
        <Group gap="xs" wrap="wrap" pt={4}>
          <AppButton size="xs" variant="light" onClick={() => navigate(buildIdeasLabRoute('logs'))}>
            Открыть логи
          </AppButton>
          <AppButton size="xs" variant="default" onClick={() => navigate(buildIdeasLabRoute('ideas'))}>
            Открыть идеи и результаты
          </AppButton>
        </Group>
      </Stack>
    </Paper>
  )
}




