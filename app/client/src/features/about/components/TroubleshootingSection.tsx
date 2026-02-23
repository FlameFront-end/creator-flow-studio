import { Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { aboutIcons, troubleshootingSteps } from '../model/about.content'

export const TroubleshootingSection = () => {
  const TroubleshootingIcon = aboutIcons.troubleshooting

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
      </Stack>
    </Paper>
  )
}

