import { Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@ui/core'

import { AppButton } from '../../../shared/components/AppButton'
import { useNavigate } from 'react-router-dom'
import { aboutIcons, quickStartSteps } from '../model/about.content'

export const QuickStartSection = () => {
  const QuickStartIcon = aboutIcons.quickStart
  const navigate = useNavigate()

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="lg">
        <Group gap="xs">
          <ThemeIcon variant="light" color="cyan" radius="xl">
            <QuickStartIcon size={16} />
          </ThemeIcon>
          <Title order={4}>Быстрый старт</Title>
        </Group>
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
          {quickStartSteps.map((step) => (
            <Paper key={step.title} className="inner-surface about-step-card" radius="md" p="md">
              <Stack gap="xs">
                <ThemeIcon variant="light" color="cyan" radius="xl" size={34}>
                  <step.icon size={18} />
                </ThemeIcon>
                <Text fw={700}>{step.title}</Text>
                <Text size="sm" c="dimmed">{step.description}</Text>
                <AppButton
                  size="xs"
                  variant="subtle"
                  w="fit-content"
                  leftSection={<step.icon size={14} />}
                  onClick={() => navigate(step.route)}
                >
                  {step.actionLabel}
                </AppButton>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>

      </Stack>
    </Paper>
  )
}




