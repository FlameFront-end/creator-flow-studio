import type { IdeasLabController, IdeasLabIdea } from '../../hooks/useIdeasLabController'
import { formatStatusLabel } from '../../lib/ideasLab.formatters'
import { IDEA_PIPELINE_STEP_COUNT } from './ideasListPanel.constants'
import type { IdeaStepKey, IdeaStepState, StepAction } from './ideasListItem.types'
import { buildIdeaStepActions } from './ideasListItem.actions'

type IdeasListItemModel = {
  steps: IdeaStepState[]
  stepActions: Record<IdeaStepKey, StepAction>
  completedStepCount: number
  pipelineProgress: number
  selected: boolean
  isIdeaFailed: boolean
}

const resolveStepStatusColor = (status: string): string => {
  const normalized = status.trim().toLowerCase()
  if (normalized.includes('ошиб')) return 'red.4'
  if (normalized.includes('успех') || normalized.includes('готов')) return 'green.4'
  if (normalized.includes('в процессе') || normalized.includes('в очереди')) return 'cyan.4'
  if (normalized.includes('ожидает')) return 'orange.4'
  return 'dimmed'
}

export const buildIdeasListItemModel = (
  idea: IdeasLabIdea,
  controller: IdeasLabController,
): IdeasListItemModel => {
  const scriptDone = idea.latestScript?.status === 'succeeded'
  const captionDone = idea.latestCaption?.status === 'succeeded'
  const scriptRunning = idea.latestScript?.status === 'running'
  const captionRunning = idea.latestCaption?.status === 'running'
  const scriptFailed = idea.latestScript?.status === 'failed'
  const captionFailed = idea.latestCaption?.status === 'failed'
  const hasSucceededScript = (idea.scriptSucceededCount ?? 0) > 0
  const canRunCaptionGeneration = hasSucceededScript && !scriptRunning
  const canRunPromptGeneration = hasSucceededScript && !scriptRunning
  const hasSucceededCaption = (idea.captionSucceededCount ?? 0) > 0
  const imagePromptDone = Boolean(idea.imagePrompt)
  const videoPromptDone = Boolean(idea.videoPrompt)
  const imageSucceededCount = idea.imageSucceededCount ?? (idea.latestImage?.status === 'succeeded' ? 1 : 0)
  const videoSucceededCount = idea.videoSucceededCount ?? (idea.latestVideo?.status === 'succeeded' ? 1 : 0)
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
    : scriptRunning
      ? 'Ожидает сценарий'
    : imagePromptDone
      ? formatStatusLabel('succeeded')
      : canRunPromptGeneration
        ? 'Готов к запуску'
        : 'Ожидает сценарий'

  const videoPromptPending =
    controller.generateVideoPromptMutation.isPending &&
    controller.generateVideoPromptMutation.variables === idea.id

  const videoPromptStatusLabel = videoPromptPending
    ? 'Выполняется'
    : scriptRunning
      ? 'Ожидает сценарий'
    : videoPromptDone
      ? formatStatusLabel('succeeded')
      : canRunPromptGeneration
        ? 'Готов к запуску'
        : 'Ожидает сценарий'

  const hasReadyCaptionVersion = hasSucceededCaption || captionDone
  const captionStatusLabel = scriptRunning
    ? hasReadyCaptionVersion
      ? 'Успех, ожидает сценарий'
      : 'Ожидает сценарий'
    : !canRunCaptionGeneration
    ? 'Ожидает сценарий'
    : captionDone
      ? formatStatusLabel('succeeded')
      : captionFailed
        ? formatStatusLabel('failed')
        : captionRunning
          ? formatStatusLabel('running')
          : 'Готов к запуску'

  const waitingForPromptLabel = 'Ожидает промпт'
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

  const scriptStatusLabel = formatStatusLabel(idea.latestScript?.status ?? 'queued')
  const steps: IdeaStepState[] = [
    {
      key: 'script',
      label: 'Сценарий',
      done: scriptDone,
      status: scriptStatusLabel,
      statusColor: resolveStepStatusColor(scriptStatusLabel),
    },
    {
      key: 'caption',
      label: 'Подпись',
      done: captionDone && !scriptRunning,
      status: captionStatusLabel,
      statusColor: resolveStepStatusColor(captionStatusLabel),
    },
    {
      key: 'image_prompt',
      label: 'Промпт изображения',
      done: imagePromptDone && !scriptRunning,
      status: imagePromptStatusLabel,
      statusColor: resolveStepStatusColor(imagePromptStatusLabel),
    },
    {
      key: 'video_prompt',
      label: 'Промпт видео',
      done: videoPromptDone && !scriptRunning,
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

  const stepActions = buildIdeaStepActions({
    idea,
    controller,
    scriptDone,
    captionDone,
    scriptRunning,
    captionRunning,
    scriptFailed,
    captionFailed,
    hasSucceededScript,
    hasSucceededCaption,
    canRunCaptionGeneration,
    canRunPromptGeneration,
    imagePromptDone,
    videoPromptDone,
    imagePromptPending,
    videoPromptPending,
    hasAnyImage,
    hasAnyVideo,
    imageRunning,
    videoRunning,
    imageFailed,
    videoFailed,
    scriptCreatePending,
    scriptRegenPending,
    captionCreatePending,
    captionRegenPending,
    imageCreatePending,
    imageRegenPending,
    videoCreatePending,
    videoRegenPending,
  })

  const completedStepCount = steps.filter((step) => step.done).length

  return {
    steps,
    stepActions,
    completedStepCount,
    pipelineProgress: Math.round((completedStepCount / IDEA_PIPELINE_STEP_COUNT) * 100),
    selected: controller.selectedIdeaId === idea.id,
    isIdeaFailed: idea.status === 'failed',
  }
}
