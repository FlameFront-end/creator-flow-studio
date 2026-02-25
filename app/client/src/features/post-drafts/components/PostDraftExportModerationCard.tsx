import { Card, Group, Paper, Progress, SimpleGrid, Stack, Text, Title } from '@ui/core'

import { AppBadge } from '../../../shared/components/AppBadge'
import type { PostDraftModeration } from '../../../shared/api/services/postDrafts.api'
import { formatRuDateTime } from '../../../shared/lib/formatters'
import type { ModerationCheckView } from '../model/postDraftExport.utils'
import {
  formatCheckLabel,
  formatCheckResult,
  toPercent,
} from '../model/postDraftExport.utils'

type PostDraftExportModerationCardProps = {
  moderation: PostDraftModeration | null
  checks: ModerationCheckView[]
}

export const PostDraftExportModerationCard = ({
  moderation,
  checks,
}: PostDraftExportModerationCardProps) => (
  <Card withBorder radius="md" p="md" className="inner-surface post-export-card">
    <Stack gap="sm">
      <Title order={4}>Модерация</Title>
      {!moderation ? (
        <Text c="dimmed">Проверки еще не выполнялись</Text>
      ) : (
        <>
          <Group justify="space-between" align="center">
            <AppBadge color={moderation.status === 'passed' ? 'green' : 'red'} size="lg">
              {moderation.status === 'passed' ? 'Пройдена' : 'Не пройдена'}
            </AppBadge>
            <Text size="sm" c="dimmed">
              Последняя проверка: {formatRuDateTime(moderation.createdAt)}
            </Text>
          </Group>

          <SimpleGrid cols={{ base: 1, md: 2 }}>
            {checks.map((item) => {
              const percent = toPercent(item.value.score)
              return (
                <Paper key={item.key} withBorder radius="sm" p="sm">
                  <Stack gap={6}>
                    <Group justify="space-between">
                      <Text fw={600}>{formatCheckLabel(item.key)}</Text>
                      <AppBadge color={item.value.passed ? 'green' : 'red'} variant="light">
                        {item.value.passed ? 'Ок' : 'Ошибка'}
                      </AppBadge>
                    </Group>
                    <Progress value={percent} color={item.value.passed ? 'green' : 'red'} />
                    <Text size="xs" c="dimmed">
                      Score: {percent}%
                    </Text>
                    <Text size="sm">{formatCheckResult(item.value)}</Text>
                  </Stack>
                </Paper>
              )
            })}
          </SimpleGrid>

        </>
      )}
    </Stack>
  </Card>
)

