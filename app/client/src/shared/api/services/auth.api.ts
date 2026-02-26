import { axiosInstance } from '../axiosInstance'

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
}

export type AuthSessionResponse = {
  accessToken: string
  refreshToken: string
}

export type RefreshRequest = {
  refreshToken: string
}

export const authApi = {
  async register(payload: RegisterRequest): Promise<AuthSessionResponse> {
    const { data } = await axiosInstance.post<AuthSessionResponse>('/auth/register', payload)
    return data
  },
  async login(payload: LoginRequest): Promise<AuthSessionResponse> {
    const { data } = await axiosInstance.post<AuthSessionResponse>('/auth/login', payload)
    return data
  },
  async refresh(payload: RefreshRequest): Promise<AuthSessionResponse> {
    const { data } = await axiosInstance.post<AuthSessionResponse>('/auth/refresh', payload)
    return data
  },
  async logout(payload: RefreshRequest): Promise<void> {
    await axiosInstance.post('/auth/logout', payload)
  },
}
