import { useEffect, useState } from 'react'

const AUTH_SESSION_KEY = 'user_auth_session'

export type AuthSession = {
  accessToken: string
  refreshToken: string
}

const emitAuthChange = () => {
  window.dispatchEvent(new Event('auth-changed'))
}

const parseAuthSession = (value: string | null): AuthSession | null => {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<AuthSession>
    if (
      typeof parsed.accessToken === 'string' &&
      parsed.accessToken.length > 0 &&
      typeof parsed.refreshToken === 'string' &&
      parsed.refreshToken.length > 0
    ) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken,
      }
    }
  } catch {
    // no-op
  }

  return null
}

export const setAuthSession = (session: AuthSession) => {
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session))
  emitAuthChange()
}

export const getAuthSession = (): AuthSession | null => {
  const session = parseAuthSession(localStorage.getItem(AUTH_SESSION_KEY))
  if (!session) {
    return null
  }
  return session
}

export const getAuthToken = () => getAuthSession()?.accessToken ?? null

export const getRefreshToken = () => getAuthSession()?.refreshToken ?? null

export const clearAuthSession = () => {
  localStorage.removeItem(AUTH_SESSION_KEY)
  emitAuthChange()
}

export const useAuthToken = () => {
  const [token, setToken] = useState<string | null | undefined>(undefined)

  useEffect(() => {
    const sync = () => setToken(getAuthToken())

    sync()
    window.addEventListener('auth-changed', sync)
    window.addEventListener('storage', sync)

    return () => {
      window.removeEventListener('auth-changed', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return token
}
