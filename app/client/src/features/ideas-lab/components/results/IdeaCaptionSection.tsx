import { Card, Group, Loader, Stack, Text, Title } from '@ui/core'
import { useState } from 'react'
import type { Caption } from '../../../../shared/api/services/ideas.api'
import { AppInlineErrorAlert } from '../../../../shared/components/AppInlineErrorAlert'
import { AppBadge } from '../../../../shared/components/AppBadge'
import { formatRuDateTime } from '../../../../shared/lib/formatters'
import { formatStatusLabel, statusColor } from '../../lib/ideasLab.formatters'
import { INLINE_ERROR_PREVIEW_LIMIT, isSucceededStatus } from './ideaResults.helpers'

type IdeaCaptionSectionProps = {
  caption: Caption | null
  generating: boolean
}

export const IdeaCaptionSection = ({ caption, generating }: IdeaCaptionSectionProps) => {
  const [expandedError, setExpandedError] = useState(false)

  return (
    <div className="ideas-results-section">
      <Title order={5} className="ideas-results-section-title">
        Подпись
      </Title>
      {generating ? (
        <Card withBorder radius="md" p="md" className="ideas-results-card">
          <Group justify="center" py="xl">
            <Loader size={25} />
          </Group>
        </Card>
      ) : !caption ? (
        <Text c="dimmed" className="ideas-results-empty-text">
          Подпись еще не сгенерирована
        </Text>
      ) : (
        <Card withBorder radius="md" p="md" className="ideas-results-card">
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                Версия от {formatRuDateTime(caption.createdAt)}
              </Text>
              {!isSucceededStatus(caption.status) ? (
                <AppBadge color={statusColor[caption.status] ?? 'gray'}>
                  {formatStatusLabel(caption.status)}
                </AppBadge>
              ) : null}
            </Group>
            <Text size="sm" c={caption.text ? undefined : 'dimmed'}>
              {caption.text ?? 'Текст подписи отсутствует'}
            </Text>
            <Text size="sm" c="dimmed">
              {caption.hashtags?.join(' ') || 'Без хэштегов'}
            </Text>
            {caption.error ? (
              <AppInlineErrorAlert>
                <Text
                  size="sm"
                  lineClamp={expandedError ? undefined : 2}
                  style={{ whiteSpace: expandedError ? 'pre-wrap' : 'normal', overflowWrap: 'anywhere' }}
                >
                  {caption.error}
                </Text>
                {caption.error.length > INLINE_ERROR_PREVIEW_LIMIT ? (
                  <Text
                    component="button"
                    type="button"
                    onClick={() => setExpandedError((prev) => !prev)}
                    style={{
                      marginTop: 6,
                      display: 'inline',
                      background: 'none',
                      border: 'none',
                      padding: 0,
                      color: 'var(--app-muted-text)',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      font: 'inherit',
                    }}
                  >
                    {expandedError ? 'Свернуть' : 'Показать полностью'}
                  </Text>
                ) : null}
              </AppInlineErrorAlert>
            ) : null}
          </Stack>
        </Card>
      )}
    </div>
  )
}
