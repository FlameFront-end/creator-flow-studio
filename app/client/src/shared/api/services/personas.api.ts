import { axiosInstance } from '../axiosInstance'

export type Persona = {
  id: string
  projectId: string | null
  name: string
  age: number | null
  archetypeTone: string | null
  bio: string | null
  visualCode: string | null
  voiceCode: string | null
  createdAt: string
}

export type CreatePersonaRequest = {
  projectId: string
  name: string
  age?: number
  archetypeTone?: string
  bio?: string
  visualCode?: string
  voiceCode?: string
}

export type UpdatePersonaRequest = Partial<CreatePersonaRequest>

export const personasApi = {
  async getPersonas(projectId?: string): Promise<Persona[]> {
    const { data } = await axiosInstance.get<Persona[]>('/personas', {
      params: projectId ? { projectId } : undefined,
    })
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
