import { Card, Group, Paper, Stack, Text, Title } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { IconCopy } from '@tabler/icons-react'
import type { PostDraftCaption } from '../../../shared/api/services/postDrafts.api'
import { formatRuDateTime } from '../../../shared/lib/formatters'

type PostDraftExportCaptionCardProps = {
  caption: PostDraftCaption | null
  onCopyCaption: () => void
}

export const PostDraftExportCaptionCard = ({
  caption,
  onCopyCaption,
}: PostDraftExportCaptionCardProps) => (
  <Card withBorder radius="md" p="md" className="inner-surface post-export-card">
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Title order={4}>Подпись</Title>
        <AppButton
          size="xs"
          variant="default"
          leftSection={<IconCopy size={14} />}
          onClick={onCopyCaption}
          disabled={!caption}
        >
          Скопировать
        </AppButton>
      </Group>

      {!caption ? (
        <Text c="dimmed">Подпись не выбрана</Text>
      ) : (
        <>
          <Text size="xs" c="dimmed">
            Версия от {formatRuDateTime(caption.createdAt)}
          </Text>
          <Paper withBorder radius="sm" p="sm">
            <Text className="post-export-caption-text">{caption.text ?? '—'}</Text>
          </Paper>
          <Group gap="xs" wrap="wrap">
            {(caption.hashtags ?? []).length ? (
              (caption.hashtags ?? []).map((tag) => (
                <AppBadge key={`${caption.id}-${tag}`} variant="light" color="cyan">
                  {tag}
                </AppBadge>
              ))
            ) : (
              <Text size="sm" c="dimmed">
                Без хэштегов
              </Text>
            )}
          </Group>
        </>
      )}
    </Stack>
  </Card>
)




