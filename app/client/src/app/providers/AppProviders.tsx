import { ThemeProvider, useColorScheme } from '@ui/core'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Toaster } from 'sonner'
import { queryClient } from '../../shared/api/queryClient'

type Props = {
  children: ReactNode
}

function AppToaster() {
  const { colorScheme } = useColorScheme()

  return (
    <Toaster
      richColors={false}
      position="top-right"
      theme={colorScheme === 'dark' ? 'dark' : 'light'}
      toastOptions={{
        duration: 2400,
        classNames: {
          toast: 'app-toast',
          title: 'app-toast-title',
          description: 'app-toast-description',
          success: 'app-toast-success',
          error: 'app-toast-error',
          warning: 'app-toast-warning',
        },
      }}
    />
  )
}

export function AppProviders({ children }: Props) {
  return (
    <ThemeProvider defaultColorScheme="dark">
      <AppToaster />
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}

