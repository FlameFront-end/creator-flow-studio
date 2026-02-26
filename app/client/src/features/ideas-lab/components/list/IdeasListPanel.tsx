import { Group, Loader, Paper, Stack, Text, Title } from '@ui/core'
import { AppButton } from '../../../../shared/components/AppButton'
import { useEffect, useMemo, useState } from 'react'
import { TransientErrorAlert } from '../../../../shared/components/TransientErrorAlert'
import { getErrorMessage } from '../../../../shared/lib/httpError'
import type { IdeasLabController } from '../../hooks/useIdeasLabController'
import { IdeasListItemCard } from './IdeasListItemCard'
import { IdeasListSkeleton } from './IdeasListSkeleton'

type IdeasListPanelProps = {
  controller: IdeasLabController
  showPendingState?: boolean
}

export const IdeasListPanel = ({ controller, showPendingState = false }: IdeasListPanelProps) => {
  const ideas = controller.ideasQuery.data ?? []
  const hasIdeas = ideas.length > 0
  const showIdeasSkeletons = !hasIdeas && (controller.isWaitingForIdeas || showPendingState)
  const showAppendingIdeasSkeletons = hasIdeas && (controller.isWaitingForIdeas || showPendingState)
  const showHeaderHint = hasIdeas || showIdeasSkeletons || showAppendingIdeasSkeletons
  const skeletonIdeasCount = useMemo(() => {
    const parsed = Number(controller.count)
    if (!Number.isFinite(parsed)) {
      return 3
    }
    return Math.min(8, Math.max(1, Math.floor(parsed)))
  }, [controller.count])
  const showClearIdeasButton = Boolean(controller.projectId) && hasIdeas
  const [transientError, setTransientError] = useState<string | null>(null)

  useEffect(() => {
    if (controller.generateScriptMutation.isError) {
      setTransientError(
        getErrorMessage(
          controller.generateScriptMutation.error,
          'Не удалось поставить генерацию сценария в очередь',
        ),
      )
      return
    }

    if (controller.generateCaptionMutation.isError) {
      setTransientError(
        getErrorMessage(
          controller.generateCaptionMutation.error,
          'Не удалось поставить генерацию подписи в очередь',
        ),
      )
      return
    }

    if (controller.generateImagePromptMutation.isError) {
      setTransientError(
        getErrorMessage(
          controller.generateImagePromptMutation.error,
          'Не удалось сгенерировать промпт изображения',
        ),
      )
      return
    }

    if (controller.generateVideoPromptMutation.isError) {
      setTransientError(
        getErrorMessage(
          controller.generateVideoPromptMutation.error,
          'Не удалось сгенерировать промпт видео',
        ),
      )
      return
    }

    if (controller.generateImageMutation.isError) {
      setTransientError(
        getErrorMessage(
          controller.generateImageMutation.error,
          'Не удалось поставить генерацию изображения в очередь',
        ),
      )
      return
    }

    if (controller.generateVideoMutation.isError) {
      setTransientError(
        getErrorMessage(
          controller.generateVideoMutation.error,
          'Не удалось поставить генерацию видео в очередь',
        ),
      )
    }
  }, [
    controller.generateCaptionMutation.error,
    controller.generateCaptionMutation.isError,
    controller.generateImageMutation.error,
    controller.generateImageMutation.isError,
    controller.generateImagePromptMutation.error,
    controller.generateImagePromptMutation.isError,
    controller.generateVideoPromptMutation.error,
    controller.generateVideoPromptMutation.isError,
    controller.generateScriptMutation.error,
    controller.generateScriptMutation.isError,
    controller.generateVideoMutation.error,
    controller.generateVideoMutation.isError,
  ])

  return (
    <Paper className="panel-surface ideas-list-panel" radius={24} p="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={4}>Список идей</Title>
            {showHeaderHint ? (
              <Text size="xs" c="dimmed">
                Нажмите на карточку, чтобы выбрать идею. Все этапы генерации доступны в едином списке.
              </Text>
            ) : null}
          </Stack>
          {showClearIdeasButton ? (
            <AppButton
              size="xs"
              variant="default"
              color="red"
              loading={controller.clearIdeasMutation.isPending}
              disabled={controller.clearIdeasMutation.isPending}
              onClick={() => controller.setClearIdeasModalOpen(true)}
            >
              Очистить идеи
            </AppButton>
          ) : null}
        </Group>

        {!hasIdeas ? (
          showIdeasSkeletons ? (
            <Stack gap={6}>
              <Group gap="xs">
                <Loader size="xs" />
                <Text c="dimmed">Генерация запущена, ожидаем первые идеи...</Text>
              </Group>
              <IdeasListSkeleton count={skeletonIdeasCount} scope="empty" />
            </Stack>
          ) : (
            <div className="ideas-empty-state">
              <Text fw={700}>Идей пока нет</Text>
              <Text size="sm" c="dimmed">
                Запустите генерацию во вкладке «Бриф».
              </Text>
            </div>
          )
        ) : (
          <Stack gap="sm">
            {ideas.map((idea) => (
              <IdeasListItemCard key={idea.id} idea={idea} controller={controller} />
            ))}

            {showAppendingIdeasSkeletons ? (
              <Stack gap={6}>
                <IdeasListSkeleton count={skeletonIdeasCount} scope="append" />
              </Stack>
            ) : null}
          </Stack>
        )}

        <TransientErrorAlert error={transientError} onHide={() => setTransientError(null)} />
      </Stack>
    </Paper>
  )
}
