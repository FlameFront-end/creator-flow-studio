import { ActionIcon, Group, Modal, Paper, SegmentedControl, Slider, Stack, Text, Tooltip } from '@ui/core'

import { AppButton } from './AppButton'
import {
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconMinus,
  IconPlus,
  IconRotate2,
} from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { showErrorToast, showSuccessToast } from '../lib/toast'

export type AssetViewerPayload = {
  type: 'image' | 'video'
  url: string
  title?: string
  subtitle?: string
}

type AssetViewerModalProps = {
  opened: boolean
  asset: AssetViewerPayload | null
  onClose: () => void
}

const MIN_ZOOM = 50
const MAX_ZOOM = 250
const DEFAULT_ZOOM = 100

const getExtensionFromContentType = (contentType: string | null, assetType: 'image' | 'video'): string => {
  if (!contentType) return assetType === 'image' ? '.jpg' : '.mp4'
  const normalized = contentType.toLowerCase()
  if (normalized.includes('image/png')) return '.png'
  if (normalized.includes('image/webp')) return '.webp'
  if (normalized.includes('image/jpeg') || normalized.includes('image/jpg')) return '.jpg'
  if (normalized.includes('video/webm')) return '.webm'
  if (normalized.includes('video/quicktime')) return '.mov'
  if (normalized.includes('video/mp4')) return '.mp4'
  return assetType === 'image' ? '.jpg' : '.mp4'
}

const getFilenameFromUrl = (url: string): string => {
  try {
    const pathname = new URL(url).pathname
    const lastPart = decodeURIComponent(pathname.split('/').pop() ?? '').trim()
    return lastPart
  } catch {
    return ''
  }
}

export const AssetViewerModal = ({ opened, asset, onClose }: AssetViewerModalProps) => {
  const [zoomPercent, setZoomPercent] = useState(DEFAULT_ZOOM)
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('contain')
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    if (!opened) return
    setZoomPercent(DEFAULT_ZOOM)
    setFitMode('contain')
  }, [opened, asset?.url])

  const zoom = useMemo(() => zoomPercent / 100, [zoomPercent])

  const onCopyUrl = async () => {
    if (!asset?.url) return
    try {
      await navigator.clipboard.writeText(asset.url)
      showSuccessToast('Ссылка скопирована')
    } catch (error) {
      showErrorToast(error, 'Не удалось скопировать ссылку')
    }
  }

  const onDownload = async () => {
    if (!asset?.url) return

    setIsDownloading(true)
    try {
      const response = await fetch(asset.url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const blob = await response.blob()
      const extension = getExtensionFromContentType(
        response.headers.get('content-type'),
        asset.type,
      )

      let filename = getFilenameFromUrl(asset.url)
      if (!filename) {
        filename = `asset-${Date.now()}${extension}`
      } else if (!/\.[a-z0-9]{2,5}$/i.test(filename)) {
        filename = `${filename}${extension}`
      }

      const objectUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(objectUrl)

      showSuccessToast('Файл скачивается')
    } catch (error) {
      showErrorToast(
        error,
        'Не удалось скачать автоматически. Откройте в новом окне и сохраните вручную.',
      )
    } finally {
      setIsDownloading(false)
    }
  }

  if (!asset) return null

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={asset.title ?? 'Просмотр ассета'}
      size="90%"
      centered
      classNames={{ content: 'asset-viewer-content', body: 'asset-viewer-body' }}
    >
      <Stack gap="sm" h="100%">
        {asset.subtitle ? (
          <Text size="sm" c="dimmed" lineClamp={2}>
            {asset.subtitle}
          </Text>
        ) : null}

        <Group justify="space-between" align="center" wrap="wrap" className="asset-viewer-toolbar">
          <Group gap="xs" wrap="wrap">
            {asset.type === 'image' ? (
              <>
                <Tooltip label="Уменьшить">
                  <ActionIcon
                    variant="default"
                    onClick={() => setZoomPercent((prev) => Math.max(MIN_ZOOM, prev - 10))}
                  >
                    <IconMinus size={16} />
                  </ActionIcon>
                </Tooltip>
                <Slider
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={10}
                  w={180}
                  value={zoomPercent}
                  onChange={setZoomPercent}
                  label={(value) => `${value}%`}
                />
                <Tooltip label="Увеличить">
                  <ActionIcon
                    variant="default"
                    onClick={() => setZoomPercent((prev) => Math.min(MAX_ZOOM, prev + 10))}
                  >
                    <IconPlus size={16} />
                  </ActionIcon>
                </Tooltip>
                <AppButton
                  size="xs"
                  variant="subtle"
                  leftSection={<IconRotate2 size={14} />}
                  onClick={() => setZoomPercent(DEFAULT_ZOOM)}
                >
                  Сброс
                </AppButton>
                <SegmentedControl
                  size="xs"
                  value={fitMode}
                  onChange={(value) => setFitMode((value as 'contain' | 'cover') ?? 'contain')}
                  data={[
                    { label: 'Вписать', value: 'contain' },
                    { label: 'Заполнить', value: 'cover' },
                  ]}
                />
              </>
            ) : (
              <Text size="sm" c="dimmed">
                Управление видео доступно через стандартные контролы плеера
              </Text>
            )}
          </Group>

          <Group gap="xs" wrap="wrap">
            <AppButton
              size="xs"
              variant="default"
              leftSection={<IconExternalLink size={14} />}
              onClick={() => window.open(asset.url, '_blank', 'noopener,noreferrer')}
            >
              В новом окне
            </AppButton>
            <AppButton
              size="xs"
              variant="default"
              loading={isDownloading}
              leftSection={<IconDownload size={14} />}
              onClick={() => void onDownload()}
            >
              Скачать
            </AppButton>
            <AppButton
              size="xs"
              variant="subtle"
              leftSection={<IconCopy size={14} />}
              onClick={() => void onCopyUrl()}
            >
              Копировать ссылку
            </AppButton>
          </Group>
        </Group>

        <Paper withBorder radius="md" p="md" className="asset-viewer-stage">
          {asset.type === 'image' ? (
            <div className="asset-viewer-media-wrap">
              <img
                src={asset.url}
                alt="Просмотр ассета"
                className="asset-viewer-media"
                style={{
                  transform: `scale(${zoom})`,
                  objectFit: fitMode,
                }}
              />
            </div>
          ) : (
            <video src={asset.url} controls autoPlay className="asset-viewer-video" />
          )}
        </Paper>
      </Stack>
    </Modal>
  )
}




