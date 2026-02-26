import { Group, Paper, Stack, Text, ThemeIcon, Title } from '@ui/core'
import { useNavigate } from 'react-router-dom'
import { AppButton } from '../../../shared/components/AppButton'
import { aboutIcons, lmStudioGuide } from '../model/about.content'

export const LmStudioGuideSection = () => {
  const LmStudioIcon = aboutIcons.lmStudio
  const navigate = useNavigate()

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="md">
        <Group gap="xs">
          <ThemeIcon variant="light" color="cyan" radius="xl">
            <LmStudioIcon size={16} />
          </ThemeIcon>
          <Title order={4}>{lmStudioGuide.title}</Title>
        </Group>

        <Text size="sm" c="dimmed">
          {lmStudioGuide.description}
        </Text>

        <Stack gap={4}>
          {lmStudioGuide.steps.map((step, index) => (
            <Text key={step} size="sm" c="dimmed">
              {index + 1}. {step}
            </Text>
          ))}
        </Stack>

        <Group>
          <AppButton size="xs" variant="subtle" onClick={() => navigate(lmStudioGuide.appRoute)}>
            {lmStudioGuide.appLabel}
          </AppButton>
          <Text
            size="sm"
            c="dimmed"
            component="a"
            href={lmStudioGuide.docsUrl}
            target="_blank"
            rel="noreferrer"
            style={{ textDecoration: 'underline' }}
          >
            {lmStudioGuide.docsLabel}
          </Text>
        </Group>
      </Stack>
    </Paper>
  )
}
