import type { CSSProperties, ReactNode } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { cn } from '../lib/cn'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

export type AppTabItem = {
  value: string
  label: ReactNode
  leftSection?: ReactNode
  rightSection?: ReactNode
  disabled?: boolean
}

type AppTabsProps = {
  items: AppTabItem[]
  children?: ReactNode
  className?: string
  listClassName?: string
  tabClassName?: string
  value?: string
  defaultValue?: string
  onChange?: (value: string | null) => void
}

type AppTabsPanelProps = {
  value: string
  children?: ReactNode
  className?: string
  pt?: number | string
}

const resolvePanelPaddingTopClass = (pt: AppTabsPanelProps['pt']) => {
  if (pt === undefined || pt === null) return ''
  if (typeof pt === 'number') {
    if (pt <= 4) return 'pt-1'
    if (pt <= 8) return 'pt-2'
    if (pt <= 12) return 'pt-3'
    if (pt <= 16) return 'pt-4'
    if (pt <= 20) return 'pt-5'
    if (pt <= 24) return 'pt-6'
    return 'pt-8'
  }

  if (pt === 'xs') return 'pt-2'
  if (pt === 'sm') return 'pt-3'
  if (pt === 'md') return 'pt-4'
  if (pt === 'lg') return 'pt-6'
  if (pt === 'xl') return 'pt-8'
  return ''
}

function AppTabsPanel({ value, children, className, pt }: AppTabsPanelProps) {
  return (
    <TabsContent value={value} className={cn(resolvePanelPaddingTopClass(pt), className)}>
      {children}
    </TabsContent>
  )
}

function AppTabsBase({
  items,
  children,
  className,
  listClassName,
  tabClassName,
  value,
  defaultValue,
  onChange,
}: AppTabsProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const rafRef = useRef<number | null>(null)
  const [internalValue, setInternalValue] = useState<string | undefined>(
    defaultValue ?? items[0]?.value,
  )
  const [highlightStyle, setHighlightStyle] = useState<CSSProperties>({
    opacity: 0,
    transform: 'translateX(0px)',
    width: 0,
  })

  const activeValue = value ?? internalValue

  const updateHighlightFromElement = useCallback((element: HTMLElement | null) => {
    const listElement = listRef.current
    if (!listElement || !element) return

    const listRect = listElement.getBoundingClientRect()
    const elementRect = element.getBoundingClientRect()
    const nextLeft = elementRect.left - listRect.left + listElement.scrollLeft

    const nextStyle = {
      opacity: 1,
      transform: `translateX(${Math.round(nextLeft)}px)`,
      width: Math.round(elementRect.width),
    }

    setHighlightStyle((prevStyle) => {
      if (
        prevStyle.opacity === nextStyle.opacity &&
        prevStyle.transform === nextStyle.transform &&
        prevStyle.width === nextStyle.width
      ) {
        return prevStyle
      }
      return nextStyle
    })
  }, [])

  const scheduleHighlightUpdate = useCallback(
    (element: HTMLElement | null) => {
      if (typeof window === 'undefined') return
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
      }

      rafRef.current = window.requestAnimationFrame(() => {
        updateHighlightFromElement(element)
        rafRef.current = null
      })
    },
    [updateHighlightFromElement],
  )

  const updateHighlightFromActiveTab = useCallback(() => {
    if (!activeValue) return
    const activeElement = tabRefs.current[activeValue]
    if (!activeElement) return
    scheduleHighlightUpdate(activeElement)
  }, [activeValue, scheduleHighlightUpdate])

  useLayoutEffect(() => {
    updateHighlightFromActiveTab()
  }, [items, updateHighlightFromActiveTab])

  useEffect(() => {
    const listElement = listRef.current
    if (!listElement) return

    const handleUpdate = () => updateHighlightFromActiveTab()
    listElement.addEventListener('scroll', handleUpdate, { passive: true })
    window.addEventListener('resize', handleUpdate)

    const observer = new ResizeObserver(handleUpdate)
    observer.observe(listElement)
    Object.values(tabRefs.current).forEach((node) => {
      if (node) observer.observe(node)
    })

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts
    const fontReadyHandler = () => handleUpdate()
    fonts?.ready.then(fontReadyHandler).catch(() => undefined)

    return () => {
      listElement.removeEventListener('scroll', handleUpdate)
      window.removeEventListener('resize', handleUpdate)
      observer.disconnect()
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [items, updateHighlightFromActiveTab])

  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? items[0]?.value}
      onValueChange={(nextValue) => {
        if (value === undefined) {
          setInternalValue(nextValue)
        }
        onChange?.(nextValue)
      }}
      className={cn('app-tabs w-full', className)}
    >
      <TabsList
        ref={listRef}
        className={cn(
          'app-tabs-list relative h-auto w-full flex-nowrap justify-start gap-1 rounded-xl bg-card/80 p-1',
          listClassName,
        )}
      >
        <span className="app-tabs-highlight" style={highlightStyle} aria-hidden />

        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className={cn(
              'app-tabs-tab relative z-[2] gap-2 rounded-lg px-3 py-2 text-sm data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-inherit',
              tabClassName,
            )}
            ref={(node) => {
              tabRefs.current[item.value] = node
            }}
          >
            {item.leftSection ? <span className="inline-flex items-center">{item.leftSection}</span> : null}
            <span>{item.label}</span>
            {item.rightSection ? <span className="inline-flex items-center">{item.rightSection}</span> : null}
          </TabsTrigger>
        ))}
      </TabsList>
      {children}
    </Tabs>
  )
}

type AppTabsComponent = typeof AppTabsBase & {
  Panel: typeof AppTabsPanel
}

export const AppTabs = AppTabsBase as AppTabsComponent
AppTabs.Panel = AppTabsPanel
