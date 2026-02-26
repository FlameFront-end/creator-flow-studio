import { Card, Group, Loader, Stack, Text, Title } from '@ui/core'
import { useState } from 'react'
import type { Script } from '../../../../shared/api/services/ideas.api'
import { AppInlineErrorAlert } from '../../../../shared/components/AppInlineErrorAlert'
import { AppBadge } from '../../../../shared/components/AppBadge'
import { formatRuDateTime } from '../../../../shared/lib/formatters'
import { formatStatusLabel, statusColor } from '../../lib/ideasLab.formatters'
import { INLINE_ERROR_PREVIEW_LIMIT, isSucceededStatus } from './ideaResults.helpers'

type IdeaScriptSectionProps = {
  script: Script | null
  generating: boolean
}

export const IdeaScriptSection = ({ script, generating }: IdeaScriptSectionProps) => {
  const [expandedError, setExpandedError] = useState(false)

  return (
    <div className="ideas-results-section">
      <Title order={5} className="ideas-results-section-title">
        Сценарий
      </Title>
      {generating ? (
        <Card withBorder radius="md" p="md" className="ideas-results-card">
          <Group justify="center" py="xl">
            <Loader size={25} />
          </Group>
        </Card>
      ) : !script ? (
        <Text c="dimmed" className="ideas-results-empty-text">
          Сценарий еще не сгенерирован
        </Text>
      ) : (
        <Card withBorder radius="md" p="md" className="ideas-results-card">
          <Stack gap={6}>
            <Group justify="space-between">
              <Text size="sm" fw={600}>
                Версия от {formatRuDateTime(script.createdAt)}
              </Text>
              {!isSucceededStatus(script.status) ? (
                <AppBadge color={statusColor[script.status] ?? 'gray'}>
                  {formatStatusLabel(script.status)}
                </AppBadge>
              ) : null}
            </Group>
            <Text size="sm" c={script.text ? undefined : 'dimmed'}>
              {script.text ?? 'Текст сценария отсутствует'}
            </Text>
            {script.shotList?.length ? (
              <Stack gap={2}>
                <Text size="sm" fw={600}>
                  Шот-лист
                </Text>
                {script.shotList.map((shot, index) => (
                  <Text key={`${script.id}-shot-${index}`} size="sm" c="dimmed">
                    {index + 1}. {shot}
                  </Text>
                ))}
              </Stack>
            ) : null}
            {script.error ? (
              <AppInlineErrorAlert>
                <Text
                  size="sm"
                  lineClamp={expandedError ? undefined : 2}
                  style={{ whiteSpace: expandedError ? 'pre-wrap' : 'normal', overflowWrap: 'anywhere' }}
                >
                  {script.error}
                </Text>
                {script.error.length > INLINE_ERROR_PREVIEW_LIMIT ? (
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
