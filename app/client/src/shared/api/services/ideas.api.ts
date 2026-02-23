import { axiosInstance } from '../axiosInstance'

export type GenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed'
export type IdeaFormat = 'reel' | 'short' | 'tiktok'
export type AiOperation = 'ideas' | 'script' | 'caption'

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
  latestScript: Script | null
  latestCaption: Caption | null
}

export type IdeaDetails = Omit<Idea, 'latestScript' | 'latestCaption'> & {
  scripts: Script[]
  captions: Caption[]
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
}

