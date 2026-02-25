import { Card, Group, Select, Stack, Text, Textarea, TextInput, Title, Tooltip } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { type IdeaDetails } from '../../../shared/api/services/ideas.api'
import {
  postDraftsApi,
  type PostDraftExport,
} from '../../../shared/api/services/postDrafts.api'
import { formatRuDateTime } from '../../../shared/lib/formatters'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../../shared/lib/toast'
import { buildPostDraftExportRoute } from '../../../shared/model/routes'
import type { IdeasLabIdea } from '../hooks/useIdeasLabController'
import { formatAssetTypeLabel, resolveAssetUrl } from '../lib/ideasLab.formatters'
import { postDraftLatestQueryKey } from '../model/ideasLab.constants'
import {
  buildTextPreview,
  defaultAssetIds,
  formatCheckResult,
  formatDraftStatusLabel,
  formatModerationStatusLabel,
  localDatetimeToRuParts,
  postDraftModerationColor,
  postDraftStatusColor,
  ruPartsToLocalDatetime,
  toLocalDatetime,
} from '../model/postDraftPanel.utils'
import { AssetViewerModal, type AssetViewerPayload } from '../../../shared/components/AssetViewerModal'

type PostDraftPanelProps = {
  selectedIdea: IdeasLabIdea
  details: IdeaDetails | undefined
}

