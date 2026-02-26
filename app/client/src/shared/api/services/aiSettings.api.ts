import { axiosInstance } from '../axiosInstance'

export type AiProvider = 'openai' | 'openrouter' | 'openai-compatible'
export type AiSettingsSource = 'env' | 'database'

export type AiSettings = {
  provider: AiProvider
  model: string
  baseUrl: string | null
  responseLanguage: string
  maxTokens: number
  aiTestMode: boolean
  isEnabled: boolean
  source: AiSettingsSource
  hasApiKey: boolean
  apiKeyMasked: string | null
  updatedAt: string | null
  updatedBy: string | null
}

export type UpdateAiSettingsRequest = {
  provider: AiProvider
  model: string
  apiKey?: string
  baseUrl?: string
  responseLanguage?: string
  maxTokens?: number
  aiTestMode?: boolean
  isEnabled?: boolean
  clearApiKey?: boolean
}

export type TestAiSettingsRequest = {
  provider?: AiProvider
  model?: string
  apiKey?: string
  baseUrl?: string
  responseLanguage?: string
  maxTokens?: number
  aiTestMode?: boolean
  clearApiKey?: boolean
}

export type TestAiSettingsResponse = {
  ok: true
  provider: AiProvider
  model: string
  latencyMs: number
  source: AiSettingsSource
}

export const aiSettingsApi = {
  async getAiSettings(): Promise<AiSettings> {
    const { data } = await axiosInstance.get<AiSettings>('/settings/ai')
    return data
  },
  async updateAiSettings(payload: UpdateAiSettingsRequest): Promise<AiSettings> {
    const { data } = await axiosInstance.put<AiSettings>('/settings/ai', payload)
    return data
  },
  async testAiSettings(payload: TestAiSettingsRequest): Promise<TestAiSettingsResponse> {
    const { data } = await axiosInstance.post<TestAiSettingsResponse>('/settings/ai/test', payload)
    return data
  },
  async resetAiSettings(): Promise<AiSettings> {
    const { data } = await axiosInstance.delete<AiSettings>('/settings/ai')
    return data
  },
}
