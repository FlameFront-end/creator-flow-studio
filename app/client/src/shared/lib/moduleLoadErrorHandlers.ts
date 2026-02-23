const RELOAD_FLAG_KEY = 'module_load_error_reloaded'

const isModuleLoadErrorMessage = (value: unknown): boolean => {
  const text =
    typeof value === 'string'
      ? value
      : value instanceof Error
        ? value.message
        : ''

  return /chunk|module script|failed to fetch|importing a module script failed|networkerror/i.test(
    text,
  )
}

const reloadOnceOnModuleError = () => {
  const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG_KEY) === '1'
  if (alreadyReloaded) {
    return
  }

  sessionStorage.setItem(RELOAD_FLAG_KEY, '1')
  window.location.reload()
}

export const setupModuleLoadErrorHandlers = () => {
  window.addEventListener('error', (event) => {
    if (isModuleLoadErrorMessage(event.error ?? event.message)) {
      reloadOnceOnModuleError()
    }
  })

  window.addEventListener('unhandledrejection', (event) => {
    if (isModuleLoadErrorMessage(event.reason)) {
      reloadOnceOnModuleError()
    }
  })
}

