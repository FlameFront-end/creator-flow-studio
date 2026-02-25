import { Card, Divider, Group, Stack, Text, Title } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { IconCheck } from '@tabler/icons-react'
import type { PublishChecklistItem } from '../model/postDraftExport.utils'

type PostDraftExportReadinessCardProps = {
  canMarkPublished: boolean
  canUnapprove: boolean
  canRunChecks: boolean
  canApprove: boolean
  publishChecklist: PublishChecklistItem[]
  isRunningChecks: boolean
  isApproving: boolean
  isUnapproving: boolean
  isMarkingPublished: boolean
  onRunChecks: () => void
  onApprove: () => void
  onUnapprove: () => void
  onMarkPublished: () => void
  onBack: () => void
}

export const PostDraftExportReadinessCard = ({
  canMarkPublished,
  canUnapprove,
  canRunChecks,
  canApprove,
  publishChecklist,
  isRunningChecks,
  isApproving,
  isUnapproving,
  isMarkingPublished,
  onRunChecks,
  onApprove,
  onUnapprove,
  onMarkPublished,
  onBack,
}: PostDraftExportReadinessCardProps) => (
  <Card withBorder radius="md" p="md" className="inner-surface post-export-card">
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Title order={4}>Готовность к публикации</Title>
        <AppBadge color={canMarkPublished ? 'green' : 'gray'}>
          {canMarkPublished ? 'Можно публиковать' : 'Требуются шаги'}
        </AppBadge>
      </Group>

      {publishChecklist.map((item) => (
        <Group key={item.label} justify="space-between" align="center">
          <Text size="sm">{item.label}</Text>
          <AppBadge color={item.done ? 'green' : 'red'} variant="light">
            {item.done ? 'Да' : 'Нет'}
          </AppBadge>
        </Group>
      ))}

      <Divider />

      <Group>
        <AppButton
          variant="default"
          onClick={onRunChecks}
          loading={isRunningChecks}
          disabled={!canRunChecks}
        >
          Запустить проверки
        </AppButton>
        <AppButton
          color="green"
          onClick={onApprove}
          loading={isApproving}
          disabled={!canApprove}
        >
          Подтвердить
        </AppButton>
        <AppButton
          variant="default"
          onClick={onUnapprove}
          loading={isUnapproving}
          disabled={!canUnapprove}
        >
          Снять подтверждение
        </AppButton>
        <AppButton
          color="cyan"
          leftSection={<IconCheck size={14} />}
          disabled={!canMarkPublished}
          loading={isMarkingPublished}
          onClick={onMarkPublished}
        >
          Отметить как опубликовано вручную
        </AppButton>
        <AppButton variant="default" onClick={onBack}>
          Вернуться к идее
        </AppButton>
      </Group>
    </Stack>
  </Card>
)




