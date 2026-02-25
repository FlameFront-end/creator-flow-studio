import { Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@ui/core'

import { AppButton } from '../../../shared/components/AppButton'
import { useNavigate } from 'react-router-dom'
import { aboutIcons, scenarioPlaybooks } from '../model/about.content'

export const ScenariosSection = () => {
  const ScenariosIcon = aboutIcons.scenarios
  const navigate = useNavigate()

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="md">
        <Group gap="xs">
          <ThemeIcon variant="light" color="cyan" radius="xl">
            <ScenariosIcon size={16} />
          </ThemeIcon>
          <Title order={4}>Сценарии работы</Title>
        </Group>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="sm">
          {scenarioPlaybooks.map((scenario) => (
            <Paper key={scenario.title} className="inner-surface" radius="md" p="md">
              <Stack gap="xs">
                <Text fw={700}>{scenario.title}</Text>
                <Text size="sm" c="dimmed">
                  {scenario.description}
                </Text>
                {scenario.steps.map((step, index) => (
                  <Text key={step} size="sm" c="dimmed">
                    {index + 1}. {step}
                  </Text>
                ))}
                <AppButton
                  size="xs"
                  variant="subtle"
                  w="fit-content"
                  onClick={() => navigate(scenario.route)}
                >
                  {scenario.actionLabel}
                </AppButton>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  )
}




