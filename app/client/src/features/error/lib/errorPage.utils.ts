import { isRouteErrorResponse } from 'react-router-dom'

export const isModuleLoadLikeError = (error: unknown): boolean =>
  error instanceof Error &&
  /chunk|module script|failed to fetch|importing a module script failed|networkerror|preload css/i.test(
    error.message,
  )

export const getErrorMessage = (error: unknown): string => {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) return 'Страница не найдена'
    if (error.status >= 500) return 'Внутренняя ошибка сервера'
    return error.statusText || 'Ошибка роутинга'
  }

  if (error instanceof Error) {
    const messageLower = error.message.toLowerCase()
    if (
      messageLower.includes('preload css') ||
      messageLower.includes('unable to preload css') ||
      messageLower.includes('failed to preload css')
    ) {
      return 'Ошибка предзагрузки ресурсов. Попробуйте обновить страницу.'
    }
    if (isModuleLoadLikeError(error)) {
      return 'Не удалось загрузить часть приложения. Возможно, кеш устарел или есть сетевой сбой.'
    }
    return error.message || 'Непредвиденная ошибка'
  }

  return 'Непредвиденная ошибка'
}

export const formatErrorDetails = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return {
      type: 'RouteErrorResponse',
      status: error.status,
      statusText: error.statusText,
      data: error.data,
    }
  }

  if (error instanceof Error) {
    return {
      type: 'Error',
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    }
  }

  return { type: 'Unknown', value: String(error) }
}

