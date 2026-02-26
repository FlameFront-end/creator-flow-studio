import { Card, Group, Image, Stack, Text, Title } from '@ui/core'
import type { Asset } from '../../../../shared/api/services/ideas.api'
import { AppInlineErrorAlert } from '../../../../shared/components/AppInlineErrorAlert'
import { AppBadge } from '../../../../shared/components/AppBadge'
import { AppButton } from '../../../../shared/components/AppButton'
import { formatRuDateTime } from '../../../../shared/lib/formatters'
import {
  formatAssetTypeLabel,
  formatStatusLabel,
  resolveAssetUrl,
  statusColor,
} from '../../lib/ideasLab.formatters'
import { isSucceededStatus } from './ideaResults.helpers'

type IdeaAssetsSectionProps = {
  assets: Asset[]
  onOpenPreview: (payload: {
    type: 'image' | 'video'
    url: string
    title: string
    subtitle?: string
  }) => void
  onOpenInWindow: (url: string) => void
  onRequestDelete: (assetId: string) => void
}

export const IdeaAssetsSection = ({
  assets,
  onOpenPreview,
  onOpenInWindow,
  onRequestDelete,
}: IdeaAssetsSectionProps) => {
  if (!assets.length) {
    return (
      <>
        <Title order={5} className="ideas-results-section-title">
          Ассеты
        </Title>
        <Text c="dimmed" className="ideas-results-empty-text">
          Ассеты пока не сгенерированы
        </Text>
      </>
    )
  }

  return (
    <>
      <Title order={5} className="ideas-results-section-title">
        Ассеты
      </Title>
      <div className="ideas-results-assets-grid">
        {assets.map((asset) => {
          const assetUrl = resolveAssetUrl(asset.url)
          const previewable = asset.type === 'image' || asset.type === 'video'

          return (
            <Card key={asset.id} withBorder radius="md" p="sm" className="ideas-results-asset-card">
              <Stack gap={6}>
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    {formatAssetTypeLabel(asset.type)} • {formatRuDateTime(asset.createdAt)}
                  </Text>
                  {!isSucceededStatus(asset.status) ? (
                    <AppBadge color={statusColor[asset.status] ?? 'gray'}>
                      {formatStatusLabel(asset.status)}
                    </AppBadge>
                  ) : null}
                </Group>
                {asset.sourcePrompt ? (
                  <Text size="xs" c="dimmed" lineClamp={3} className="ideas-results-asset-prompt">
                    {asset.sourcePrompt}
                  </Text>
                ) : null}
                {asset.type === 'image' && assetUrl ? (
                  <Image
                    src={assetUrl}
                    alt="Сгенерированный ассет"
                    radius="sm"
                    h={260}
                    fit="contain"
                    className="ideas-results-asset-preview"
                  />
                ) : null}
                {asset.type === 'video' && assetUrl ? (
                  <video src={assetUrl} controls preload="metadata" className="ideas-results-asset-video" />
                ) : null}
                {assetUrl ? (
                  <Group gap="xs" wrap="wrap" className="ideas-results-asset-actions">
                    <AppButton
                      size="xs"
                      variant="default"
                      disabled={!previewable}
                      onClick={() =>
                        previewable &&
                        onOpenPreview({
                          type: asset.type === 'video' ? 'video' : 'image',
                          url: assetUrl,
                          title: `${formatAssetTypeLabel(asset.type)} • ${formatRuDateTime(asset.createdAt)}`,
                          subtitle: asset.sourcePrompt ?? undefined,
                        })
                      }
                    >
                      Открыть в модалке
                    </AppButton>
                    <AppButton size="xs" variant="subtle" onClick={() => onOpenInWindow(assetUrl)}>
                      В новом окне
                    </AppButton>
                    <AppButton
                      size="xs"
                      color="red"
                      variant="outline"
                      onClick={() => onRequestDelete(asset.id)}
                    >
                      Удалить ассет
                    </AppButton>
                  </Group>
                ) : null}
                {asset.error ? <AppInlineErrorAlert>{asset.error}</AppInlineErrorAlert> : null}
              </Stack>
            </Card>
          )
        })}
      </div>
    </>
  )
}
