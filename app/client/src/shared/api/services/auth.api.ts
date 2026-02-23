import { axiosInstance } from '../axiosInstance'

export type LoginRequest = {
  password: string
}

export type LoginResponse = {
  token: string
}

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await axiosInstance.post<LoginResponse>('/auth/login', payload)
    return data
  },
}
