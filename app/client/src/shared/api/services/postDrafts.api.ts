import { axiosInstance } from '../axiosInstance'

export type PostDraftStatus = 'draft' | 'approved' | 'published' | 'archived'
export type ModerationCheckStatus = 'passed' | 'failed'

export type ModerationCheckItem = {
  passed: boolean
  score: number
  hits: string[]
}

export type ModerationChecksPayload = {
  nsfw: ModerationCheckItem
  toxicity: ModerationCheckItem
  forbiddenTopics: ModerationCheckItem
  policy: ModerationCheckItem
}

export type PostDraftAsset = {
  id: string
  type: string
  url: string | null
  mime: string | null
  width: number | null
  height: number | null
  duration: number | null
  sourcePrompt: string | null
  provider: string | null
  status: string
  error: string | null
  createdAt: string
}

export type PostDraftCaption = {
  id: string
  text: string | null
  hashtags: string[] | null
  status: string
  error: string | null
  createdAt: string
}

export type PostDraftIdea = {
  id: string
  projectId: string
  personaId: string
  topic: string
  hook: string
  format: string
}

export type PostDraftModeration = {
  id: string
  status: ModerationCheckStatus
  checks: ModerationChecksPayload
  notes: string | null
  createdAt: string
}

export type PostDraftExport = {
  id: string
  ideaId: string
  captionId: string | null
  selectedAssets: string[]
  status: PostDraftStatus
  scheduledAt: string | null
  createdAt: string
  idea: PostDraftIdea
  assets: PostDraftAsset[]
  caption: PostDraftCaption | null
  latestModeration: PostDraftModeration | null
}

export type CreatePostDraftRequest = {
  captionId?: string
  assetIds?: string[]
  scheduledAt?: string
}

export type ApprovePostDraftRequest = {
  overrideReason?: string
}

export const postDraftsApi = {
  async createFromIdea(ideaId: string, payload: CreatePostDraftRequest): Promise<PostDraftExport> {
    const { data } = await axiosInstance.post<PostDraftExport>(`/post-drafts/from-idea/${ideaId}`, payload)
    return data
  },
  async getLatestByIdea(ideaId: string): Promise<PostDraftExport | null> {
    const { data } = await axiosInstance.get<PostDraftExport | null>(`/post-drafts/by-idea/${ideaId}/latest`)
    return data
  },
  async runModeration(postDraftId: string): Promise<PostDraftExport> {
    const { data } = await axiosInstance.post<PostDraftExport>(`/post-drafts/${postDraftId}/moderate`)
    return data
  },
  async approve(postDraftId: string, payload: ApprovePostDraftRequest): Promise<PostDraftExport> {
    const { data } = await axiosInstance.post<PostDraftExport>(`/post-drafts/${postDraftId}/approve`, payload)
    return data
  },
  async unapprove(postDraftId: string): Promise<PostDraftExport> {
    const { data } = await axiosInstance.post<PostDraftExport>(`/post-drafts/${postDraftId}/unapprove`)
    return data
  },
  async markPublished(postDraftId: string): Promise<PostDraftExport> {
    const { data } = await axiosInstance.post<PostDraftExport>(`/post-drafts/${postDraftId}/publish/mark`)
    return data
  },
  async getExport(postDraftId: string): Promise<PostDraftExport> {
    const { data } = await axiosInstance.get<PostDraftExport>(`/post-drafts/${postDraftId}/export`)
    return data
  },
}
