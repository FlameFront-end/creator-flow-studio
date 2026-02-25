import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { cn } from '../lib/cn'
import { Button, buttonVariants } from './ui/button'
import { Spinner } from './ui/spinner'

export type AppButtonVariant = 'dark' | 'white' | 'red' | 'text' | 'custom'
export type LegacyAppButtonVariant = 'primary' | 'secondary' | 'danger'
type LegacyButtonVariant =
  | 'filled'
  | 'default'
  | 'light'
  | 'subtle'
  | 'outline'
  | 'transparent'
type LegacyButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type UiVariant = NonNullable<Parameters<typeof buttonVariants>[0]>['variant']
type UiSize = NonNullable<Parameters<typeof buttonVariants>[0]>['size']

type AppButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'color'> & {
  buttonVariant?: AppButtonVariant
  styleVariant?: LegacyAppButtonVariant
  variant?: LegacyButtonVariant
  color?: string
  loading?: boolean
  fullWidth?: boolean
  leftSection?: ReactNode
  rightSection?: ReactNode
  size?: LegacyButtonSize
  w?: CSSProperties['width']
}

const resolveButtonVariant = (
  buttonVariant: AppButtonVariant | undefined,
  styleVariant: LegacyAppButtonVariant | undefined,
  props: { color?: string; variant?: LegacyButtonVariant },
): AppButtonVariant => {
  if (buttonVariant) return buttonVariant
  if (styleVariant === 'primary') return 'dark'
  if (styleVariant === 'secondary') return 'white'
  if (styleVariant === 'danger') return 'red'

  if (
    props.color === 'red' &&
    (props.variant === 'filled' || props.variant === 'light' || props.variant === 'default')
  ) {
    return 'red'
  }

  if (props.variant === 'subtle') return 'text'
  if (props.variant === 'filled') return 'dark'
  if (props.variant === undefined) return 'dark'
  if (
    props.variant === 'default' ||
    props.variant === 'light'
  ) {
    return 'white'
  }

  return 'custom'
}

const resolveUiVariant = (
  resolvedVariant: AppButtonVariant,
  legacyVariant?: LegacyButtonVariant,
): UiVariant => {
  if (resolvedVariant === 'dark') return 'default'
  if (resolvedVariant === 'white') {
    return legacyVariant === 'light' ? 'outline' : 'secondary'
  }
  if (resolvedVariant === 'red') {
    if (legacyVariant === 'default' || legacyVariant === 'light' || legacyVariant === 'outline') {
      return 'outline'
    }
    return 'destructive'
  }
  if (resolvedVariant === 'text') return 'ghost'
  if (legacyVariant === 'subtle') return 'ghost'
  if (legacyVariant === 'filled') return 'default'
  return 'outline'
}

const resolveUiSize = (size: LegacyButtonSize | undefined): UiSize => {
  if (size === 'xs') return 'sm'
  if (size === 'lg' || size === 'xl') return 'lg'
  return 'default'
}

const textColorClassMap: Record<string, string> = {
  red: 'text-red-700 hover:text-red-700 hover:bg-red-500/8 dark:text-red-300 dark:hover:text-red-200 dark:hover:bg-red-500/16',
  green:
    'text-emerald-700 hover:text-emerald-700 hover:bg-emerald-500/8 dark:text-emerald-300 dark:hover:text-emerald-200 dark:hover:bg-emerald-500/16',
  cyan: 'text-sky-700 hover:text-sky-700 hover:bg-sky-500/8 dark:text-sky-300 dark:hover:text-sky-200 dark:hover:bg-sky-500/16',
  blue: 'text-sky-700 hover:text-sky-700 hover:bg-sky-500/8 dark:text-sky-300 dark:hover:text-sky-200 dark:hover:bg-sky-500/16',
  brand:
    'text-zinc-800 hover:text-zinc-800 hover:bg-zinc-500/8 dark:text-zinc-200 dark:hover:text-zinc-100 dark:hover:bg-zinc-500/16',
}

const outlineColorClassMap: Record<string, string> = {
  red: 'border-red-300/70 text-red-700 hover:bg-red-500/8 dark:border-red-700/70 dark:text-red-300 dark:hover:bg-red-500/14',
}

export function AppButton({
  buttonVariant,
  styleVariant,
  className,
  color,
  variant,
  size,
  loading = false,
  fullWidth = false,
  leftSection,
  rightSection,
  w,
  style,
  children,
  disabled,
  ...props
}: AppButtonProps) {
  const resolvedButtonVariant = resolveButtonVariant(buttonVariant, styleVariant, {
    color,
    variant,
  })
  const colorClassName = typeof color === 'string' ? `app-button-color-${color}` : null
  const uiVariant = resolveUiVariant(resolvedButtonVariant, variant)
  const uiSize = resolveUiSize(size)

  const toneClassName =
    resolvedButtonVariant === 'text' && color
      ? textColorClassMap[color] ?? undefined
      : resolvedButtonVariant === 'red' && color
        ? outlineColorClassMap[color] ?? undefined
        : undefined

  return (
    <Button
      {...props}
      variant={uiVariant}
      size={uiSize}
      disabled={disabled || loading}
      className={cn(
        'app-button gap-2',
        fullWidth && 'w-full',
        `app-button--${resolvedButtonVariant}`,
        colorClassName,
        toneClassName,
        className,
      )}
      style={{ ...(style ?? {}), width: w }}
      data-app-button-variant={resolvedButtonVariant}
      data-loading={loading ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : null}
      {leftSection ? <span className="inline-flex shrink-0 items-center">{leftSection}</span> : null}
      {children ? <span>{children}</span> : null}
      {rightSection ? <span className="inline-flex shrink-0 items-center">{rightSection}</span> : null}
    </Button>
  )
}

