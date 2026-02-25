import type { CSSProperties } from 'react'
import { useEffect, useState } from 'react'

const spacingScale: Record<string, number> = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
}

const radiusScale: Record<string, string> = {
  xs: '4px',
  sm: '6px',
  md: '10px',
  lg: '12px',
  xl: '14px',
}

const colorMap: Record<string, string> = {
  dimmed: 'var(--app-muted-text)',
  gray: 'var(--app-muted-text)',
  dark: 'var(--app-text)',
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  grape: '#8b5cf6',
  brand: 'var(--app-text)',
}

const responsiveBreakpoints: Array<{ key: string; minWidth: number }> = [
  { key: 'base', minWidth: 0 },
  { key: 'xs', minWidth: 576 },
  { key: 'sm', minWidth: 768 },
  { key: 'md', minWidth: 992 },
  { key: 'lg', minWidth: 1200 },
  { key: 'xl', minWidth: 1408 },
]

export function resolveSpacing(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return `${value}px`
  if (typeof value !== 'string') return undefined
  if (value === 'auto') return value
  if (spacingScale[value] !== undefined) return `${spacingScale[value]}px`
  return value
}

export function resolveDimension(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return `${value}px`
  if (typeof value !== 'string') return undefined
  return value
}

export function resolveRadius(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return `${value}px`
  if (typeof value !== 'string') return undefined
  return radiusScale[value] ?? value
}

export function resolveColor(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  const normalized = value.includes('.') ? value.split('.')[0] : value
  return colorMap[normalized] ?? value
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function useViewportWidth() {
  const [viewportWidth, setViewportWidth] = useState(() =>
    typeof window === 'undefined' ? 1440 : window.innerWidth,
  )

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    let frameId = 0
    const onResize = () => {
      window.cancelAnimationFrame(frameId)
      frameId = window.requestAnimationFrame(() => {
        setViewportWidth(window.innerWidth)
      })
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return viewportWidth
}

export function getResponsiveBaseValue(value: unknown, fallback: number, viewportWidth: number) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'object' && value !== null) {
    const map = value as Record<string, unknown>
    let resolved = typeof map.base === 'number' ? map.base : fallback

    for (const breakpoint of responsiveBreakpoints) {
      if (breakpoint.key === 'base' || viewportWidth < breakpoint.minWidth) {
        continue
      }

      const nextValue = map[breakpoint.key]
      if (typeof nextValue === 'number') {
        resolved = nextValue
      }
    }

    return resolved
  }

  return fallback
}

export function splitSystemProps(props: Record<string, unknown>) {
  const rest = { ...props }
  const inlineStyle: CSSProperties = {}

  const style = rest.style as CSSProperties | undefined
  delete rest.style

  const mapSpacing = (key: string, cssProps: Array<keyof CSSProperties>) => {
    const value = resolveSpacing(rest[key])
    delete rest[key]
    if (value === undefined) return
    for (const cssProp of cssProps) {
      ;(inlineStyle as Record<string, unknown>)[cssProp] = value
    }
  }

  mapSpacing('m', ['margin'])
  mapSpacing('mt', ['marginTop'])
  mapSpacing('mb', ['marginBottom'])
  mapSpacing('ml', ['marginLeft'])
  mapSpacing('mr', ['marginRight'])
  mapSpacing('mx', ['marginLeft', 'marginRight'])
  mapSpacing('my', ['marginTop', 'marginBottom'])

  mapSpacing('p', ['padding'])
  mapSpacing('pt', ['paddingTop'])
  mapSpacing('pb', ['paddingBottom'])
  mapSpacing('pl', ['paddingLeft'])
  mapSpacing('pr', ['paddingRight'])
  mapSpacing('px', ['paddingLeft', 'paddingRight'])
  mapSpacing('py', ['paddingTop', 'paddingBottom'])

  const mapDimension = (key: string, cssProp: keyof CSSProperties) => {
    const value = resolveDimension(rest[key])
    delete rest[key]
    if (value !== undefined) {
      ;(inlineStyle as Record<string, unknown>)[cssProp] = value
    }
  }

  mapDimension('w', 'width')
  mapDimension('h', 'height')
  mapDimension('maw', 'maxWidth')
  mapDimension('mih', 'minHeight')
  mapDimension('miw', 'minWidth')
  mapDimension('mah', 'maxHeight')

  if (rest.ta !== undefined) {
    inlineStyle.textAlign = rest.ta as CSSProperties['textAlign']
  }
  delete rest.ta

  if (rest.fw !== undefined) {
    inlineStyle.fontWeight = rest.fw as CSSProperties['fontWeight']
  }
  delete rest.fw

  if (rest.opacity !== undefined) {
    inlineStyle.opacity = Number(rest.opacity)
  }
  delete rest.opacity

  if (rest.display !== undefined) {
    inlineStyle.display = rest.display as CSSProperties['display']
  }
  delete rest.display

  const color = resolveColor(rest.c)
  if (color) {
    inlineStyle.color = color
  }
  delete rest.c

  const background = resolveColor(rest.bg)
  if (background) {
    inlineStyle.background = background
  }
  delete rest.bg

  const radius = resolveRadius(rest.radius)
  if (radius) {
    inlineStyle.borderRadius = radius
  }
  delete rest.radius

  return {
    rest,
    style: {
      ...inlineStyle,
      ...(style ?? {}),
    },
  }
}
