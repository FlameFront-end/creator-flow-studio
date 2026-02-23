import { Badge, Group, Paper, Stack, Text, ThemeIcon, Title } from '@mantine/core'
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
          <Group key={item.title} gap="xs" wrap="wrap">
            <Badge color={item.color} variant="light">{item.title}</Badge>
            <Text size="sm" c="dimmed">{item.description}</Text>
          </Group>
        ))}
      </Stack>
    </Paper>
  )
}

