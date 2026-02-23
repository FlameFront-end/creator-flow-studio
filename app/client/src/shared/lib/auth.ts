import { useEffect, useState } from 'react'

const AUTH_TOKEN_KEY = 'admin_api_token'

const emitAuthChange = () => {
  window.dispatchEvent(new Event('auth-changed'))
}

export const setAuthToken = (token: string) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
  emitAuthChange()
}

export const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY)

export const clearAuthToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY)
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
