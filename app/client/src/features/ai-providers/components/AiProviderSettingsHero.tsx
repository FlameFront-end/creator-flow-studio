import { Group, Paper, Stack, Text, Title } from '@ui/core'
import type { AiProvider } from '../../../shared/api/services/aiSettings.api'
import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { PROVIDER_LABEL } from '../model/aiProviderSettingsSection.model'

type AiProviderSettingsHeroProps = {
  activeProvider: AiProvider
  onOpenGuide: () => void
}

export function AiProviderSettingsHero({
  activeProvider,
  onOpenGuide,
}: AiProviderSettingsHeroProps) {
  return (
    <Paper className="inner-surface ai-provider-hero" radius="md" p="md">
      <Group justify="space-between" align="flex-start" gap="sm">
        <Stack gap={6}>
          <Title order={4}>Подключение AI-провайдера</Title>
          <Text size="sm" c="dimmed">
            Центр управления подключением моделей: OpenAI, OpenRouter или локальный LM Studio.
          </Text>
          <Group gap={8}>
            <AppBadge badgeVariant="info">
              Активный провайдер: {PROVIDER_LABEL[activeProvider]}
            </AppBadge>
          </Group>
        </Stack>
        <AppButton size="xs" variant="subtle" onClick={onOpenGuide}>
          Руководство по LM Studio
        </AppButton>
      </Group>
    </Paper>
  )
}
