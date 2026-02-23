import { Code, Group, Paper, SimpleGrid, Text } from '@mantine/core'
import { IconBug, IconShieldLock } from '@tabler/icons-react'
import { isRouteErrorResponse } from 'react-router-dom'

type ErrorMetaProps = {
  pathname: string
  error: unknown
}

export const ErrorMeta = ({ pathname, error }: ErrorMetaProps) => {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
      <Paper className="inner-surface error-meta-card" radius="md" p="sm">
        <Group gap="xs" mb={6}>
          <IconShieldLock size={16} />
          <Text size="sm" fw={600}>Маршрут</Text>
        </Group>
        <Code>{pathname}</Code>
      </Paper>
      <Paper className="inner-surface error-meta-card" radius="md" p="sm">
        <Group gap="xs" mb={6}>
          <IconBug size={16} />
          <Text size="sm" fw={600}>Тип ошибки</Text>
        </Group>
        <Code>{isRouteErrorResponse(error) ? 'RouteErrorResponse' : 'RuntimeError'}</Code>
      </Paper>
    </SimpleGrid>
  )
}

