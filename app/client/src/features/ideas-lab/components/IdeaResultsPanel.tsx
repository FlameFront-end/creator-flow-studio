import { Card, Group, Image, Paper, Stack, Text, Title } from '@ui/core'

import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ideasApi, type Caption, type Script } from '../../../shared/api/services/ideas.api'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { formatRuDateTime } from '../../../shared/lib/formatters'
import { showErrorToast, showSuccessToast } from '../../../shared/lib/toast'
import type { IdeasLabController } from '../hooks/useIdeasLabController'
import {
  IDEAS_OPEN_ADVANCED_SETTINGS_EVENT,
  ideaDetailsQueryKey,
  ideasQueryKey,
  postDraftLatestQueryKey,
} from '../model/ideasLab.constants'
import {
  formatAssetTypeLabel,
  formatIdeaFormatLabel,
  formatStatusLabel,
  resolveAssetUrl,
  statusColor,
} from '../lib/ideasLab.formatters'
import { AssetViewerModal, type AssetViewerPayload } from '../../../shared/components/AssetViewerModal'
import { PostDraftPanel } from './PostDraftPanel'

const sortByDateDesc = <T extends { createdAt: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

const pickDisplayScript = (scripts: Script[]): Script | null => {
  const sorted = sortByDateDesc(scripts)
  return sorted.find((script) => Boolean(script.text?.trim())) ?? sorted[0] ?? null
}

const pickDisplayCaption = (captions: Caption[]): Caption | null => {
  const sorted = sortByDateDesc(captions)
  return sorted.find((caption) => Boolean(caption.text?.trim())) ?? sorted[0] ?? null
}

const isSucceededStatus = (status: string | null | undefined) => status === 'succeeded'

export const IdeaResultsPanel = ({
  controller,
}: {
  controller: IdeasLabController
}) => {
  const { selectedIdea, detailsQuery } = controller
  const hasIdeas = (controller.ideasQuery.data?.length ?? 0) > 0
  const [previewAsset, setPreviewAsset] = useState<AssetViewerPayload | null>(null)
  const [deleteAssetId, setDeleteAssetId] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const displayedScript = useMemo(
    () => pickDisplayScript(detailsQuery.data?.scripts ?? []),
    [detailsQuery.data?.scripts],
  )

  const displayedCaption = useMemo(
    () => pickDisplayCaption(detailsQuery.data?.captions ?? []),
    [detailsQuery.data?.captions],
  )

  const openInNewWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const openAdvancedSettings = () => {
    if (!selectedIdea) return

    controller.setSelectedIdeaId(selectedIdea.id)
    window.dispatchEvent(
      new CustomEvent(IDEAS_OPEN_ADVANCED_SETTINGS_EVENT, {
        detail: { ideaId: selectedIdea.id },
      }),
    )
  }

  const removeAssetMutation = useMutation({
    mutationFn: ({ assetId }: { assetId: string; ideaId: string }) => ideasApi.removeAsset(assetId),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ideaDetailsQueryKey(variables.ideaId) })
      await queryClient.refetchQueries({ queryKey: ideaDetailsQueryKey(variables.ideaId), type: 'active' })
      await queryClient.invalidateQueries({ queryKey: ideasQueryKey(controller.projectId) })
      await queryClient.refetchQueries({ queryKey: ideasQueryKey(controller.projectId), type: 'active' })
      await queryClient.invalidateQueries({ queryKey: postDraftLatestQueryKey(variables.ideaId) })
      await queryClient.refetchQueries({ queryKey: postDraftLatestQueryKey(variables.ideaId), type: 'active' })
      setDeleteAssetId(null)
      showSuccessToast('Ассет удален')
    },
    onError: (error) => showErrorToast(error, 'Не удалось удалить ассет'),
  })

  return (
    <Paper className="panel-surface ideas-results-panel" radius={24} p="lg">
      <Stack gap="sm">
        <Title order={4}>Результаты по идее</Title>
        {!selectedIdea ? (
          <div className="ideas-empty-state">
            <Text fw={700}>{hasIdeas ? 'Выберите идею слева' : 'Результаты пока недоступны'}</Text>
            <Text size="sm" c="dimmed">
              {hasIdeas
                ? 'Здесь появятся сценарий, подпись и ассеты.'
                : 'Сначала сгенерируйте и выберите идею.'}
            </Text>
          </div>
        ) : (
          <>
            <Card withBorder radius="md" p="md" className="ideas-results-summary">
              <Stack gap={8}>
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <Stack gap={4} className="ideas-results-summary-copy">
                    <Text fw={700} className="ideas-results-topic">{selectedIdea.topic}</Text>
                    <Text size="sm" c="dimmed" className="ideas-results-hook">
                      {selectedIdea.hook}
                    </Text>
                  </Stack>
                  <Group gap="xs" wrap="wrap" className="ideas-results-meta">
                    <AppBadge variant="light">{formatIdeaFormatLabel(selectedIdea.format)}</AppBadge>
                    {!isSucceededStatus(selectedIdea.status) ? (
                      <AppBadge color={statusColor[selectedIdea.status] ?? 'gray'} variant="light">
                        {formatStatusLabel(selectedIdea.status)}
                      </AppBadge>
                    ) : null}
                    <AppBadge variant="light">{formatRuDateTime(selectedIdea.createdAt)}</AppBadge>
                  </Group>
                </Group>
              </Stack>
            </Card>

            <div className="ideas-results-text-grid">
              <div className="ideas-results-section">
                <Title order={5} className="ideas-results-section-title">Сценарий</Title>
                {!displayedScript ? (
                  <Text c="dimmed" className="ideas-results-empty-text">Сценарий еще не сгенерирован</Text>
                ) : (
                  <Card withBorder radius="md" p="md" className="ideas-results-card">
                    <Stack gap={6}>
                      <Group justify="space-between">
                        <Text size="sm" fw={600}>
                          Версия от {formatRuDateTime(displayedScript.createdAt)}
                        </Text>
                        {!isSucceededStatus(displayedScript.status) ? (
                          <AppBadge color={statusColor[displayedScript.status] ?? 'gray'}>
                            {formatStatusLabel(displayedScript.status)}
                          </AppBadge>
                        ) : null}
                      </Group>
                      <Text size="sm" c={displayedScript.text ? undefined : 'dimmed'}>
                        {displayedScript.text ?? 'Текст сценария отсутствует'}
                      </Text>
                      {displayedScript.shotList?.length ? (
                        <Stack gap={2}>
                          <Text size="sm" fw={600}>
                            Шот-лист
                          </Text>
                          {displayedScript.shotList.map((shot, index) => (
                            <Text key={`${displayedScript.id}-shot-${index}`} size="sm" c="dimmed">
                              {index + 1}. {shot}
                            </Text>
                          ))}
                        </Stack>
                      ) : null}
                      {displayedScript.error ? <AppInlineErrorAlert>{displayedScript.error}</AppInlineErrorAlert> : null}
                    </Stack>
                  </Card>
                )}
              </div>

              <div className="ideas-results-section">
                <Title order={5} className="ideas-results-section-title">Подпись</Title>
                {!displayedCaption ? (
                  <Text c="dimmed" className="ideas-results-empty-text">Подпись еще не сгенерирована</Text>
                ) : (
                  <Card withBorder radius="md" p="md" className="ideas-results-card">
                    <Stack gap={6}>
                      <Group justify="space-between">
                        <Text size="sm" fw={600}>
                          Версия от {formatRuDateTime(displayedCaption.createdAt)}
                        </Text>
                        {!isSucceededStatus(displayedCaption.status) ? (
                          <AppBadge color={statusColor[displayedCaption.status] ?? 'gray'}>
                            {formatStatusLabel(displayedCaption.status)}
                          </AppBadge>
                        ) : null}
                      </Group>
                      <Text size="sm" c={displayedCaption.text ? undefined : 'dimmed'}>
                        {displayedCaption.text ?? 'Текст подписи отсутствует'}
                      </Text>
                      <Text size="sm" c="dimmed">
                        {displayedCaption.hashtags?.join(' ') || 'Без хэштегов'}
                      </Text>
                      {displayedCaption.error ? <AppInlineErrorAlert>{displayedCaption.error}</AppInlineErrorAlert> : null}
                    </Stack>
                  </Card>
                )}
              </div>
            </div>

            <Group justify="space-between" align="center" wrap="wrap">
              <Title order={5} className="ideas-results-section-title">Ассеты</Title>
              <AppButton size="xs" variant="subtle" color="gray" onClick={openAdvancedSettings}>
                Настроить промпты
              </AppButton>
            </Group>
            {!detailsQuery.data?.assets.length ? (
              <Text c="dimmed" className="ideas-results-empty-text">Ассеты пока не сгенерированы</Text>
            ) : (
              <div className="ideas-results-assets-grid">
                {detailsQuery.data.assets.map((asset) => {
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
                        <video
                          src={assetUrl}
                          controls
                          preload="metadata"
                          className="ideas-results-asset-video"
                        />
                      ) : null}
                      {assetUrl ? (
                        <>
                          <Group gap="xs" wrap="wrap" className="ideas-results-asset-actions">
                            <AppButton
                              size="xs"
                              variant="default"
                              disabled={!previewable}
                              onClick={() =>
                                previewable &&
                                setPreviewAsset({
                                    type: asset.type === 'video' ? 'video' : 'image',
                                    url: assetUrl,
                                    title: `${formatAssetTypeLabel(asset.type)} • ${formatRuDateTime(asset.createdAt)}`,
                                    subtitle: asset.sourcePrompt ?? undefined,
                                  })
                              }
                            >
                              Открыть в модалке
                            </AppButton>
                            <AppButton
                              size="xs"
                              variant="subtle"
                              onClick={() => openInNewWindow(assetUrl)}
                            >
                              В новом окне
                            </AppButton>
                            <AppButton
                              size="xs"
                              color="red"
                              variant="outline"
                              onClick={() => setDeleteAssetId(asset.id)}
                            >
                              Удалить ассет
                            </AppButton>
                          </Group>
                        </>
                      ) : null}
                      {asset.error ? <AppInlineErrorAlert>{asset.error}</AppInlineErrorAlert> : null}
                    </Stack>
                  </Card>
                )
                })}
              </div>
            )}

            <PostDraftPanel selectedIdea={selectedIdea} details={detailsQuery.data} />
          </>
        )}
      </Stack>

      <AssetViewerModal
        opened={Boolean(previewAsset)}
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
      />
      <ConfirmActionModal
        opened={Boolean(deleteAssetId)}
        title="Удалить ассет?"
        message="Ассет будет удален. Это действие нельзя отменить."
        confirmLabel="Удалить ассет"
        loading={removeAssetMutation.isPending}
        onClose={() => setDeleteAssetId(null)}
        onConfirm={() =>
          deleteAssetId &&
          selectedIdea &&
          removeAssetMutation.mutate({ assetId: deleteAssetId, ideaId: selectedIdea.id })
        }
      />
    </Paper>
  )
}





