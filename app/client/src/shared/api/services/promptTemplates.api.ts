import { axiosInstance } from '../axiosInstance'

export type PromptTemplateKey = 'ideas' | 'script' | 'caption' | 'image_prompt' | 'video_prompt'

export type PromptTemplate = {
  id: string
  key: PromptTemplateKey
  template: string
  createdAt: string
}

export type CreatePromptTemplateRequest = {
  key: PromptTemplateKey
  template: string
}

export type UpdatePromptTemplateRequest = Partial<CreatePromptTemplateRequest>

export const promptTemplatesApi = {
  async getPromptTemplates(): Promise<PromptTemplate[]> {
    const { data } = await axiosInstance.get<PromptTemplate[]>('/prompt-templates')
    return data
  },
  async createPromptTemplate(payload: CreatePromptTemplateRequest): Promise<PromptTemplate> {
    const { data } = await axiosInstance.post<PromptTemplate>('/prompt-templates', payload)
    return data
  },
  async updatePromptTemplate(id: string, payload: UpdatePromptTemplateRequest): Promise<PromptTemplate> {
    const { data } = await axiosInstance.patch<PromptTemplate>(`/prompt-templates/${id}`, payload)
    return data
  },
  async deletePromptTemplate(id: string): Promise<void> {
    await axiosInstance.delete(`/prompt-templates/${id}`)
  },
}
