import { Card, Group, Stack, Text } from '@ui/core'
import { AppBadge } from '../../../../shared/components/AppBadge'
import { formatRuDateTime } from '../../../../shared/lib/formatters'
import type { IdeasLabIdea } from '../../hooks/useIdeasLabController'
import { formatIdeaFormatLabel, formatStatusLabel, statusColor } from '../../lib/ideasLab.formatters'
import { isSucceededStatus } from './ideaResults.helpers'

type IdeaResultsSummaryCardProps = {
  idea: IdeasLabIdea
}

export const IdeaResultsSummaryCard = ({ idea }: IdeaResultsSummaryCardProps) => (
  <Card withBorder radius="md" p="md" className="ideas-results-summary">
    <Stack gap={8}>
      <Group justify="space-between" align="flex-start" wrap="wrap">
        <Stack gap={4} className="ideas-results-summary-copy">
          <Text fw={700} className="ideas-results-topic">
            {idea.topic}
          </Text>
          <Text size="sm" c="dimmed" className="ideas-results-hook">
            {idea.hook}
          </Text>
        </Stack>
        <Group gap="xs" wrap="wrap" className="ideas-results-meta">
          <AppBadge variant="light">{formatIdeaFormatLabel(idea.format)}</AppBadge>
          {!isSucceededStatus(idea.status) ? (
            <AppBadge color={statusColor[idea.status] ?? 'gray'} variant="light">
              {formatStatusLabel(idea.status)}
            </AppBadge>
          ) : null}
          <AppBadge variant="light">{formatRuDateTime(idea.createdAt)}</AppBadge>
        </Group>
      </Group>
    </Stack>
  </Card>
)
