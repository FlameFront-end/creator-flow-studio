import { Group, Stack, Text, ThemeIcon, Title } from '@ui/core'

import { AppBadge } from '../../../shared/components/AppBadge'
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
      <AppBadge color={isModuleLoadError ? 'orange' : 'red'} size="lg" variant="light">
        {isModuleLoadError ? 'Проблема загрузки модулей' : 'Ошибка интерфейса'}
      </AppBadge>
    </Group>
  )
}


