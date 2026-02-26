import { Card, Group, Loader, Paper, Progress, Stack, Text, ThemeIcon, Title } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { IconCheck, IconCircleDashed } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import { TransientErrorAlert } from '../../../shared/components/TransientErrorAlert'
import { getErrorMessage } from '../../../shared/lib/httpError'
import type { IdeasLabController } from '../hooks/useIdeasLabController'
import { formatIdeaFormatLabel, formatStatusLabel } from '../lib/ideasLab.formatters'

const IDEA_PIPELINE_STEP_COUNT = 6

type IdeaStepKey =
  | 'script'
  | 'caption'
  | 'image_prompt'
  | 'video_prompt'
  | 'image'
  | 'video'

type IdeaStepState = {
  key: IdeaStepKey
  label: string
  done: boolean
  status: string
  statusColor: string
}

type StepAction = {
  label: string
  loading: boolean
  disabled?: boolean
  onClick: () => void
}

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

  const renderIdeasSkeletonList = (scope: 'empty' | 'append') => (
    <Stack gap="sm" className="ideas-skeleton-list">
      {Array.from({ length: skeletonIdeasCount }).map((_, index) => (
        <Card
          key={`${scope}-ideas-skeleton-${index}`}
          withBorder
          radius="md"
          p="md"
          className="ideas-skeleton-card"
        >
          <Stack gap="sm">
            <Group justify="space-between" align="flex-start" wrap="nowrap">
              <Stack gap={4} style={{ flex: 1 }}>
                <div className="ideas-skeleton-line ideas-skeleton-line-title" />
                <div className="ideas-skeleton-line ideas-skeleton-line-subtitle" />
                <div className="ideas-skeleton-line ideas-skeleton-line-subtitle ideas-skeleton-line-short" />
              </Stack>
              <div className="ideas-skeleton-pill ideas-skeleton-pill-danger" />
            </Group>

            <Group gap="xs" wrap="wrap">
              <div className="ideas-skeleton-pill" />
              <div className="ideas-skeleton-pill" />
              <div className="ideas-skeleton-pill ideas-skeleton-pill-wide" />
            </Group>

            <Stack gap={6}>
              <Group justify="space-between" wrap="nowrap">
                <div className="ideas-skeleton-line ideas-skeleton-line-caption" />
                <div className="ideas-skeleton-line ideas-skeleton-line-caption ideas-skeleton-line-caption-short" />
              </Group>
              <div className="ideas-skeleton-progress" />
            </Stack>

            <Stack gap={8}>
              {Array.from({ length: IDEA_PIPELINE_STEP_COUNT }).map((_, stepIndex) => (
                <Group
                  key={`${scope}-ideas-skeleton-step-${index}-${stepIndex}`}
                  justify="space-between"
                  wrap="nowrap"
                >
                  <Group gap="xs" wrap="nowrap">
                    <div className="ideas-skeleton-dot" />
                    <div className="ideas-skeleton-line ideas-skeleton-line-step" />
                  </Group>
                  <Group gap="xs" wrap="nowrap">
                    <div className="ideas-skeleton-line ideas-skeleton-line-status" />
                    <div className="ideas-skeleton-pill ideas-skeleton-pill-action" />
                  </Group>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>
      ))}
    </Stack>
  )

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
              {renderIdeasSkeletonList('empty')}
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
            {ideas.map((idea) => {
            const scriptDone = idea.latestScript?.status === 'succeeded'
            const captionDone = idea.latestCaption?.status === 'succeeded'
            const scriptRunning = idea.latestScript?.status === 'running'
            const captionRunning = idea.latestCaption?.status === 'running'
            const scriptFailed = idea.latestScript?.status === 'failed'
            const captionFailed = idea.latestCaption?.status === 'failed'
            const hasSucceededScript = (idea.scriptSucceededCount ?? 0) > 0
            const hasSucceededCaption = (idea.captionSucceededCount ?? 0) > 0
            const imagePromptDone = Boolean(idea.imagePrompt)
            const videoPromptDone = Boolean(idea.videoPrompt)
            const imageSucceededCount =
              idea.imageSucceededCount ??
              (idea.latestImage?.status === 'succeeded' ? 1 : 0)
            const videoSucceededCount =
              idea.videoSucceededCount ??
              (idea.latestVideo?.status === 'succeeded' ? 1 : 0)
            const imageTotalCount = idea.imageAssetsCount ?? (idea.latestImage ? 1 : 0)
            const videoTotalCount = idea.videoAssetsCount ?? (idea.latestVideo ? 1 : 0)
            const hasAnyImage = imageSucceededCount > 0
            const hasAnyVideo = videoSucceededCount > 0
            const imagePendingCount = Math.max(0, imageTotalCount - imageSucceededCount)
            const videoPendingCount = Math.max(0, videoTotalCount - videoSucceededCount)
            const imageRunning = idea.latestImageStatus === 'running'
            const videoRunning = idea.latestVideoStatus === 'running'
            const imageFailed = idea.latestImageStatus === 'failed'
            const videoFailed = idea.latestVideoStatus === 'failed'

            const scriptCreatePending =
              controller.generateScriptMutation.isPending &&
              controller.generateScriptMutation.variables?.ideaId === idea.id &&
              controller.generateScriptMutation.variables?.regenerate === false

            const scriptRegenPending =
              controller.generateScriptMutation.isPending &&
              controller.generateScriptMutation.variables?.ideaId === idea.id &&
              controller.generateScriptMutation.variables?.regenerate === true

            const captionCreatePending =
              controller.generateCaptionMutation.isPending &&
              controller.generateCaptionMutation.variables?.ideaId === idea.id &&
              controller.generateCaptionMutation.variables?.regenerate === false

            const captionRegenPending =
              controller.generateCaptionMutation.isPending &&
              controller.generateCaptionMutation.variables?.ideaId === idea.id &&
              controller.generateCaptionMutation.variables?.regenerate === true

            const imagePromptPending =
              controller.generateImagePromptMutation.isPending &&
              controller.generateImagePromptMutation.variables === idea.id

            const imagePromptStatusLabel = imagePromptPending
              ? 'Выполняется'
              : imagePromptDone
                ? formatStatusLabel('succeeded')
                : hasSucceededScript
                ? 'Готов к запуску'
                : 'Ожидает сценарий'

            const videoPromptPending =
              controller.generateVideoPromptMutation.isPending &&
              controller.generateVideoPromptMutation.variables === idea.id

            const videoPromptStatusLabel = videoPromptPending
              ? 'Выполняется'
              : videoPromptDone
                ? formatStatusLabel('succeeded')
                : hasSucceededScript
                ? 'Готов к запуску'
                : 'Ожидает сценарий'

            const captionStatusLabel = !hasSucceededScript
              ? 'Ожидает сценарий'
              : captionDone
                ? formatStatusLabel('succeeded')
                : captionFailed
                  ? formatStatusLabel('failed')
                  : captionRunning
                    ? formatStatusLabel('running')
                    : 'Готов к запуску'

            const waitingForPromptLabel = !hasSucceededScript
              ? 'Ожидает сценарий'
              : 'Ожидает промпт'
            const imageStatusLabel = imageRunning
              ? 'Выполняется'
              : hasAnyImage
                ? imagePendingCount > 0
                  ? 'Успех, в очереди'
                  : 'Успех'
                : imagePromptPending
                  ? waitingForPromptLabel
                  : imagePromptDone
                    ? 'Готов к запуску'
                    : waitingForPromptLabel

            const videoStatusLabel = videoRunning
              ? 'Выполняется'
              : hasAnyVideo
                ? videoPendingCount > 0
                  ? 'Успех, в очереди'
                  : 'Успех'
                : videoPromptPending
                  ? waitingForPromptLabel
                  : videoPromptDone
                    ? 'Готов к запуску'
                    : waitingForPromptLabel

            const imageCreatePending =
              controller.generateImageMutation.isPending &&
              controller.generateImageMutation.variables?.ideaId === idea.id &&
              controller.generateImageMutation.variables?.regenerate === false

            const imageRegenPending =
              controller.generateImageMutation.isPending &&
              controller.generateImageMutation.variables?.ideaId === idea.id &&
              controller.generateImageMutation.variables?.regenerate === true

            const videoRegenPending =
              controller.generateVideoMutation.isPending &&
              controller.generateVideoMutation.variables?.ideaId === idea.id &&
              controller.generateVideoMutation.variables?.regenerate === true

            const videoCreatePending =
              controller.generateVideoMutation.isPending &&
              controller.generateVideoMutation.variables?.ideaId === idea.id &&
              controller.generateVideoMutation.variables?.regenerate === false

            const steps: IdeaStepState[] = [
              {
                key: 'script',
                label: 'Сценарий',
                done: scriptDone,
                status: formatStatusLabel(idea.latestScript?.status ?? 'queued'),
                statusColor: resolveStepStatusColor(formatStatusLabel(idea.latestScript?.status ?? 'queued')),
              },
              {
                key: 'caption',
                label: 'Подпись',
                done: captionDone,
                status: captionStatusLabel,
                statusColor: resolveStepStatusColor(captionStatusLabel),
              },
              {
                key: 'image_prompt',
                label: 'Промпт изображения',
                done: imagePromptDone,
                status: imagePromptStatusLabel,
                statusColor: resolveStepStatusColor(imagePromptStatusLabel),
              },
              {
                key: 'video_prompt',
                label: 'Промпт видео',
                done: videoPromptDone,
                status: videoPromptStatusLabel,
                statusColor: resolveStepStatusColor(videoPromptStatusLabel),
              },
              {
                key: 'image',
                label: 'Изображение',
                done: hasAnyImage,
                status: imageStatusLabel,
                statusColor: resolveStepStatusColor(imageStatusLabel),
              },
              {
                key: 'video',
                label: 'Видео',
                done: hasAnyVideo,
                status: videoStatusLabel,
                statusColor: resolveStepStatusColor(videoStatusLabel),
              },
            ]

            const completedStepCount = steps.filter((step) => step.done).length
            const pipelineProgress = Math.round((completedStepCount / IDEA_PIPELINE_STEP_COUNT) * 100)
            const selected = controller.selectedIdeaId === idea.id
            const isIdeaFailed = idea.status === 'failed'

            const getStepAction = (stepKey: IdeaStepKey): StepAction => {
              if (stepKey === 'script') {
                const useRegenerateAction =
                  hasSucceededScript || scriptDone || scriptRegenPending
                return {
                  label: scriptFailed
                    ? 'Повторить'
                    : useRegenerateAction
                      ? 'Новая версия'
                      : 'Создать',
                  loading:
                    (useRegenerateAction ? scriptRegenPending : scriptCreatePending) ||
                    scriptRunning,
                  onClick: () =>
                    controller.generateScriptMutation.mutate({
                      ideaId: idea.id,
                      regenerate: useRegenerateAction,
                    }),
                }
              }

              if (stepKey === 'caption') {
                const useRegenerateAction =
                  hasSucceededCaption || captionDone || captionRegenPending
                return {
                  label: captionFailed
                    ? 'Повторить'
                    : useRegenerateAction
                      ? 'Новая версия'
                      : 'Создать',
                  loading:
                    (useRegenerateAction ? captionRegenPending : captionCreatePending) ||
                    captionRunning,
                  disabled: !hasSucceededScript,
                  onClick: () =>
                    controller.generateCaptionMutation.mutate({
                      ideaId: idea.id,
                      regenerate: useRegenerateAction,
                    }),
                }
              }

              if (stepKey === 'image_prompt') {
                return {
                  label: imagePromptDone ? 'Новая версия' : 'Создать',
                  loading: imagePromptPending,
                  disabled: !hasSucceededScript || imagePromptPending,
                  onClick: () => controller.generateImagePromptMutation.mutate(idea.id),
                }
              }

              if (stepKey === 'video_prompt') {
                return {
                  label: videoPromptDone ? 'Новая версия' : 'Создать',
                  loading: videoPromptPending,
                  disabled: !hasSucceededScript || videoPromptPending,
                  onClick: () => controller.generateVideoPromptMutation.mutate(idea.id),
                }
              }

              if (stepKey === 'image') {
                const useRegenerateAction = hasAnyImage || imageRegenPending
                return {
                  label: imageFailed
                    ? 'Повторить'
                    : useRegenerateAction
                      ? 'Новая версия'
                      : 'Создать',
                  loading:
                    (useRegenerateAction ? imageRegenPending : imageCreatePending) ||
                    imageRunning,
                  disabled: !imagePromptDone || imagePromptPending,
                  onClick: () =>
                    controller.generateImageMutation.mutate({
                      ideaId: idea.id,
                      regenerate: useRegenerateAction,
                    }),
                }
              }

              const useRegenerateAction = hasAnyVideo || videoRegenPending
              return {
                label: videoFailed
                  ? 'Повторить'
                  : useRegenerateAction
                    ? 'Новая версия'
                    : 'Создать',
                loading:
                  (useRegenerateAction ? videoRegenPending : videoCreatePending) ||
                  videoRunning,
                disabled: !videoPromptDone || videoPromptPending,
                onClick: () =>
                  controller.generateVideoMutation.mutate({
                    ideaId: idea.id,
                    regenerate: useRegenerateAction,
                  }),
              }
            }

            return (
              <Card
                key={idea.id}
                id={`ideas-lab-idea-card-${idea.id}`}
                withBorder
                radius="md"
                p="md"
                style={{
                  cursor: 'pointer',
                  borderColor: selected ? 'var(--appui-color-brand-6)' : undefined,
                  boxShadow: selected ? '0 0 0 1px rgba(26, 144, 255, 0.35)' : undefined,
                }}
                onClick={() => controller.setSelectedIdeaId(idea.id)}
              >
                <Stack gap="sm">
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={3} maw="100%">
                      <Text fw={700} lineClamp={2}>
                        {idea.topic}
                      </Text>
                      <Text size="sm" c="dimmed" lineClamp={2}>
                        {idea.hook}
                      </Text>
                    </Stack>
                    <AppButton
                      size="xs"
                      color="red"
                      variant="subtle"
                      onClick={(event) => {
                        event.stopPropagation()
                        controller.setDeleteIdeaId(idea.id)
                      }}
                    >
                      Удалить
                    </AppButton>
                  </Group>

                  <Group gap="xs" wrap="wrap">
                    <AppBadge variant="light">{formatIdeaFormatLabel(idea.format)}</AppBadge>
                    <AppBadge variant={selected ? 'filled' : 'light'} color={selected ? 'brand' : 'gray'}>
                      {selected ? 'Выбрана' : 'Не выбрана'}
                    </AppBadge>
                    <AppBadge variant="light">
                      Выполнено: {completedStepCount}/{IDEA_PIPELINE_STEP_COUNT}
                    </AppBadge>
                  </Group>

                  <Stack gap={6}>
                    <Group justify="space-between" wrap="nowrap">
                      <Text size="xs" c="dimmed">
                        Прогресс выполнения
                      </Text>
                      <Text size="xs" fw={700} c="dimmed">
                        {pipelineProgress}%
                      </Text>
                    </Group>
                    <Progress value={pipelineProgress} radius="xl" size="sm" color="green" />
                  </Stack>

                  <Stack gap={6}>
                    {steps.map((step) => {
                      const action = getStepAction(step.key)
                      return (
                        <Stack key={step.key} gap={2}>
                          <Group justify="space-between" align="center" wrap="nowrap">
                            <Group gap={8} wrap="nowrap">
                              <ThemeIcon
                                size={18}
                                radius="xl"
                                color={step.done ? 'green' : 'gray'}
                                variant={step.done ? 'light' : 'transparent'}
                              >
                                {step.done ? <IconCheck size={12} /> : <IconCircleDashed size={12} />}
                              </ThemeIcon>
                              <Text size="sm">{step.label}</Text>
                            </Group>
                            <Group gap="xs" wrap="nowrap" align="center">
                              <Text size="0.70rem" c={step.statusColor}>
                                {step.status}
                              </Text>
                              <AppButton
                                size="xs"
                                variant={step.done ? 'default' : 'light'}
                                loading={action.loading}
                                disabled={action.disabled}
                                className="ideas-lab-step-action-btn"
                                style={{ minWidth: 118 }}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  action.onClick()
                                }}
                              >
                                {action.loading ? null : action.label}
                              </AppButton>
                            </Group>
                          </Group>
                        </Stack>
                      )
                    })}
                  </Stack>

                  {isIdeaFailed ? (
                    <AppBadge color="red" variant="light">
                      Требует внимания
                    </AppBadge>
                  ) : null}
                </Stack>
              </Card>
            )
            })}

            {showAppendingIdeasSkeletons ? (
              <Stack gap={6}>
                {renderIdeasSkeletonList('append')}
              </Stack>
            ) : null}
          </Stack>
        )}

        <TransientErrorAlert error={transientError} onHide={() => setTransientError(null)} />
      </Stack>
    </Paper>
  )
}
  const resolveStepStatusColor = (status: string): string => {
    const normalized = status.trim().toLowerCase()
    if (normalized.includes('ошиб')) return 'red.4'
    if (normalized.includes('успех') || normalized.includes('готов')) return 'green.4'
    if (normalized.includes('в процессе') || normalized.includes('в очереди')) return 'cyan.4'
    if (normalized.includes('ожидает')) return 'orange.4'
    return 'dimmed'
  }
