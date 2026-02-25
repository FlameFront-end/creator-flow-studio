import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  clamp,
  getResponsiveBaseValue,
  resolveDimension,
  resolveSpacing,
  splitSystemProps,
  useViewportWidth,
} from './system'

const containerSizeMap: Record<string, string> = {
  xs: '540px',
  sm: '720px',
  md: '960px',
  lg: '1140px',
  xl: '1320px',
}

const titleSizeMap: Record<number, string> = {
  1: '2rem',
  2: '1.72rem',
  3: '1.42rem',
  4: '1.18rem',
  5: '1rem',
  6: '0.9rem',
}

export function Box(props: any) {
  const { children, className, component, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const Component: any = component ?? 'div'

  return (
    <Component {...rest} className={cn('appui-Box-root', className)} style={style}>
      {children}
    </Component>
  )
}

export function Stack(props: any) {
  const { children, className, gap = 'md', align, justify, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Stack-root', className)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: resolveSpacing(gap),
        alignItems: align,
        justifyContent: justify,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Group(props: any) {
  const { children, className, gap = 'sm', align = 'center', justify, wrap = 'wrap', grow = false, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Group-root', className)}
      style={{
        display: 'flex',
        gap: resolveSpacing(gap),
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap,
        ...(grow ? { width: '100%' } : null),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Paper(props: any) {
  const { children, className, withBorder, shadow, component, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const Component: any = component ?? 'div'

  return (
    <Component
      {...rest}
      className={cn('appui-Paper-root', className)}
      style={{
        border: withBorder ? '1px solid var(--app-surface-border)' : undefined,
        boxShadow: shadow ? 'var(--app-surface-shadow)' : undefined,
        ...style,
      }}
    >
      {children}
    </Component>
  )
}

export function Card(props: any) {
  const { children, className, withBorder, shadow, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Card-root', className)}
      style={{
        border: withBorder ? '1px solid var(--app-surface-border)' : undefined,
        boxShadow: shadow ? 'var(--app-surface-shadow)' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function Title(props: any) {
  const { children, className, order = 2, size, lineClamp, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const safeOrder = clamp(Number(order) || 2, 1, 6)
  const Heading: any = `h${safeOrder}`
  const fontSize = resolveDimension(size) ?? titleSizeMap[safeOrder]

  return (
    <Heading
      {...rest}
      className={cn('appui-Title-root', className)}
      style={{
        fontSize,
        ...(lineClamp
          ? {
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: Number(lineClamp),
            }
          : null),
        ...style,
      }}
    >
      {children}
    </Heading>
  )
}

export function Text(props: any) {
  const { children, className, size, lineClamp, span, component, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const Component: any = component ?? (span ? 'span' : 'p')

  return (
    <Component
      {...rest}
      className={cn('appui-Text-root', className)}
      style={{
        fontSize: resolveDimension(size),
        ...(lineClamp
          ? {
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              WebkitLineClamp: Number(lineClamp),
            }
          : null),
        ...style,
      }}
    >
      {children}
    </Component>
  )
}

export function Container(props: any) {
  const { children, className, size = 'md', ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const maxWidth = typeof size === 'number' ? `${size}px` : containerSizeMap[size] ?? size

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Container-root', className)}
      style={{
        width: '100%',
        maxWidth,
        marginLeft: 'auto',
        marginRight: 'auto',
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function SimpleGrid(props: any) {
  const { children, className, cols = 1, spacing = 'md', verticalSpacing, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const viewportWidth = useViewportWidth()
  const columns = Math.max(1, getResponsiveBaseValue(cols, 1, viewportWidth))
  const gap = resolveSpacing(spacing)
  const rowGap = resolveSpacing(verticalSpacing)

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-SimpleGrid-root', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap,
        rowGap: rowGap ?? gap,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function GridBase(props: any) {
  const { children, className, gutter = 'md', align, justify, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Grid-root', className)}
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
        gap: resolveSpacing(gutter),
        alignItems: align,
        justifyItems: justify,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

function GridCol(props: any) {
  const { children, className, span = 12, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const viewportWidth = useViewportWidth()
  const spanValue = clamp(getResponsiveBaseValue(span, 12, viewportWidth), 1, 12)

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Grid-col', className)}
      style={{
        gridColumn: `span ${spanValue} / span ${spanValue}`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

type GridComponent = typeof GridBase & {
  Col: typeof GridCol
}

export const Grid = Object.assign(GridBase, { Col: GridCol }) as GridComponent

export function Divider(props: any) {
  const { className, label, labelPosition = 'center', ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)

  if (!label) {
    return (
      <hr
        {...(rest as HTMLAttributes<HTMLHRElement>)}
        className={cn('appui-Divider-root', className)}
        style={{
          border: 0,
          borderTop: '1px solid var(--app-surface-border)',
          ...style,
        }}
      />
    )
  }

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Divider-root', className)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        ...style,
      }}
    >
      {labelPosition !== 'left' ? (
        <span style={{ flex: 1, height: '1px', background: 'var(--app-surface-border)' }} />
      ) : null}
      <span>{label as ReactNode}</span>
      {labelPosition !== 'right' ? (
        <span style={{ flex: 1, height: '1px', background: 'var(--app-surface-border)' }} />
      ) : null}
    </div>
  )
}

export function Code(props: any) {
  const { children, className, block = false, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)

  if (block) {
    return (
      <pre
        {...(rest as HTMLAttributes<HTMLPreElement>)}
        className={cn('appui-Code-root', className)}
        style={{
          margin: 0,
          padding: '10px 12px',
          borderRadius: '10px',
          overflow: 'auto',
          ...style,
        }}
      >
        <code>{children}</code>
      </pre>
    )
  }

  return (
    <code
      {...(rest as HTMLAttributes<HTMLElement>)}
      className={cn('appui-Code-root', className)}
      style={{
        padding: '0 6px',
        borderRadius: '6px',
        ...style,
      }}
    >
      {children}
    </code>
  )
}

