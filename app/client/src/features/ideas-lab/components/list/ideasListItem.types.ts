export type IdeaStepKey = 'script' | 'caption' | 'image_prompt' | 'video_prompt' | 'image' | 'video'

export type IdeaStepState = {
  key: IdeaStepKey
  label: string
  done: boolean
  status: string
  statusColor: string
}

export type StepAction = {
  label: string
  loading: boolean
  disabled?: boolean
  onClick: () => void
}
