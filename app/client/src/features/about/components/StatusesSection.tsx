import { Group, Paper, Stack, Text, ThemeIcon, Title } from '@ui/core'

import { AppBadge } from '../../../shared/components/AppBadge'
import { aboutIcons, statusItems } from '../model/about.content'

export const StatusesSection = () => {
  const StatusesIcon = aboutIcons.statuses

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon variant="light" color="teal" radius="xl">
            <StatusesIcon size={16} />
          </ThemeIcon>
          <Title order={4}>Статусы задач</Title>
        </Group>
        {statusItems.map((item) => (
          <Stack key={item.title} gap={4}>
            <Group gap="xs" wrap="wrap">
              <AppBadge color={item.color} variant="light">{item.title}</AppBadge>
              <Text size="sm" c="dimmed">{item.description}</Text>
            </Group>
            <Text size="sm">
              Что делать: <Text span c="dimmed">{item.action}</Text>
            </Text>
          </Stack>
        ))}
      </Stack>
    </Paper>
  )
}

