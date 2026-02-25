import type { ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

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

type ViewTransitionLike = {
  finished: Promise<unknown>
}

type DocumentWithViewTransition = Document & {
  startViewTransition?: (updateCallback: () => void) => ViewTransitionLike
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
  const transitionTimeoutRef = useRef<number | null>(null)

  const addThemeSwitchClass = useCallback(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.add('theme-switching')
  }, [])

  const removeThemeSwitchClass = useCallback(() => {
    if (typeof document === 'undefined') return
    document.documentElement.classList.remove('theme-switching')
  }, [])

  const startThemeTransition = useCallback(() => {
    if (typeof window === 'undefined') return
    addThemeSwitchClass()
    if (transitionTimeoutRef.current) {
      window.clearTimeout(transitionTimeoutRef.current)
    }
    transitionTimeoutRef.current = window.setTimeout(() => {
      removeThemeSwitchClass()
      transitionTimeoutRef.current = null
    }, 360)
  }, [addThemeSwitchClass, removeThemeSwitchClass])

  const applyColorSchemeTransition = useCallback(
    (updater: (current: ColorScheme) => ColorScheme) => {
      if (typeof document !== 'undefined') {
        const documentWithViewTransition = document as DocumentWithViewTransition
        if (typeof documentWithViewTransition.startViewTransition === 'function') {
          addThemeSwitchClass()
          const transition = documentWithViewTransition.startViewTransition(() => {
            flushSync(() => {
              setColorSchemeState(updater)
            })
          })
          void transition.finished.finally(() => {
            removeThemeSwitchClass()
          })
          return
        }
      }

      setColorSchemeState((current) => {
        const next = updater(current)
        if (current !== next) {
          startThemeTransition()
        }
        return next
      })
    },
    [addThemeSwitchClass, removeThemeSwitchClass, startThemeTransition],
  )

  const setColorScheme = useCallback(
    (next: ColorScheme) => {
      applyColorSchemeTransition((current) => {
        if (current === next) return current
        return next
      })
    },
    [applyColorSchemeTransition],
  )

  const toggleColorScheme = useCallback(() => {
    applyColorSchemeTransition((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [applyColorSchemeTransition])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-color-scheme', colorScheme)
    window.localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, colorScheme)
  }, [colorScheme])

  useEffect(
    () => () => {
      if (typeof window !== 'undefined' && transitionTimeoutRef.current) {
        window.clearTimeout(transitionTimeoutRef.current)
      }
      removeThemeSwitchClass()
    },
    [removeThemeSwitchClass],
  )

  const value = useMemo<ColorSchemeContextValue>(
    () => ({
      colorScheme,
      setColorScheme,
      toggleColorScheme,
    }),
    [colorScheme, setColorScheme, toggleColorScheme],
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
