import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { splitSystemProps } from './system'

type TransitionName = 'fade' | 'fade-down' | 'fade-up'

type TransitionProps = {
  mounted: boolean
  transition?: TransitionName
  duration?: number
  timingFunction?: string
  onExited?: () => void
  children: (styles: CSSProperties) => ReactNode
}

const transitionStyles: Record<TransitionName, { in: CSSProperties; out: CSSProperties }> = {
  fade: {
    in: { opacity: 1 },
    out: { opacity: 0 },
  },
  'fade-down': {
    in: { opacity: 1, transform: 'translateY(0px)' },
    out: { opacity: 0, transform: 'translateY(-8px)' },
  },
  'fade-up': {
    in: { opacity: 1, transform: 'translateY(0px)' },
    out: { opacity: 0, transform: 'translateY(8px)' },
  },
}

export function Transition({
  mounted,
  transition = 'fade',
  duration = 200,
  timingFunction = 'ease',
  onExited,
  children,
}: TransitionProps) {
  const [rendered, setRendered] = useState(mounted)
  const [stateStyles, setStateStyles] = useState<CSSProperties>(
    mounted ? transitionStyles[transition].in : transitionStyles[transition].out,
  )

  useEffect(() => {
    const selected = transitionStyles[transition]

    if (mounted) {
      setRendered(true)
      const frameId = window.requestAnimationFrame(() => {
        setStateStyles(selected.in)
      })
      return () => window.cancelAnimationFrame(frameId)
    }

    setStateStyles(selected.out)
    const timeoutId = window.setTimeout(() => {
      setRendered(false)
      onExited?.()
    }, duration)

    return () => window.clearTimeout(timeoutId)
  }, [duration, mounted, onExited, transition])

  const transitionValue = useMemo(
    () => `opacity ${duration}ms ${timingFunction}, transform ${duration}ms ${timingFunction}`,
    [duration, timingFunction],
  )

  if (!rendered) {
    return null
  }

  return <>{children({ transition: transitionValue, ...stateStyles })}</>
}

type CollapseProps = {
  in: boolean
  children?: ReactNode
  className?: string
  [key: string]: unknown
}

export function Collapse(props: CollapseProps) {
  const { in: opened, className, children, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const [height, setHeight] = useState<number>(opened ? -1 : 0)

  useEffect(() => {
    if (!bodyRef.current) return

    if (opened) {
      const nextHeight = bodyRef.current.scrollHeight
      setHeight(nextHeight)
      const timeoutId = window.setTimeout(() => {
        setHeight(-1)
      }, 180)
      return () => window.clearTimeout(timeoutId)
    }

    if (height === -1) {
      setHeight(bodyRef.current.scrollHeight)
      window.requestAnimationFrame(() => setHeight(0))
      return
    }

    setHeight(0)
  }, [height, opened])

  if (!opened && height === 0 && !children) {
    return null
  }

  return (
    <div
      {...rest}
      className={cn('appui-Collapse-root', className)}
      style={{
        overflow: 'hidden',
        height: height === -1 ? 'auto' : `${height}px`,
        transition: 'height 180ms ease',
        ...style,
      }}
    >
      <div ref={bodyRef}>{children}</div>
    </div>
  )
}
