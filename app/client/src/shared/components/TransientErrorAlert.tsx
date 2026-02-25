import { Box, Transition } from '@ui/core'
import { useEffect, useState } from 'react'
import { AppInlineErrorAlert } from './AppInlineErrorAlert'

type TransientErrorAlertProps = {
  error: string | null
  onHide?: () => void
  hideAfterMs?: number
  title?: string
}

export const TransientErrorAlert = ({
  error,
  onHide,
  hideAfterMs = 3000,
  title = 'Ошибка',
}: TransientErrorAlertProps) => {
  const [visibleError, setVisibleError] = useState<string | null>(error)

  useEffect(() => {
    if (error) {
      setVisibleError(error)
    }
  }, [error])

  useEffect(() => {
    if (!error || !onHide) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      onHide()
    }, hideAfterMs)

    return () => window.clearTimeout(timeoutId)
  }, [error, hideAfterMs, onHide])

  if (!error && !visibleError) {
    return null
  }

  return (
    <Transition
      mounted={Boolean(error)}
      transition="fade-down"
      duration={220}
      timingFunction="ease"
      onExited={() => setVisibleError(null)}
    >
      {(styles) => (
        <Box style={styles}>
          <AppInlineErrorAlert title={title}>
            {visibleError}
          </AppInlineErrorAlert>
        </Box>
      )}
    </Transition>
  )
}

