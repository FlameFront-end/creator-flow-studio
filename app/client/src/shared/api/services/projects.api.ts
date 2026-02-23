import { axiosInstance } from '../axiosInstance'

export type Project = {
  id: string
  name: string
  description: string | null
  createdAt: string
}

export type CreateProjectRequest = {
  name: string
  description?: string
}

export type UpdateProjectRequest = Partial<CreateProjectRequest>

export const projectsApi = {
  async getProjects(): Promise<Project[]> {
    const { data } = await axiosInstance.get<Project[]>('/projects')
    return data
  },
  async createProject(payload: CreateProjectRequest): Promise<Project> {
    const { data } = await axiosInstance.post<Project>('/projects', payload)
    return data
  },
  async updateProject(id: string, payload: UpdateProjectRequest): Promise<Project> {
    const { data } = await axiosInstance.patch<Project>(`/projects/${id}`, payload)
    return data
  },
  async deleteProject(id: string): Promise<void> {
    await axiosInstance.delete(`/projects/${id}`)
  },
}
