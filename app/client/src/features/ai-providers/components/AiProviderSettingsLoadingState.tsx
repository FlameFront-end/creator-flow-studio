import { Group, Paper, Stack, Text } from '@ui/core'
import { Spinner } from '../../../shared/components/ui/spinner'

export function AiProviderSettingsLoadingState() {
  return (
    <Stack gap="sm" className="ai-provider-settings">
      <Paper className="inner-surface ai-provider-loading" radius="md" p="md">
        <Group align="center" gap="sm">
          <Spinner className="h-5 w-5" />
          <Stack gap={2}>
            <Text fw={600}>Загрузка настроек ИИ</Text>
            <Text size="sm" c="dimmed">
              Подтягиваем активную модель и библиотеку профилей.
            </Text>
          </Stack>
        </Group>
        <div className="ai-provider-loading-grid" aria-hidden>
          <div className="ai-provider-loading-line ai-provider-loading-line-wide" />
          <div className="ai-provider-loading-line" />
          <div className="ai-provider-loading-line ai-provider-loading-line-short" />
        </div>
      </Paper>
    </Stack>
  )
}
