import { Paper, Stack, Text, Title } from '@ui/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ideasApi } from '../../../../shared/api/services/ideas.api'
import { ConfirmActionModal } from '../../../../shared/components/ConfirmActionModal'
import { getErrorMessage } from '../../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast } from '../../../../shared/lib/toast'
import type { IdeasLabController } from '../../hooks/useIdeasLabController'
import {
  ideaDetailsQueryKey,
  ideasQueryKey,
  postDraftLatestQueryKey,
} from '../../model/ideasLab.constants'
import { AssetViewerModal, type AssetViewerPayload } from '../../../../shared/components/AssetViewerModal'
import { PostDraftPanel } from './PostDraftPanel'
import { IdeaAssetsSection } from './IdeaAssetsSection'
import { IdeaCaptionSection } from './IdeaCaptionSection'
import {
  isInProgressStatus,
  pickDisplayCaption,
  pickDisplayScript,
} from './ideaResults.helpers'
import { IdeaPromptSection } from './IdeaPromptSection'
import { IdeaResultsSummaryCard } from './IdeaResultsSummaryCard'
import { IdeaScriptSection } from './IdeaScriptSection'

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

  const scriptRequestPending =
    controller.generateScriptMutation.isPending &&
    controller.generateScriptMutation.variables?.ideaId === selectedIdea?.id
  const captionRequestPending =
    controller.generateCaptionMutation.isPending &&
    controller.generateCaptionMutation.variables?.ideaId === selectedIdea?.id
  const imagePromptPending =
    controller.generateImagePromptMutation.isPending &&
    controller.generateImagePromptMutation.variables === selectedIdea?.id
  const videoPromptPending =
    controller.generateVideoPromptMutation.isPending &&
    controller.generateVideoPromptMutation.variables === selectedIdea?.id
  const imagePromptError =
    controller.generateImagePromptMutation.isError &&
    controller.generateImagePromptMutation.variables === selectedIdea?.id
      ? getErrorMessage(
          controller.generateImagePromptMutation.error,
          'Не удалось сгенерировать промпт изображения',
        )
      : null
  const videoPromptError =
    controller.generateVideoPromptMutation.isError &&
    controller.generateVideoPromptMutation.variables === selectedIdea?.id
      ? getErrorMessage(
          controller.generateVideoPromptMutation.error,
          'Не удалось сгенерировать промпт видео',
        )
      : null

  const scriptGenerating =
    scriptRequestPending || isInProgressStatus(displayedScript?.status)
  const captionGenerating =
    captionRequestPending || isInProgressStatus(displayedCaption?.status)

  const openInNewWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
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
            <IdeaResultsSummaryCard idea={selectedIdea} />

            <div className="ideas-results-text-grid">
              <IdeaScriptSection
                key={`${displayedScript?.id ?? 'script-empty'}-${displayedScript?.error ?? ''}`}
                script={displayedScript}
                generating={scriptGenerating}
              />
              <IdeaCaptionSection
                key={`${displayedCaption?.id ?? 'caption-empty'}-${displayedCaption?.error ?? ''}`}
                caption={displayedCaption}
                generating={captionGenerating}
              />
            </div>

            <div className="ideas-results-text-grid">
              <IdeaPromptSection
                title="Промпт изображения"
                prompt={selectedIdea.imagePrompt}
                pending={imagePromptPending}
                error={imagePromptError}
                emptyText="Промпт изображения еще не сгенерирован"
              />
              <IdeaPromptSection
                title="Промпт видео"
                prompt={selectedIdea.videoPrompt}
                pending={videoPromptPending}
                error={videoPromptError}
                emptyText="Промпт видео еще не сгенерирован"
              />
            </div>

            <IdeaAssetsSection
              assets={detailsQuery.data?.assets ?? []}
              onOpenPreview={(asset) => setPreviewAsset(asset)}
              onOpenInWindow={openInNewWindow}
              onRequestDelete={(assetId) => setDeleteAssetId(assetId)}
            />

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





