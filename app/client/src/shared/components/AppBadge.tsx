import type { CSSProperties, HTMLAttributes } from 'react'
import { cn } from '../lib/cn'

export type AppBadgeVariant =
  | 'neutral'
  | 'info'
  | 'success'
  | 'danger'
  | 'accent'
  | 'custom'
type LegacyBadgeVariant =
  | 'light'
  | 'filled'
  | 'dot'
  | 'outline'
  | 'gradient'
  | 'white'
  | 'transparent'
type LegacyBadgeSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

type AppBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  badgeVariant?: AppBadgeVariant
  color?: string
  variant?: LegacyBadgeVariant
  size?: LegacyBadgeSize
  w?: CSSProperties['width']
}

const resolveBadgeVariant = ({
  badgeVariant,
  color,
  variant,
}: AppBadgeProps): AppBadgeVariant => {
  if (badgeVariant) return badgeVariant
  if (
    variant === 'dot' ||
    variant === 'outline' ||
    variant === 'gradient' ||
    variant === 'white' ||
    variant === 'transparent'
  ) {
    return 'custom'
  }
  if (variant === 'filled') return 'accent'
  if (color === 'red') return 'danger'
  if (color === 'green') return 'success'
  if (color === 'blue' || color === 'cyan' || color === 'grape') return 'info'
  if (color === 'brand') return 'accent'
  return 'neutral'
}

const sizeClassMap: Record<LegacyBadgeSize, string> = {
  xs: 'text-[0.65rem] px-2 py-0.5',
  sm: 'text-[0.7rem] px-2 py-0.5',
  md: 'text-xs px-2.5 py-0.5',
  lg: 'text-sm px-3 py-1',
  xl: 'text-sm px-3.5 py-1',
}

const variantClassMap: Record<AppBadgeVariant, string> = {
  neutral:
    'border-zinc-300/70 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/70 dark:text-zinc-300',
  info: 'border-sky-300/60 bg-sky-100/80 text-sky-700 dark:border-sky-700/70 dark:bg-sky-900/40 dark:text-sky-300',
  success:
    'border-emerald-300/60 bg-emerald-100/80 text-emerald-700 dark:border-emerald-700/70 dark:bg-emerald-900/35 dark:text-emerald-300',
  danger:
    'border-red-300/60 bg-red-100/80 text-red-700 dark:border-red-700/70 dark:bg-red-900/35 dark:text-red-300',
  accent: 'border-border/60 bg-secondary/80 text-secondary-foreground',
  custom: 'border-border/75 bg-card/65 text-foreground',
}

export function AppBadge({
  badgeVariant,
  className,
  color,
  variant,
  size = 'md',
  w,
  style,
  children,
  ...props
}: AppBadgeProps) {
  const resolvedBadgeVariant = resolveBadgeVariant({ color, variant, badgeVariant })
  const mergedClassName = cn(
    'app-badge inline-flex items-center gap-1 rounded-full border font-semibold leading-none',
    `app-badge--${resolvedBadgeVariant}`,
    sizeClassMap[size],
    variantClassMap[resolvedBadgeVariant],
    className,
  )

  return (
    <span
      {...props}
      className={mergedClassName}
      style={{ ...(style ?? {}), width: w }}
      data-app-badge-variant={resolvedBadgeVariant}
    >
      {variant === 'dot' ? (
        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" aria-hidden />
      ) : null}
      {children}
    </span>
  )
}
