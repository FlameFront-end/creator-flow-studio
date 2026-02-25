import { ActionIcon, Group, Paper, SimpleGrid, Stack, Text, Title } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { IconArrowLeft, IconCopy } from '@tabler/icons-react'
import type { PostDraftExport } from '../../../shared/api/services/postDrafts.api'
import { formatRuDateTime } from '../../../shared/lib/formatters'
import {
  formatDraftStatusLabel,
  formatIdeaFormatLabel,
  statusColor,
} from '../model/postDraftExport.utils'

type PostDraftExportHeroProps = {
  payload: PostDraftExport
  imagesCount: number
  videosCount: number
  onBack: () => void
  onCopyDraftId: () => void
}

export const PostDraftExportHero = ({
  payload,
  imagesCount,
  videosCount,
  onBack,
  onCopyDraftId,
}: PostDraftExportHeroProps) => (
  <Paper className="panel-surface post-export-hero" radius={20} p="lg">
    <Stack gap="md">
      <Group justify="space-between" align="flex-start" wrap="wrap" className="post-export-hero-head">
        <Group gap="xs" wrap="nowrap" className="post-export-hero-title-group">
          <ActionIcon
            variant="subtle"
            size="lg"
            aria-label="Назад"
            onClick={onBack}
            className="post-export-hero-back"
          >
            <IconArrowLeft size={16} />
          </ActionIcon>
          <Stack gap={2} className="post-export-hero-copy">
            <Title order={2} className="post-export-hero-title">
              Экспорт публикации
            </Title>
            <Text c="dimmed" lineClamp={2} className="post-export-hero-subtitle">
              {payload.idea.topic}
            </Text>
          </Stack>
        </Group>

        <Group gap="xs" wrap="wrap" className="post-export-hero-actions">
          <AppBadge color={statusColor[payload.status] ?? 'gray'} size="lg">
            {formatDraftStatusLabel(payload.status)}
          </AppBadge>
          <AppButton
            size="xs"
            variant="default"
            leftSection={<IconCopy size={14} />}
            onClick={onCopyDraftId}
          >
            Копировать ID
          </AppButton>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 2, md: 4 }}>
        <Paper className="inner-surface post-export-stat" radius="md" p="sm">
          <Text size="xs" c="dimmed">
            Формат
          </Text>
          <Text fw={700}>{formatIdeaFormatLabel(payload.idea.format)}</Text>
        </Paper>
        <Paper className="inner-surface post-export-stat" radius="md" p="sm">
          <Text size="xs" c="dimmed">
            Ассеты
          </Text>
          <Text fw={700}>{payload.assets.length}</Text>
          <Text size="xs" c="dimmed">
            Изображений: {imagesCount} • Видео: {videosCount}
          </Text>
        </Paper>
        <Paper className="inner-surface post-export-stat" radius="md" p="sm">
          <Text size="xs" c="dimmed">
            Создан
          </Text>
          <Text fw={700}>{formatRuDateTime(payload.createdAt)}</Text>
        </Paper>
        <Paper className="inner-surface post-export-stat" radius="md" p="sm">
          <Text size="xs" c="dimmed">
            План публикации
          </Text>
          <Text fw={700}>{payload.scheduledAt ? formatRuDateTime(payload.scheduledAt) : 'Не задан'}</Text>
        </Paper>
      </SimpleGrid>
    </Stack>
  </Paper>
)




