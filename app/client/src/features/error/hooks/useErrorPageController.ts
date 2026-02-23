import { useMemo, useState } from 'react'
import { useLocation, useRouteError } from 'react-router-dom'
import { formatErrorDetails, getErrorMessage, isModuleLoadLikeError } from '../lib/errorPage.utils'

export const useErrorPageController = () => {
  const location = useLocation()
  const error = useRouteError()
  const [showDetails, setShowDetails] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle')

  const message = useMemo(() => getErrorMessage(error), [error])
  const isModuleLoadError = useMemo(() => isModuleLoadLikeError(error), [error])
  const details = useMemo(() => formatErrorDetails(error), [error])
  const detailsString = useMemo(() => JSON.stringify(details, null, 2), [details])

  const reload = () => window.location.reload()

  const clearCacheAndReload = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map((name) => caches.delete(name)))
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((reg) => reg.unregister()))
      }
    } finally {
      window.location.reload()
    }
  }

  const copyDetails = async () => {
    try {
      await navigator.clipboard.writeText(
        [
          'Отчёт об ошибке',
          '',
          `Маршрут: ${location.pathname}`,
          `Сообщение: ${message}`,
          '',
          'Детали:',
          detailsString,
        ].join('\n'),
      )
      setCopyState('ok')
    } catch {
      setCopyState('error')
    } finally {
      setTimeout(() => setCopyState('idle'), 1600)
    }
  }

  return {
    location,
    error,
    message,
    isModuleLoadError,
    detailsString,
    showDetails,
    setShowDetails,
    copyState,
    reload,
    clearCacheAndReload,
    copyDetails,
  }
}

export type ErrorPageController = ReturnType<typeof useErrorPageController>

