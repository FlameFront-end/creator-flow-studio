import type { ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type ColorTuple = [string, ...string[]]

type ColorScheme = 'light' | 'dark'

type ColorSchemeContextValue = {
  colorScheme: ColorScheme
  setColorScheme: (next: ColorScheme) => void
  toggleColorScheme: () => void
}

type ThemeProviderProps = {
  children: ReactNode
  defaultColorScheme?: ColorScheme | 'auto'
  theme?: unknown
}

const COLOR_SCHEME_STORAGE_KEY = 'app-color-scheme'
const ColorSchemeContext = createContext<ColorSchemeContextValue | null>(null)

function resolveInitialColorScheme(defaultColorScheme: ThemeProviderProps['defaultColorScheme']) {
  if (typeof window === 'undefined') {
    return defaultColorScheme === 'light' ? 'light' : 'dark'
  }

  const stored = window.localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') {
    return stored
  }

  if (defaultColorScheme === 'light') {
    return 'light'
  }

  if (defaultColorScheme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }

  return 'dark'
}

export function ThemeProvider({
  children,
  defaultColorScheme = 'light',
}: ThemeProviderProps) {
  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() =>
    resolveInitialColorScheme(defaultColorScheme),
  )

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-color-scheme', colorScheme)
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, colorScheme)
  }, [colorScheme])

  const value = useMemo<ColorSchemeContextValue>(
    () => ({
      colorScheme,
      setColorScheme: setColorSchemeState,
      toggleColorScheme: () => {
        setColorSchemeState((current) => (current === 'dark' ? 'light' : 'dark'))
      },
    }),
    [colorScheme],
  )

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>
}

export function useColorScheme() {
  const context = useContext(ColorSchemeContext)

  if (!context) {
    return {
      colorScheme: 'dark' as ColorScheme,
      setColorScheme: (_next: ColorScheme) => undefined,
      toggleColorScheme: () => undefined,
    }
  }

  return context
}

export function createTheme<TTheme extends Record<string, unknown>>(theme: TTheme) {
  return theme
}
