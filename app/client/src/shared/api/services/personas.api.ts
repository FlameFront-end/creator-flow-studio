import { axiosInstance } from '../axiosInstance'

export type Persona = {
  id: string
  name: string
  age: number | null
  archetypeTone: string | null
  bio: string | null
  visualCode: string | null
  voiceCode: string | null
  createdAt: string
}

export type CreatePersonaRequest = {
  name: string
  age?: number
  archetypeTone?: string
  bio?: string
  visualCode?: string
  voiceCode?: string
}

export type UpdatePersonaRequest = Partial<CreatePersonaRequest>

export const personasApi = {
  async getPersonas(): Promise<Persona[]> {
    const { data } = await axiosInstance.get<Persona[]>('/personas')
    return data
  },
  async createPersona(payload: CreatePersonaRequest): Promise<Persona> {
    const { data } = await axiosInstance.post<Persona>('/personas', payload)
    return data
  },
  async updatePersona(id: string, payload: UpdatePersonaRequest): Promise<Persona> {
    const { data } = await axiosInstance.patch<Persona>(`/personas/${id}`, payload)
    return data
  },
  async deletePersona(id: string): Promise<void> {
    await axiosInstance.delete(`/personas/${id}`)
  },
}
