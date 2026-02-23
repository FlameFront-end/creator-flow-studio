import { Badge, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'

type ErrorHeaderProps = {
  message: string
  isModuleLoadError: boolean
}

export const ErrorHeader = ({ message, isModuleLoadError }: ErrorHeaderProps) => {
  return (
    <Group justify="space-between" align="flex-start" wrap="wrap">
      <Group align="flex-start" gap="md">
        <ThemeIcon radius="xl" size={48} variant="light" color="red">
          <IconAlertTriangle size={26} />
        </ThemeIcon>
        <Stack gap={6}>
          <Title order={1} className="error-page-title">
            Что-то пошло не так
          </Title>
          <Text c="dimmed" size="lg">{message}</Text>
        </Stack>
      </Group>
      <Badge color={isModuleLoadError ? 'orange' : 'red'} size="lg" variant="light">
        {isModuleLoadError ? 'Проблема загрузки модулей' : 'Ошибка интерфейса'}
      </Badge>
    </Group>
  )
}

