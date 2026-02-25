import { ActionIcon, Card, Group, Paper, SimpleGrid, Stack, Text, Title, Tooltip } from '@ui/core'

import { AppButton } from '../../../shared/components/AppButton'
import {
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconPhoto,
  IconPlayerPlay,
} from '@tabler/icons-react'
import type { PostDraftAsset } from '../../../shared/api/services/postDrafts.api'
import { formatRuDateTime } from '../../../shared/lib/formatters'
import type { AssetViewerPayload } from '../../ideas-lab/components/AssetViewerModal'
import { formatAssetTypeLabel, resolveAssetUrl } from '../model/postDraftExport.utils'

type PostDraftExportAssetsCardProps = {
  assets: PostDraftAsset[]
  onOpenPreview: (asset: AssetViewerPayload) => void
  onCopyUrl: (url: string) => void
}

export const PostDraftExportAssetsCard = ({
  assets,
  onOpenPreview,
  onCopyUrl,
}: PostDraftExportAssetsCardProps) => (
  <Card withBorder radius="md" p="md" className="inner-surface post-export-card">
    <Stack gap="sm">
      <Group justify="space-between" align="center" wrap="wrap">
        <Title order={4}>Ассеты для публикации</Title>
        <Text size="sm" c="dimmed">
          Всего: {assets.length}
        </Text>
      </Group>
      {!assets.length ? (
        <Text c="dimmed">В черновике не выбраны ассеты</Text>
      ) : (
        <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md" className="post-export-assets-grid">
          {assets.map((asset) => {
            const url = resolveAssetUrl(asset.url)
            const previewable = asset.type === 'image' || asset.type === 'video'
            return (
              <Paper key={asset.id} withBorder radius="sm" p="sm" className="post-export-asset-card">
                <Stack gap="sm">
                  <Group justify="space-between" align="center" wrap="wrap">
                    <Group gap="xs" align="center">
                      {asset.type === 'video' ? <IconPlayerPlay size={16} /> : <IconPhoto size={16} />}
                      <Text fw={600}>{formatAssetTypeLabel(asset.type)}</Text>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {formatRuDateTime(asset.createdAt)}
                    </Text>
                  </Group>

                  {asset.type === 'image' && url ? (
                    <div className="post-export-asset-media-frame">
                      <img src={url} alt="Ассет" className="post-export-asset-media" />
                    </div>
                  ) : null}
                  {asset.type === 'video' && url ? (
                    <div className="post-export-asset-media-frame">
                      <video
                        src={url}
                        controls
                        preload="metadata"
                        className="post-export-asset-media post-export-asset-video"
                      />
                    </div>
                  ) : null}
                  {!url ? (
                    <Text size="sm" c="dimmed" className="post-export-asset-empty">
                      Ссылка на ассет недоступна
                    </Text>
                  ) : null}

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={6}>
                    <Text size="xs" c="dimmed">
                      Тип файла: {asset.mime ?? '—'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Провайдер: {asset.provider ?? '—'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Размер: {asset.width ?? '—'} x {asset.height ?? '—'}
                    </Text>
                    <Text size="xs" c="dimmed">
                      Длительность: {asset.duration != null ? `${asset.duration} сек` : '—'}
                    </Text>
                  </SimpleGrid>

                  <Group gap="xs" wrap="wrap" className="post-export-asset-actions">
                    <AppButton
                      size="xs"
                      variant="default"
                      disabled={!previewable || !url}
                      onClick={() => {
                        if (!url || !previewable) return
                        onOpenPreview({
                          type: asset.type === 'video' ? 'video' : 'image',
                          url,
                          title: `${formatAssetTypeLabel(asset.type)} • ${formatRuDateTime(asset.createdAt)}`,
                          subtitle: asset.sourcePrompt ?? undefined,
                        })
                      }}
                    >
                      Просмотр
                    </AppButton>

                    {url ? (
                      <>
                        <Tooltip label="Открыть в новой вкладке">
                          <ActionIcon
                            component="a"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            variant="default"
                          >
                            <IconExternalLink size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Скачать">
                          <ActionIcon
                            component="a"
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            download
                            variant="default"
                          >
                            <IconDownload size={14} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Копировать ссылку">
                          <ActionIcon variant="default" onClick={() => onCopyUrl(url)}>
                            <IconCopy size={14} />
                          </ActionIcon>
                        </Tooltip>
                      </>
                    ) : null}
                  </Group>
                </Stack>
              </Paper>
            )
          })}
        </SimpleGrid>
      )}
    </Stack>
  </Card>
)