export const PostDraftPanel = ({ selectedIdea, details }: PostDraftPanelProps) => {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const [draft, setDraft] = useState<PostDraftExport | null>(null)
  const [selectedCaptionId, setSelectedCaptionId] = useState<string | null>(null)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([])
  const [scheduledDateInput, setScheduledDateInput] = useState('')
  const [scheduledTimeInput, setScheduledTimeInput] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [previewAsset, setPreviewAsset] = useState<AssetViewerPayload | null>(null)

  const scheduledAt = useMemo(
    () => ruPartsToLocalDatetime(scheduledDateInput.trim(), scheduledTimeInput.trim()),
    [scheduledDateInput, scheduledTimeInput],
  )

  const latestDraftQuery = useQuery({
    queryKey: postDraftLatestQueryKey(selectedIdea.id),
    queryFn: () => postDraftsApi.getLatestByIdea(selectedIdea.id),
    enabled: Boolean(selectedIdea.id),
  })

  const refreshLatestDraft = async () => {
    await queryClient.invalidateQueries({ queryKey: postDraftLatestQueryKey(selectedIdea.id) })
    await queryClient.refetchQueries({ queryKey: postDraftLatestQueryKey(selectedIdea.id), type: 'active' })
  }

  useEffect(() => {
    setDraft(latestDraftQuery.data ?? null)
  }, [latestDraftQuery.data])

  useEffect(() => {
    const availableAssetIds = new Set(
      (details?.assets ?? [])
        .filter((asset) => asset.status === 'succeeded' && (asset.type === 'image' || asset.type === 'video'))
        .map((asset) => asset.id),
    )

    if (draft) {
      setSelectedCaptionId(draft.captionId)
      setSelectedAssetIds(draft.selectedAssets.filter((assetId) => availableAssetIds.has(assetId)))
      const parts = localDatetimeToRuParts(toLocalDatetime(draft.scheduledAt))
      setScheduledDateInput(parts.date)
      setScheduledTimeInput(parts.time)
      return
    }

    const succeededCaption =
      details?.captions.find((caption) => caption.status === 'succeeded') ?? null
    setSelectedCaptionId(succeededCaption?.id ?? null)
    setSelectedAssetIds(defaultAssetIds(details).filter((assetId) => availableAssetIds.has(assetId)))
    setScheduledDateInput('')
    setScheduledTimeInput('')
  }, [draft, details])

  const selectableAssets = useMemo(
    () =>
      [...(details?.assets ?? [])]
        .filter(
          (asset) =>
            asset.status === 'succeeded' &&
            (asset.type === 'image' || asset.type === 'video'),
        )
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)),
    [details?.assets],
  )

  const succeededCaptions = useMemo(
    () => (details?.captions ?? []).filter((caption) => caption.status === 'succeeded'),
    [details?.captions],
  )

  const captionOptions = useMemo(
    () =>
      succeededCaptions.map((caption) => ({
        value: caption.id,
        label: `Версия от ${formatRuDateTime(caption.createdAt)}`,
      })),
    [succeededCaptions],
  )

  const selectedCaption = useMemo(
    () => succeededCaptions.find((caption) => caption.id === selectedCaptionId) ?? null,
    [selectedCaptionId, succeededCaptions],
  )

  const createDraftMutation = useMutation({
    mutationFn: () =>
      postDraftsApi.createFromIdea(selectedIdea.id, {
        captionId: selectedCaptionId ?? undefined,
        assetIds: selectedAssetIds,
        scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
      }),
    onSuccess: async (createdDraft) => {
      setDraft(createdDraft)
      await refreshLatestDraft()
      showSuccessToast('Черновик публикации собран')
    },
    onError: (error) => showErrorToast(error, 'Не удалось собрать черновик'),
  })

  const runChecksMutation = useMutation({
    mutationFn: () => {
      if (!draft) {
        throw new Error('Черновик еще не создан')
      }
      return postDraftsApi.runModeration(draft.id)
    },
    onSuccess: async (updatedDraft) => {
      setDraft(updatedDraft)
      await refreshLatestDraft()
      showSuccessToast('Проверки модерации завершены')
    },
    onError: (error) => showErrorToast(error, 'Не удалось выполнить проверки модерации'),
  })

  const approveDraftMutation = useMutation({
    mutationFn: () => {
      if (!draft) {
        throw new Error('Черновик еще не создан')
      }
      return postDraftsApi.approve(draft.id, {
        overrideReason: overrideReason.trim() || undefined,
      })
    },
    onSuccess: async (updatedDraft) => {
      setDraft(updatedDraft)
      await refreshLatestDraft()
      showSuccessToast('Черновик подтвержден')
    },
    onError: (error) => showErrorToast(error, 'Не удалось подтвердить черновик'),
  })

  const markPublishedMutation = useMutation({
    mutationFn: () => {
      if (!draft) {
        throw new Error('Черновик еще не создан')
      }
      return postDraftsApi.markPublished(draft.id)
    },
    onSuccess: async (updatedDraft) => {
      setDraft(updatedDraft)
      await refreshLatestDraft()
      showSuccessToast('Пост отмечен как опубликованный вручную')
    },
    onError: (error) => showErrorToast(error, 'Не удалось отметить публикацию'),
  })

  const unapproveDraftMutation = useMutation({
    mutationFn: () => {
      if (!draft) {
        throw new Error('Черновик еще не создан')
      }
      return postDraftsApi.unapprove(draft.id)
    },
    onSuccess: async (updatedDraft) => {
      setDraft(updatedDraft)
      await refreshLatestDraft()
      showSuccessToast('Подтверждение снято')
    },
    onError: (error) => showErrorToast(error, 'Не удалось снять подтверждение'),
  })

  const latestModeration = draft?.latestModeration ?? null
  const moderationChecks = latestModeration?.checks
  const checksPassed = latestModeration?.status === 'passed'
  const hasFailedModerationCheck = moderationChecks
    ? (
        !moderationChecks.nsfw.passed ||
        !moderationChecks.toxicity.passed ||
        !moderationChecks.forbiddenTopics.passed ||
        !moderationChecks.policy.passed
      )
    : false
  const canApproveWithOverride = hasFailedModerationCheck && overrideReason.trim().length >= 3
  const canApprove = draft
    ? draft.status === 'draft' && (checksPassed || canApproveWithOverride)
    : false
  const hasDraftChanges = useMemo(() => {
    if (!draft) return false

    const currentAssets = [...selectedAssetIds].sort()
    const draftAssets = [...draft.selectedAssets].sort()
    const assetsChanged =
      currentAssets.length !== draftAssets.length ||
      currentAssets.some((assetId, index) => assetId !== draftAssets[index])

    const captionChanged = (selectedCaptionId ?? null) !== (draft.captionId ?? null)
    const scheduleChanged = (scheduledAt || '') !== toLocalDatetime(draft.scheduledAt)

    return assetsChanged || captionChanged || scheduleChanged
  }, [draft, scheduledAt, selectedAssetIds, selectedCaptionId])

  const onCreateDraft = () => {
    if (!selectedAssetIds.length) {
      showValidationToast('Выберите хотя бы один ассет для черновика')
      return
    }
    createDraftMutation.mutate()
  }

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetIds((current) =>
      current.includes(assetId)
        ? current.filter((id) => id !== assetId)
        : [...current, assetId],
    )
  }

  const openInNewWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <Card withBorder radius="md" p="md">
      <Stack gap="md">
        <Group justify="space-between" align="center">
          <Title order={5}>Пакет публикации</Title>
          {draft ? (
            <AppBadge color={postDraftStatusColor[draft.status] ?? 'gray'}>{formatDraftStatusLabel(draft.status)}</AppBadge>
          ) : (
            <AppBadge variant="light">Черновик не создан</AppBadge>
          )}
        </Group>

        <Text size="sm" c="dimmed">
          Соберите черновик из выбранных ассетов и подписи, запустите проверки,
          подтвердите и откройте страницу экспорта.
        </Text>

        <Stack gap={8}>
          <Group justify="space-between" align="center">
            <Text className="post-draft-assets-label">Ассеты (видео/изображение)</Text>
            <Text size="xs" c="dimmed">Выбрано: {selectedAssetIds.length}</Text>
          </Group>

          {!selectableAssets.length ? (
            <Text c="dimmed" className="post-draft-assets-empty">
              Нет доступных ассетов
            </Text>
          ) : (
            <div className="post-draft-assets-picker">
              {selectableAssets.map((asset) => {
                const selected = selectedAssetIds.includes(asset.id)

                return (
                  <button
                    key={asset.id}
                    type="button"
                    className={`post-draft-asset-option${selected ? ' is-selected' : ''}`}
                    onClick={() => toggleAssetSelection(asset.id)}
                  >
                    <span className="post-draft-asset-option-copy">
                      <span className="post-draft-asset-option-title">
                        {formatAssetTypeLabel(asset.type)}
                      </span>
                      <span className="post-draft-asset-option-meta">
                        {formatRuDateTime(asset.createdAt)}
                      </span>
                    </span>
                    <AppBadge
                      color={selected ? 'green' : 'gray'}
                      variant={selected ? 'filled' : 'light'}
                    >
                      {selected ? 'Выбран' : 'Выбрать'}
                    </AppBadge>
                  </button>
                )
              })}
            </div>
          )}
        </Stack>

        <Select
          label="Подпись"
          placeholder="Опционально"
          data={captionOptions}
          value={selectedCaptionId}
          onChange={setSelectedCaptionId}
          clearable
          searchable
          nothingFoundMessage="Нет доступных подписей"
        />
        {selectedCaption ? (
          <Card withBorder radius="sm" p="sm">
            <Stack gap={4}>
              <Text size="xs" c="dimmed">
                Текст выбранной подписи
              </Text>
              <Text size="sm">{selectedCaption.text ?? 'Без текста'}</Text>
              <Text size="xs" c="dimmed">
                {(selectedCaption.hashtags ?? []).join(' ') || 'Без хэштегов'}
              </Text>
            </Stack>
          </Card>
        ) : null}

        <Stack gap={8}>
          <Text className="post-draft-assets-label">Планируемое время публикации (опционально)</Text>
          <div className="post-draft-schedule-grid">
            <TextInput
              placeholder="ДД.ММ.ГГГГ"
              value={scheduledDateInput}
              onChange={(event) => setScheduledDateInput(event.currentTarget.value)}
              rightSection={<span style={{ color: 'var(--app-muted-text)' }}>дата</span>}
            />
            <TextInput
              placeholder="ЧЧ:ММ"
              value={scheduledTimeInput}
              onChange={(event) => setScheduledTimeInput(event.currentTarget.value)}
              rightSection={<span style={{ color: 'var(--app-muted-text)' }}>время</span>}
            />
          </div>
        </Stack>

        <Tooltip
          label={
            !selectableAssets.length
              ? 'Нет доступных ассетов'
              : draft && !hasDraftChanges
                ? 'Нет изменений для пересборки'
                : ''
          }
          disabled={Boolean(selectableAssets.length) && (!draft || hasDraftChanges)}
          side="top"
          align="start"
          withArrow
        >
          <div style={{ display: 'inline-flex', width: 'fit-content' }}>
            <AppButton
              onClick={onCreateDraft}
              loading={createDraftMutation.isPending}
              disabled={!selectableAssets.length || (Boolean(draft) && !hasDraftChanges)}
            >
              {draft ? 'Пересобрать черновик' : 'Собрать черновик из идеи'}
            </AppButton>
          </div>
        </Tooltip>

        {draft ? (
          <>
            <Card withBorder radius="md" p="sm" className="post-draft-summary-card">
              <Stack gap="xs">
                <Group justify="space-between" align="center" wrap="wrap">
                  <Text size="sm" fw={600}>
                    Состояние черновика
                  </Text>
                  <AppBadge color={postDraftStatusColor[draft.status] ?? 'gray'} variant="light">
                    {formatDraftStatusLabel(draft.status)}
                  </AppBadge>
                </Group>

                <Group gap="xs" wrap="wrap">
                  <Text size="sm" c="dimmed">
                    Ассетов: <b>{draft.selectedAssets.length}</b>
                  </Text>
                  {latestModeration ? (
                    <>
                      <Text size="sm" c="dimmed">•</Text>
                      <Text size="sm" c="dimmed">Проверки:</Text>
                      <AppBadge color={postDraftModerationColor[latestModeration.status] ?? 'gray'}>
                        {formatModerationStatusLabel(latestModeration.status)}
                      </AppBadge>
                    </>
                  ) : (
                    <>
                      <Text size="sm" c="dimmed">•</Text>
                      <Text size="sm" c="dimmed">Проверки не запускались</Text>
                    </>
                  )}
                </Group>

                {draft.caption ? (
                  <Text size="sm">
                    Подпись: <b>{buildTextPreview(draft.caption.text, 120)}</b>
                  </Text>
                ) : (
                  <Text size="sm" c="dimmed">
                    Подпись не выбрана
                  </Text>
                )}

                {latestModeration ? (
                  <details className="post-draft-checks-details">
                    <summary>Детали проверок</summary>
                    <Stack gap={4}>
                      <Text size="sm">NSFW: {formatCheckResult(latestModeration.checks.nsfw)}</Text>
                      <Text size="sm">Токсичность: {formatCheckResult(latestModeration.checks.toxicity)}</Text>
                      <Text size="sm">
                        Запрещенные темы: {formatCheckResult(latestModeration.checks.forbiddenTopics)}
                      </Text>
                      <Text size="sm">Политики: {formatCheckResult(latestModeration.checks.policy)}</Text>
                    </Stack>
                  </details>
                ) : null}
              </Stack>
            </Card>

            {hasFailedModerationCheck ? (
              <Textarea
                label="Причина ручного подтверждения (если проверки не пройдены)"
                placeholder="Укажите причину, если подтверждаете публикацию несмотря на непройденные проверки"
                value={overrideReason}
                onChange={(event) => setOverrideReason(event.currentTarget.value)}
                minRows={2}
              />
            ) : null}
            {draft.status === 'draft' && !canApprove ? (
              <Text size="sm" c="dimmed">
                Чтобы подтвердить черновик, сначала запустите проверки и дождитесь статуса «Пройдена».
              </Text>
            ) : null}

            <Group className="post-draft-actions-row">
              {draft.status === 'draft' ? (
                <AppButton
                  variant="default"
                  onClick={() => runChecksMutation.mutate()}
                  loading={runChecksMutation.isPending}
                >
                  Запустить проверки
                </AppButton>
              ) : null}
              {draft.status === 'draft' ? (
                <AppButton
                  color="green"
                  onClick={() => approveDraftMutation.mutate()}
                  loading={approveDraftMutation.isPending}
                  disabled={!canApprove}
                >
                  Подтвердить
                </AppButton>
              ) : null}
              {draft.status === 'approved' ? (
                <AppButton
                  variant="default"
                  onClick={() => unapproveDraftMutation.mutate()}
                  loading={unapproveDraftMutation.isPending}
                >
                  Снять подтверждение
                </AppButton>
              ) : null}
              <AppButton
                color="cyan"
                onClick={() => markPublishedMutation.mutate()}
                loading={markPublishedMutation.isPending}
                disabled={draft.status !== 'approved'}
              >
                Отметить опубликованным
              </AppButton>
              <AppButton
                variant="light"
                onClick={() =>
                  navigate(buildPostDraftExportRoute(draft.id), {
                    state: { from: `${location.pathname}${location.search}${location.hash}` },
                  })
                }
              >
                Открыть экспорт
              </AppButton>
            </Group>
          </>
        ) : null}

        {details?.assets?.length ? (
          <Stack gap={6}>
            <Text size="sm" fw={600}>
              Выбранные ассеты (превью)
            </Text>
            {(details.assets ?? [])
              .filter((asset) => selectedAssetIds.includes(asset.id))
              .map((asset) => {
                const assetUrl = resolveAssetUrl(asset.url)
                const previewable = asset.type === 'image' || asset.type === 'video'

                return (
                  <Card key={asset.id} withBorder radius="sm" p="sm">
                    <Stack gap={6}>
                      <Text size="sm">
                        {formatAssetTypeLabel(asset.type)} • {formatRuDateTime(asset.createdAt)}
                      </Text>
                      {assetUrl ? (
                        <div className="post-draft-selected-asset-media-frame">
                          {asset.type === 'image' ? (
                            <img
                              src={assetUrl}
                              alt="Выбранный ассет"
                              className="post-draft-selected-asset-media"
                            />
                          ) : asset.type === 'video' ? (
                            <video
                              src={assetUrl}
                              controls
                              preload="metadata"
                              className="post-draft-selected-asset-media"
                            />
                          ) : null}
                        </div>
                      ) : null}
                      {assetUrl ? (
                        <Group gap="xs">
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
                        </Group>
                      ) : null}
                    </Stack>
                  </Card>
                )
              })}
          </Stack>
        ) : null}
      </Stack>

      <AssetViewerModal
        opened={Boolean(previewAsset)}
        asset={previewAsset}
        onClose={() => setPreviewAsset(null)}
      />
    </Card>
  )
}




