import { axiosInstance } from '../axiosInstance'
import type { PromptTemplateKey } from './promptTemplates.api'

export type PromptPreviewRequest = {
  personaId: string
  templateKey: PromptTemplateKey
  variables?: Record<string, string | number | boolean>
}

export type PromptPreviewResponse = {
  prompt: string
}

export const promptPreviewApi = {
  async preview(payload: PromptPreviewRequest): Promise<PromptPreviewResponse> {
    const { data } = await axiosInstance.post<PromptPreviewResponse>('/prompt/preview', payload)
    return data
  },
}
