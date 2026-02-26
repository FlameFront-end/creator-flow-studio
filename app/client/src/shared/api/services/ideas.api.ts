import { axiosInstance } from '../axiosInstance'

export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export type IdeaFormat = 'reel' | 'short' | 'tiktok'
export type AiOperation =
  | 'ideas'
  | 'script'
  | 'caption'
  | 'image_prompt'
  | 'video_prompt'
  | 'image'
  | 'video'
export type AssetType = 'image' | 'video' | 'audio'

export type Script = {
  id: string
  ideaId: string
  text: string | null
  shotList: string[] | null
  status: GenerationStatus
  error: string | null
  createdAt: string
}

export type Caption = {
  id: string
  ideaId: string
  text: string | null
  hashtags: string[] | null
  status: GenerationStatus
  error: string | null
  createdAt: string
}

export type Idea = {
  id: string
  projectId: string
  personaId: string
  topic: string
  hook: string
  format: IdeaFormat
  status: GenerationStatus
  error: string | null
  createdAt: string
  imagePrompt: string | null
  videoPrompt: string | null
  latestScript: Script | null
  latestCaption: Caption | null
  latestImage: Asset | null
  latestVideo: Asset | null
  latestImageStatus?: GenerationStatus | null
  latestVideoStatus?: GenerationStatus | null
  scriptSucceededCount?: number
  captionSucceededCount?: number
  imageAssetsCount?: number
  videoAssetsCount?: number
  imageSucceededCount?: number
  videoSucceededCount?: number
}

export type IdeaDetails = Omit<Idea, 'latestScript' | 'latestCaption'> & {
  scripts: Script[]
  captions: Caption[]
  assets: Asset[]
}

export type Asset = {
  id: string
  ideaId: string
  type: AssetType
  url: string | null
  mime: string | null
  width: number | null
  height: number | null
  duration: number | null
  sourcePrompt: string | null
  provider: string | null
  status: GenerationStatus
  error: string | null
  createdAt: string
}

export type AiRunLog = {
  id: string
  provider: string
  model: string
  operation: AiOperation
  projectId: string | null
  ideaId: string | null
  latencyMs: number | null
  tokens: number | null
  requestId: string | null
  status: GenerationStatus
  error: string | null
  errorCode?: string | null
  rawResponse?: string | null
  createdAt: string
}

export type GenerateIdeasRequest = {
  projectId: string
  personaId: string
  topic: string
  count: number
  format: IdeaFormat
}

export type GenerateIdeasResponse = {
  jobId: string
  status: GenerationStatus
}

export type GenerateAssetRequest = {
  regenerate?: boolean
}

export type GenerateScriptResponse = {
  jobId: string
  scriptId: string
  status: GenerationStatus
}

export type GenerateCaptionResponse = {
  jobId: string
  captionId: string
  status: GenerationStatus
}

export type GenerateImagePromptResponse = {
  prompt: string
}

export type GenerateImageResponse = {
  jobId: string
  assetId: string
  status: GenerationStatus
}

export type ClearResponse = {
  deleted: number
}

export const ideasApi = {
  async generateIdeas(payload: GenerateIdeasRequest): Promise<GenerateIdeasResponse> {
    const { data } = await axiosInstance.post<GenerateIdeasResponse>('/ideas/generate', payload)
    return data
  },
  async generateScript(ideaId: string, payload: GenerateAssetRequest): Promise<GenerateScriptResponse> {
    const { data } = await axiosInstance.post<GenerateScriptResponse>(
      `/ideas/${ideaId}/script/generate`,
      payload,
    )
    return data
  },
  async generateCaption(ideaId: string, payload: GenerateAssetRequest): Promise<GenerateCaptionResponse> {
    const { data } = await axiosInstance.post<GenerateCaptionResponse>(
      `/ideas/${ideaId}/caption/generate`,
      payload,
    )
    return data
  },
  async generateImagePrompt(ideaId: string): Promise<GenerateImagePromptResponse> {
    const { data } = await axiosInstance.post<GenerateImagePromptResponse>(
      `/ideas/${ideaId}/image-prompt/generate`,
    )
    return data
  },
  async generateVideoPrompt(ideaId: string): Promise<GenerateImagePromptResponse> {
    const { data } = await axiosInstance.post<GenerateImagePromptResponse>(
      `/ideas/${ideaId}/video-prompt/generate`,
    )
    return data
  },
  async generateImage(ideaId: string, payload: GenerateAssetRequest): Promise<GenerateImageResponse> {
    const { data } = await axiosInstance.post<GenerateImageResponse>(`/ideas/${ideaId}/images/generate`, payload)
    return data
  },
  async generateVideo(ideaId: string, payload: GenerateAssetRequest): Promise<GenerateImageResponse> {
    const { data } = await axiosInstance.post<GenerateImageResponse>(`/ideas/${ideaId}/videos/generate`, payload)
    return data
  },
  async getIdeas(projectId: string): Promise<Idea[]> {
    const { data } = await axiosInstance.get<Idea[]>('/ideas', {
      params: { projectId },
    })
    return data
  },
  async getIdea(ideaId: string): Promise<IdeaDetails> {
    const { data } = await axiosInstance.get<IdeaDetails>(`/ideas/${ideaId}`)
    return data
  },
  async getLogs(projectId: string, limit = 50): Promise<AiRunLog[]> {
    const { data } = await axiosInstance.get<AiRunLog[]>('/ideas/logs', {
      params: { projectId, limit },
    })
    return data
  },
  async clearIdeas(projectId: string): Promise<ClearResponse> {
    const { data } = await axiosInstance.delete<ClearResponse>('/ideas', {
      params: { projectId },
    })
    return data
  },
  async clearLogs(projectId: string): Promise<ClearResponse> {
    const { data } = await axiosInstance.delete<ClearResponse>('/ideas/logs', {
      params: { projectId },
    })
    return data
  },
  async removeIdea(ideaId: string): Promise<ClearResponse> {
    const { data } = await axiosInstance.delete<ClearResponse>(`/ideas/${ideaId}`)
    return data
  },
  async removeLog(logId: string): Promise<ClearResponse> {
    const { data } = await axiosInstance.delete<ClearResponse>(`/ideas/logs/${logId}`)
    return data
  },
  async removeAsset(assetId: string): Promise<ClearResponse> {
    const { data } = await axiosInstance.delete<ClearResponse>(`/ideas/assets/${assetId}`)
    return data
  },
}
