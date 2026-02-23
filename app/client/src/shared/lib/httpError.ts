import axios from 'axios'

type ApiErrorShape = {
  message?: string | string[]
  error?: string
}

const toMessage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  if (Array.isArray(value) && value.length > 0) {
    const firstMessage = value.find((item) => typeof item === 'string' && item.trim().length > 0)
    if (firstMessage) {
      return firstMessage
    }
  }

  return null
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ApiErrorShape>(error)) {
    const payload = error.response?.data
    return (
      toMessage(payload?.message) ??
      toMessage(payload?.error) ??
      toMessage(error.message) ??
      fallback
    )
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return fallback
}
