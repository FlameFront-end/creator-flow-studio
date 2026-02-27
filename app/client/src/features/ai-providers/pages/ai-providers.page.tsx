import { Paper, Stack, Text, Title } from '@ui/core'
import { AiProviderSettingsSection } from '../components/AiProviderSettingsSection'

export function AiProvidersPage() {
  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>Модели AI</Title>
        <Text size="sm" c="dimmed">
          Глобальные настройки подключения моделей для всех проектов.
        </Text>
        <AiProviderSettingsSection />
      </Stack>
    </Paper>
  )
}
