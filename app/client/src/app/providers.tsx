import { MantineProvider, createTheme } from '@mantine/core'
import { Notifications } from '@mantine/notifications'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { queryClient } from '../shared/api/queryClient'

type Props = {
  children: ReactNode
}

export function Providers({ children }: Props) {
  const theme = createTheme({
    primaryColor: 'cyan',
    defaultRadius: 'md',
    fontFamily: 'Manrope, Segoe UI, sans-serif',
  })

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <Notifications position="top-right" autoClose={4000} />
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MantineProvider>
  )
}
