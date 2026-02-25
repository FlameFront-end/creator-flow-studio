import { Container, Group, Loader, SimpleGrid, Stack } from '@ui/core'

import { AppButton } from '../../../shared/components/AppButton'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconArrowLeft } from '@tabler/icons-react'
import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { postDraftsApi } from '../../../shared/api/services/postDrafts.api'
import { showErrorToast, showSuccessToast } from '../../../shared/lib/toast'
import { ROUTES } from '../../../shared/model/routes'
import { AssetViewerModal, type AssetViewerPayload } from '../../../shared/components/AssetViewerModal'
import { PostDraftExportAssetsCard } from '../components/PostDraftExportAssetsCard'
import { PostDraftExportCaptionCard } from '../components/PostDraftExportCaptionCard'
import { PostDraftExportHero } from '../components/PostDraftExportHero'
import { PostDraftExportModerationCard } from '../components/PostDraftExportModerationCard'
import { PostDraftExportReadinessCard } from '../components/PostDraftExportReadinessCard'
import { postDraftExportQueryKey } from '../model/postDrafts.queryKeys'
import {
  buildCaptionForCopy,
  getAssetsStats,
  getModerationChecks,
  getPublishChecklist,
} from '../model/postDraftExport.utils'

export default function PostDraftExportPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const [previewAsset, setPreviewAsset] = useState<AssetViewerPayload | null>(null)
  const backTarget = typeof location.state?.from === 'string' ? location.state.from : ROUTES.HOME

  const exportQuery = useQuery({
    queryKey: postDraftExportQueryKey(id),
    queryFn: () => postDraftsApi.getExport(id as string),
    enabled: Boolean(id),
  })

  const refreshExport = async () => {
    await queryClient.invalidateQueries({ queryKey: postDraftExportQueryKey(id) })
    await queryClient.refetchQueries({ queryKey: postDraftExportQueryKey(id), type: 'active' })
  }

  const markPublishedMutation = useMutation({
    mutationFn: () => postDraftsApi.markPublished(id as string),
    onSuccess: async () => {
      await refreshExport()
      showSuccessToast('Пост отмечен как опубликованный вручную')
    },
    onError: (error) => showErrorToast(error, 'Не удалось отметить публикацию'),
  })

  const runChecksMutation = useMutation({
    mutationFn: () => postDraftsApi.runModeration(id as string),
    onSuccess: async () => {
      await refreshExport()
      showSuccessToast('Проверки модерации завершены')
    },
    onError: (error) => showErrorToast(error, 'Не удалось выполнить проверки модерации'),
  })

  const approveMutation = useMutation({
    mutationFn: () => postDraftsApi.approve(id as string, {}),
    onSuccess: async () => {
      await refreshExport()
      showSuccessToast('Черновик подтвержден')
    },
    onError: (error) => showErrorToast(error, 'Не удалось подтвердить черновик'),
  })

  const unapproveMutation = useMutation({
    mutationFn: () => postDraftsApi.unapprove(id as string),
    onSuccess: async () => {
      await refreshExport()
      showSuccessToast('Подтверждение снято')
    },
    onError: (error) => showErrorToast(error, 'Не удалось снять подтверждение'),
  })

  const copyCaption = async () => {
    const payload = exportQuery.data
    if (!payload?.caption) {
      showErrorToast(new Error('Нет подписи'), 'В черновике нет подписи для копирования')
      return
    }

    const text = buildCaptionForCopy(payload.caption.text, payload.caption.hashtags)
    if (!text.trim()) {
      showErrorToast(new Error('Пустая подпись'), 'Подпись пустая')
      return
    }

    await navigator.clipboard.writeText(text)
    showSuccessToast('Подпись скопирована в буфер')
  }

  const copyDraftId = async (draftId: string) => {
    await navigator.clipboard.writeText(draftId)
    showSuccessToast('ID черновика скопирован')
  }

  const copyAssetUrl = (url: string) => {
    void navigator.clipboard.writeText(url)
    showSuccessToast('Ссылка скопирована')
  }

  if (!id) {
    return (
      <Container size="lg" py="xl">
        <AppInlineErrorAlert>Не указан ID черновика</AppInlineErrorAlert>
      </Container>
    )
  }

  if (exportQuery.isLoading) {
    return (
      <Container size="lg" py="xl">
        <Group justify="center">
          <Loader />
        </Group>
      </Container>
    )
  }

  if (exportQuery.isError || !exportQuery.data) {
    return (
      <Container size="lg" py="xl">
        <Stack>
          <AppInlineErrorAlert>Не удалось загрузить данные экспорта</AppInlineErrorAlert>
          <AppButton
            leftSection={<IconArrowLeft size={16} />}
            variant="default"
            onClick={() => navigate(backTarget)}
          >
            Назад в дашборд
          </AppButton>
        </Stack>
      </Container>
    )
  }

  const payload = exportQuery.data
  const moderation = payload.latestModeration
  const canRunChecks = payload.status === 'draft'
  const canApprove = payload.status === 'draft' && moderation?.status === 'passed'
  const canUnapprove = payload.status === 'approved'
  const canMarkPublished = payload.status === 'approved'
  const assetsStats = getAssetsStats(payload.assets)
  const checks = getModerationChecks(moderation)
  const publishChecklist = getPublishChecklist(payload, moderation)

  return (
    <section className="min-h-screen py-9">
      <Container size="xl" className="app-page-container">
        <Stack gap="lg" className="post-export-layout">
          <PostDraftExportHero
            payload={payload}
            imagesCount={assetsStats.images}
            videosCount={assetsStats.videos}
            onBack={() => navigate(backTarget)}
            onCopyDraftId={() => void copyDraftId(payload.id)}
          />

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <PostDraftExportCaptionCard caption={payload.caption} onCopyCaption={() => void copyCaption()} />
            <PostDraftExportReadinessCard
              canMarkPublished={canMarkPublished}
              canUnapprove={canUnapprove}
              canRunChecks={canRunChecks}
              canApprove={Boolean(canApprove)}
              publishChecklist={publishChecklist}
              isRunningChecks={runChecksMutation.isPending}
              isApproving={approveMutation.isPending}
              isUnapproving={unapproveMutation.isPending}
              isMarkingPublished={markPublishedMutation.isPending}
              onRunChecks={() => runChecksMutation.mutate()}
              onApprove={() => approveMutation.mutate()}
              onUnapprove={() => unapproveMutation.mutate()}
              onMarkPublished={() => markPublishedMutation.mutate()}
              onBack={() => navigate(backTarget)}
            />
          </SimpleGrid>

          <PostDraftExportModerationCard moderation={moderation} checks={checks} />
          <PostDraftExportAssetsCard
            assets={payload.assets}
            onOpenPreview={setPreviewAsset}
            onCopyUrl={copyAssetUrl}
          />
        </Stack>

        <AssetViewerModal
          opened={Boolean(previewAsset)}
          asset={previewAsset}
          onClose={() => setPreviewAsset(null)}
        />
      </Container>
    </section>
  )
}




