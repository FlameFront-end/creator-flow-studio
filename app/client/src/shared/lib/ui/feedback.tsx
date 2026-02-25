import type { HTMLAttributes, ReactNode } from 'react'
import { isValidElement } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip'
import { resolveColor, resolveDimension, resolveRadius, splitSystemProps } from './system'

function InlineSpinner({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-hidden
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '9999px',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        display: 'inline-block',
        animation: 'appui-spin 0.7s linear infinite',
      }}
    />
  )
}

if (typeof document !== 'undefined' && !document.getElementById('appui-keyframes')) {
  const styleElement = document.createElement('style')
  styleElement.id = 'appui-keyframes'
  styleElement.textContent = '@keyframes appui-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}'
  document.head.appendChild(styleElement)
}

export function Alert(props: any) {
  const {
    className,
    color,
    variant,
    title,
    icon,
    children,
    withCloseButton,
    onClose,
    ...restProps
  } = props
  const { rest, style } = splitSystemProps(restProps)

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      role="alert"
      data-color={color}
      data-variant={variant}
      className={cn('appui-Alert-root', className)}
      style={{
        borderRadius: '12px',
        border: '1px solid var(--app-surface-border)',
        padding: '12px',
        display: 'flex',
        gap: '10px',
        alignItems: 'flex-start',
        ...style,
      }}
    >
      {icon ? <span>{icon}</span> : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        {title ? <div className="appui-Alert-title">{title}</div> : null}
        <div className="appui-Alert-message">{children}</div>
      </div>
      {withCloseButton ? (
        <button
          type="button"
          className="appui-Alert-closeButton"
          onClick={() => onClose?.()}
          aria-label="Close"
        >
          ×
        </button>
      ) : null}
    </div>
  )
}

export function ActionIcon(props: any) {
  const {
    className,
    children,
    loading,
    size = 'md',
    variant = 'default',
    color,
    component,
    disabled,
    ...restProps
  } = props

  const { rest, style } = splitSystemProps(restProps)
  const dimensionMap: Record<string, number> = {
    xs: 28,
    sm: 32,
    md: 36,
    lg: 40,
    xl: 46,
  }

  const sizeValue = typeof size === 'number' ? size : dimensionMap[size] ?? dimensionMap.md
  const colorValue = resolveColor(color)
  const Comp: any = component ?? 'button'

  return (
    <Comp
      {...rest}
      type={component ? undefined : 'button'}
      disabled={disabled || loading}
      data-variant={variant}
      data-color={color}
      className={cn('appui-ActionIcon-root', className)}
      style={{
        width: `${sizeValue}px`,
        height: `${sizeValue}px`,
        minWidth: `${sizeValue}px`,
        borderRadius: '10px',
        border: '1px solid var(--app-surface-border)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--app-surface)',
        color: colorValue,
        ...style,
      }}
    >
      {loading ? <InlineSpinner size={14} /> : children}
    </Comp>
  )
}

export function Loader(props: any) {
  const { className, size = 'md', ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const dimension = resolveDimension(size) ?? '20px'

  return (
    <span
      {...(rest as HTMLAttributes<HTMLSpanElement>)}
      className={cn('appui-Loader-root', className)}
      aria-hidden
      style={{
        width: dimension,
        height: dimension,
        borderRadius: '9999px',
        border: '2px solid currentColor',
        borderTopColor: 'transparent',
        display: 'inline-block',
        animation: 'appui-spin 0.7s linear infinite',
        ...style,
      }}
    />
  )
}

export function ThemeIcon(props: any) {
  const { className, children, size = 'md', color, variant = 'light', ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const dimensionMap: Record<string, number> = {
    xs: 20,
    sm: 24,
    md: 28,
    lg: 34,
    xl: 40,
  }

  const sizeValue = typeof size === 'number' ? size : dimensionMap[size] ?? dimensionMap.md
  const colorValue = resolveColor(color)

  return (
    <span
      {...(rest as HTMLAttributes<HTMLSpanElement>)}
      data-variant={variant}
      data-color={color}
      className={cn('appui-ThemeIcon-root', className)}
      style={{
        width: `${sizeValue}px`,
        height: `${sizeValue}px`,
        minWidth: `${sizeValue}px`,
        borderRadius: '9999px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colorValue,
        background:
          variant === 'filled' ? 'color-mix(in srgb, currentColor 22%, transparent)' : 'color-mix(in srgb, currentColor 10%, transparent)',
        ...style,
      }}
    >
      {children}
    </span>
  )
}

export function Progress(props: any) {
  const { className, value = 0, color, size = 10, radius, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  const colorValue = resolveColor(color) ?? 'hsl(var(--primary))'
  const sizeMap: Record<string, string> = {
    xs: '4px',
    sm: '6px',
    md: '10px',
    lg: '14px',
    xl: '18px',
  }
  const height =
    typeof size === 'string' ? sizeMap[size] ?? resolveDimension(size) ?? '10px' : resolveDimension(size) ?? '10px'

  return (
    <div
      {...(rest as HTMLAttributes<HTMLDivElement>)}
      className={cn('appui-Progress-root', className)}
      style={{
        width: '100%',
        height,
        borderRadius: resolveRadius(radius) ?? '9999px',
        background: 'hsl(var(--muted))',
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        className="appui-Progress-section"
        style={{
          width: `${safeValue}%`,
          height: '100%',
          background: colorValue,
          transition: 'width 220ms ease',
        }}
      />
    </div>
  )
}

export function Image(props: any) {
  const { className, src, alt, fit, h, radius, ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)

  return (
    <img
      {...(rest as HTMLAttributes<HTMLImageElement>)}
      src={src}
      alt={alt}
      className={cn('appui-Image-root', className)}
      style={{
        width: '100%',
        height: resolveDimension(h),
        objectFit: fit,
        borderRadius: resolveDimension(radius),
        ...style,
      }}
    />
  )
}

type TooltipProps = {
  label?: ReactNode
  disabled?: boolean
  withArrow?: boolean
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  children: ReactNode
}

export function Tooltip({ label, disabled, withArrow, side, align, children }: TooltipProps) {
  if (!label || disabled) {
    return <>{children}</>
  }

  const trigger = isValidElement(children) ? children : <span>{children}</span>

  return (
    <TooltipProvider>
      <UiTooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          sideOffset={6}
          className="max-w-[320px]"
          data-arrow={withArrow ? 'true' : undefined}
        >
          {label}
        </TooltipContent>
      </UiTooltip>
    </TooltipProvider>
  )
}

