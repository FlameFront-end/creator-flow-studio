import type { HTMLAttributes } from 'react'
import { createContext, useContext, useMemo, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  Accordion as UiAccordion,
  AccordionContent,
  AccordionItem as UiAccordionItem,
  AccordionTrigger,
} from '@/shared/components/ui/accordion'
import { splitSystemProps } from './system'

type AccordionContextValue = {
  value: string | null
  setValue: (next: string | null) => void
}

const AccordionContext = createContext<AccordionContextValue | null>(null)
const AccordionItemContext = createContext<string | null>(null)

function AccordionRoot(props: any) {
  const { children, className, value, defaultValue = null, onChange, ...restProps } = props
  const [internalValue, setInternalValue] = useState<string | null>(defaultValue)
  const controlled = value !== undefined
  const currentValue = controlled ? value : internalValue
  const { rest, style } = splitSystemProps(restProps)

  const contextValue = useMemo<AccordionContextValue>(
    () => ({
      value: currentValue,
      setValue: (next) => {
        if (!controlled) {
          setInternalValue(next)
        }
        onChange?.(next)
      },
    }),
    [controlled, currentValue, onChange],
  )

  return (
    <AccordionContext.Provider value={contextValue}>
      <UiAccordion
        {...rest}
        type="single"
        collapsible
        value={currentValue ?? undefined}
        onValueChange={(nextValue) => {
          contextValue.setValue(nextValue || null)
        }}
        className={cn('appui-Accordion-root', className)}
        style={style}
      >
        {children}
      </UiAccordion>
    </AccordionContext.Provider>
  )
}

function AccordionItem(props: any) {
  const { children, className, value, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)

  return (
    <AccordionItemContext.Provider value={value}>
      <UiAccordionItem
        {...(rest as HTMLAttributes<HTMLDivElement>)}
        value={value}
        className={cn('appui-Accordion-item', className)}
        style={style}
      >
        {children}
      </UiAccordionItem>
    </AccordionItemContext.Provider>
  )
}

function AccordionControl(props: any) {
  const { children, className, ...restProps } = props
  const itemValue = useContext(AccordionItemContext)
  const { rest, style } = splitSystemProps(restProps)

  return (
    <AccordionTrigger
      {...(rest as HTMLAttributes<HTMLButtonElement>)}
      className={cn('appui-Accordion-control', className)}
      style={style}
      data-value={itemValue ?? undefined}
    >
      {children}
    </AccordionTrigger>
  )
}

function AccordionPanel(props: any) {
  const { children, className, ...restProps } = props
  const itemValue = useContext(AccordionItemContext)
  const { rest, style } = splitSystemProps(restProps)

  return (
    <AccordionContent
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Accordion-panel', className)}
      style={style}
      data-value={itemValue ?? undefined}
    >
      {children}
    </AccordionContent>
  )
}

type AccordionComponent = typeof AccordionRoot & {
  Item: typeof AccordionItem
  Control: typeof AccordionControl
  Panel: typeof AccordionPanel
}

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Control: AccordionControl,
  Panel: AccordionPanel,
}) as AccordionComponent
