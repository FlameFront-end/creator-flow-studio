import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { clearAuthSession, getAuthSession, setAuthSession } from '../lib/auth'

type AuthSessionResponse = {
  accessToken: string
  refreshToken: string
}

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const refreshClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

const isAuthRequest = (url: string | undefined): boolean => {
  if (!url) {
    return false
  }

  try {
    const normalizedPathname = new URL(url, API_BASE_URL).pathname
    return normalizedPathname.startsWith('/auth/')
  } catch {
    return false
  }
}

let refreshPromise: Promise<string | null> | null = null

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = getAuthSession()?.refreshToken
  if (!refreshToken) {
    return null
  }

  try {
    const { data } = await refreshClient.post<AuthSessionResponse>('/auth/refresh', {
      refreshToken,
    })

    setAuthSession(data)
    return data.accessToken
  } catch {
    clearAuthSession()
    return null
  }
}

axiosInstance.interceptors.request.use((config) => {
  const accessToken = getAuthSession()?.accessToken
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }

  return config
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status
    const originalRequest = error.config as RetriableRequestConfig | undefined

    if (!originalRequest || status !== 401) {
      return Promise.reject(error)
    }

    if (isAuthRequest(originalRequest.url)) {
      clearAuthSession()
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      clearAuthSession()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null
      })
    }

    const refreshedAccessToken = await refreshPromise
    if (!refreshedAccessToken) {
      clearAuthSession()
      return Promise.reject(error)
    }

    return axiosInstance(originalRequest)
  },
)
