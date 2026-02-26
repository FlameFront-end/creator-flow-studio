import type { IdeasLabController, IdeasLabIdea } from '../../hooks/useIdeasLabController'
import type { IdeaStepKey, StepAction } from './ideasListItem.types'

type BuildIdeaStepActionsParams = {
  idea: IdeasLabIdea
  controller: IdeasLabController
  scriptDone: boolean
  captionDone: boolean
  scriptRunning: boolean
  captionRunning: boolean
  scriptFailed: boolean
  captionFailed: boolean
  hasSucceededScript: boolean
  hasSucceededCaption: boolean
  canRunCaptionGeneration: boolean
  canRunPromptGeneration: boolean
  imagePromptDone: boolean
  videoPromptDone: boolean
  imagePromptPending: boolean
  videoPromptPending: boolean
  hasAnyImage: boolean
  hasAnyVideo: boolean
  imageRunning: boolean
  videoRunning: boolean
  imageFailed: boolean
  videoFailed: boolean
  scriptCreatePending: boolean
  scriptRegenPending: boolean
  captionCreatePending: boolean
  captionRegenPending: boolean
  imageCreatePending: boolean
  imageRegenPending: boolean
  videoCreatePending: boolean
  videoRegenPending: boolean
}

export const buildIdeaStepActions = ({
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
}: BuildIdeaStepActionsParams): Record<IdeaStepKey, StepAction> => ({
  script: {
    label: scriptFailed
      ? 'Повторить'
      : hasSucceededScript || scriptDone || scriptRegenPending
        ? 'Новая версия'
        : 'Создать',
    loading:
      ((hasSucceededScript || scriptDone || scriptRegenPending)
        ? scriptRegenPending
        : scriptCreatePending) || scriptRunning,
    onClick: () => {
      const useRegenerateAction = hasSucceededScript || scriptDone || scriptRegenPending
      controller.generateScriptMutation.mutate({
        ideaId: idea.id,
        regenerate: useRegenerateAction,
      })
    },
  },
  caption: {
    label: captionFailed
      ? 'Повторить'
      : hasSucceededCaption || captionDone || captionRegenPending
        ? 'Новая версия'
        : 'Создать',
    loading:
      ((hasSucceededCaption || captionDone || captionRegenPending)
        ? captionRegenPending
        : captionCreatePending) || captionRunning,
    disabled: !canRunCaptionGeneration,
    onClick: () => {
      const useRegenerateAction = hasSucceededCaption || captionDone || captionRegenPending
      controller.generateCaptionMutation.mutate({
        ideaId: idea.id,
        regenerate: useRegenerateAction,
      })
    },
  },
  image_prompt: {
    label: imagePromptDone ? 'Новая версия' : 'Создать',
    loading: imagePromptPending,
    disabled: !canRunPromptGeneration || imagePromptPending,
    onClick: () => controller.generateImagePromptMutation.mutate(idea.id),
  },
  video_prompt: {
    label: videoPromptDone ? 'Новая версия' : 'Создать',
    loading: videoPromptPending,
    disabled: !canRunPromptGeneration || videoPromptPending,
    onClick: () => controller.generateVideoPromptMutation.mutate(idea.id),
  },
  image: {
    label: imageFailed ? 'Повторить' : hasAnyImage || imageRegenPending ? 'Новая версия' : 'Создать',
    loading: ((hasAnyImage || imageRegenPending) ? imageRegenPending : imageCreatePending) || imageRunning,
    disabled: !imagePromptDone || imagePromptPending,
    onClick: () => {
      const useRegenerateAction = hasAnyImage || imageRegenPending
      controller.generateImageMutation.mutate({
        ideaId: idea.id,
        regenerate: useRegenerateAction,
      })
    },
  },
  video: {
    label: videoFailed ? 'Повторить' : hasAnyVideo || videoRegenPending ? 'Новая версия' : 'Создать',
    loading: ((hasAnyVideo || videoRegenPending) ? videoRegenPending : videoCreatePending) || videoRunning,
    disabled: !videoPromptDone || videoPromptPending,
    onClick: () => {
      const useRegenerateAction = hasAnyVideo || videoRegenPending
      controller.generateVideoMutation.mutate({
        ideaId: idea.id,
        regenerate: useRegenerateAction,
      })
    },
  },
})
