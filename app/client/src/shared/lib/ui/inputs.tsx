import type {
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { Slider as UiSlider } from '@/shared/components/ui/slider'
import {
  Select as UiSelect,
  SelectContent as UiSelectContent,
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
  SelectValue as UiSelectValue,
} from '@/shared/components/ui/select'
import { resolveDimension, splitSystemProps } from './system'

type FieldBaseProps = {
  className?: string
  label?: ReactNode
  required?: boolean
  withAsterisk?: boolean
  description?: ReactNode
  error?: ReactNode
  leftSection?: ReactNode
  rightSection?: ReactNode
  id?: string
  [key: string]: unknown
}

function renderLabel({
  id,
  label,
  required,
  withAsterisk,
  className,
}: {
  id: string
  label: ReactNode
  required?: boolean
  withAsterisk?: boolean
  className: string
}) {
  return (
    <label htmlFor={id} className={className}>
      {label}
      {required || withAsterisk ? <span className="appui-Input-required"> *</span> : null}
    </label>
  )
}

function FieldRoot({
  id,
  label,
  required,
  withAsterisk,
  description,
  error,
  className,
  labelClassName,
  children,
}: {
  id: string
  label?: ReactNode
  required?: boolean
  withAsterisk?: boolean
  description?: ReactNode
  error?: ReactNode
  className?: string
  labelClassName: string
  children: ReactNode
}) {
  return (
    <div className={cn('appui-InputWrapper-root', className)}>
      {label ? renderLabel({ id, label, required, withAsterisk, className: labelClassName }) : null}
      {children}
      {description ? (
        <div className="appui-Input-description" style={{ marginTop: '6px', fontSize: '0.82rem', opacity: 0.85 }}>
          {description}
        </div>
      ) : null}
      {error ? (
        <div className="appui-Input-error" style={{ marginTop: '6px', fontSize: '0.82rem', color: '#ef4444' }}>
          {error}
        </div>
      ) : null}
    </div>
  )
}

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & FieldBaseProps

export function TextInput(props: TextInputProps) {
  const {
    className,
    label,
    required,
    withAsterisk,
    description,
    error,
    leftSection,
    rightSection,
    id,
    ...restProps
  } = props
  const generatedId = useId()
  const inputId = id ?? generatedId
  const { rest, style } = splitSystemProps(restProps)

  return (
    <FieldRoot
      id={inputId}
      label={label}
      required={required}
      withAsterisk={withAsterisk}
      description={description}
      error={error}
      className={className}
      labelClassName="appui-Input-label"
    >
      <div style={{ position: 'relative' }}>
        {leftSection ? (
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            {leftSection}
          </span>
        ) : null}
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          id={inputId}
          className="appui-Input-input"
          aria-invalid={Boolean(error) || undefined}
          style={{
            width: '100%',
            minHeight: '40px',
            paddingLeft: leftSection ? '34px' : undefined,
            paddingRight: rightSection ? '34px' : undefined,
            borderColor: error ? '#ef4444' : undefined,
            ...style,
          }}
        />
        {rightSection ? (
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            {rightSection}
          </span>
        ) : null}
      </div>
    </FieldRoot>
  )
}

type NumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'onChange' | 'value' | 'defaultValue' | 'type' | 'size'
> &
  FieldBaseProps & {
    value?: number | string | null
    defaultValue?: number | string | null
    onChange?: (value: number | string) => void
  }

export function NumberInput(props: NumberInputProps) {
  const {
    className,
    label,
    required,
    withAsterisk,
    description,
    error,
    leftSection,
    rightSection,
    id,
    value,
    defaultValue,
    onChange,
    ...restProps
  } = props
  const generatedId = useId()
  const inputId = id ?? generatedId
  const { rest, style } = splitSystemProps(restProps)

  return (
    <FieldRoot
      id={inputId}
      label={label}
      required={required}
      withAsterisk={withAsterisk}
      description={description}
      error={error}
      className={className}
      labelClassName="appui-NumberInput-label"
    >
      <div style={{ position: 'relative' }}>
        {leftSection ? (
          <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            {leftSection}
          </span>
        ) : null}
        <input
          {...(rest as InputHTMLAttributes<HTMLInputElement>)}
          id={inputId}
          type="number"
          className="appui-NumberInput-input"
          aria-invalid={Boolean(error) || undefined}
          value={value ?? ''}
          defaultValue={value === undefined ? (defaultValue ?? undefined) : undefined}
          onChange={(event) => {
            const raw = event.currentTarget.value
            if (raw === '') {
              onChange?.('')
              return
            }

            const parsed = Number(raw)
            onChange?.(Number.isNaN(parsed) ? raw : parsed)
          }}
          style={{
            width: '100%',
            minHeight: '40px',
            paddingLeft: leftSection ? '34px' : undefined,
            paddingRight: rightSection ? '34px' : undefined,
            borderColor: error ? '#ef4444' : undefined,
            ...style,
          }}
        />
        {rightSection ? (
          <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
            {rightSection}
          </span>
        ) : null}
      </div>
    </FieldRoot>
  )
}

type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> &
  FieldBaseProps & {
    autosize?: boolean
    minRows?: number
    maxRows?: number
    styles?: { input?: CSSProperties }
  }

export function Textarea(props: TextareaProps) {
  const {
    className,
    label,
    required,
    withAsterisk,
    description,
    error,
    id,
    autosize,
    minRows = 3,
    maxRows,
    styles,
    value,
    ...restProps
  } = props
  const generatedId = useId()
  const inputId = id ?? generatedId
  const { rest, style } = splitSystemProps(restProps)
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!autosize || !ref.current) return
    const node = ref.current
    node.style.height = 'auto'
    const nextHeight = node.scrollHeight

    if (typeof maxRows === 'number') {
      const lineHeight = parseFloat(window.getComputedStyle(node).lineHeight || '20')
      const maxHeight = lineHeight * maxRows + 16
      node.style.height = `${Math.min(nextHeight, maxHeight)}px`
      return
    }

    node.style.height = `${nextHeight}px`
  }, [autosize, value, maxRows])

  return (
    <FieldRoot
      id={inputId}
      label={label}
      required={required}
      withAsterisk={withAsterisk}
      description={description}
      error={error}
      className={className}
      labelClassName="appui-Textarea-label"
    >
      <textarea
        {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        ref={ref}
        id={inputId}
        className="appui-Textarea-input"
        aria-invalid={Boolean(error) || undefined}
        rows={autosize ? minRows : (rest.rows as number | undefined)}
        value={value}
        style={{
          width: '100%',
          minHeight: `${Math.max(Number(minRows) || 1, 1) * 24}px`,
          borderColor: error ? '#ef4444' : undefined,
          ...((styles?.input as CSSProperties | undefined) ?? {}),
          ...style,
        }}
      />
    </FieldRoot>
  )
}

type SelectItem = {
  value: string
  label: string
  disabled?: boolean
}

function normalizeSelectData(data: Array<string | SelectItem> | undefined): SelectItem[] {
  if (!Array.isArray(data)) {
    return []
  }

  return data.map((item) => {
    if (typeof item === 'string') {
      return { value: item, label: item }
    }

    return {
      value: item.value,
      label: item.label,
      disabled: item.disabled,
    }
  })
}

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value' | 'defaultValue' | 'size'> &
  FieldBaseProps & {
    data?: Array<string | SelectItem>
    value?: string | null
    defaultValue?: string | null
    onChange?: (value: string | null, option?: SelectItem | null) => void
    placeholder?: string
    clearable?: boolean
    searchable?: boolean
    nothingFoundMessage?: string
    allowDeselect?: boolean
  }

export function Select(props: SelectProps) {
  const {
    className,
    label,
    required,
    withAsterisk,
    description,
    error,
    id,
    data,
    value,
    defaultValue,
    onChange,
    placeholder,
    disabled,
    nothingFoundMessage,
    searchable: _searchable,
    clearable: _clearable,
    allowDeselect: _allowDeselect,
    ...restProps
  } = props

  const generatedId = useId()
  const inputId = id ?? generatedId
  const options = useMemo(() => normalizeSelectData(data), [data])
  const { rest, style } = splitSystemProps(restProps as Record<string, unknown>)

  return (
    <FieldRoot
      id={inputId}
      label={label}
      required={required}
      withAsterisk={withAsterisk}
      description={description}
      error={error}
      className={className}
      labelClassName="appui-Select-label"
    >
      <div className="appui-Select-root">
        <UiSelect
          value={value ?? undefined}
          defaultValue={value === undefined ? (defaultValue ?? undefined) : undefined}
          disabled={disabled}
          onValueChange={(nextValue) => {
            const option = options.find((item) => item.value === nextValue) ?? null
            onChange?.(nextValue || null, option)
          }}
        >
          <UiSelectTrigger
            {...rest}
            id={inputId}
            className="appui-Select-input"
            aria-invalid={Boolean(error) || undefined}
            style={{ width: '100%', minHeight: '42px', borderColor: error ? '#ef4444' : undefined, ...style }}
          >
            <UiSelectValue placeholder={placeholder} />
          </UiSelectTrigger>
          <UiSelectContent
            className="appui-Select-dropdown"
            style={{
              width: 'var(--radix-select-trigger-width)',
              minWidth: 'var(--radix-select-trigger-width)',
              maxWidth: 'var(--radix-select-trigger-width)',
            }}
          >
            {options.length === 0 ? (
              <div className="appui-Select-empty">{nothingFoundMessage ?? 'Нет доступных значений'}</div>
            ) : (
              options.map((item) => (
                <UiSelectItem
                  key={item.value}
                  value={item.value}
                  disabled={item.disabled}
                  className="appui-Select-option"
                >
                  {item.label}
                </UiSelectItem>
              ))
            )}
          </UiSelectContent>
        </UiSelect>
      </div>
    </FieldRoot>
  )
}

type SegmentedControlItem = {
  label: ReactNode
  value: string
  disabled?: boolean
}

type SegmentedControlProps = {
  data: Array<string | SegmentedControlItem>
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  className?: string
  [key: string]: unknown
}

export function SegmentedControl(props: SegmentedControlProps) {
  const { data, value, defaultValue, onChange, className, size = 'md', ...restProps } = props
  const { rest, style } = splitSystemProps(restProps)
  const normalized = useMemo<SegmentedControlItem[]>(
    () =>
      data.map((item) =>
        typeof item === 'string'
          ? { label: item, value: item }
          : { label: item.label, value: item.value, disabled: item.disabled },
      ),
    [data],
  )

  const controlled = value !== undefined
  const [internalValue, setInternalValue] = useState(defaultValue ?? normalized[0]?.value)
  const currentValue = controlled ? value : internalValue

  const sizeMap: Record<string, { height: number; fontSize: string }> = {
    xs: { height: 30, fontSize: '0.78rem' },
    sm: { height: 34, fontSize: '0.82rem' },
    md: { height: 38, fontSize: '0.88rem' },
    lg: { height: 42, fontSize: '0.94rem' },
    xl: { height: 46, fontSize: '1rem' },
  }

  const resolved = typeof size === 'number' ? { height: size, fontSize: '0.88rem' } : (sizeMap[size] ?? sizeMap.md)

  return (
    <div
      {...rest}
      className={cn('appui-SegmentedControl-root', className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: '1px solid var(--app-surface-border)',
        borderRadius: '9999px',
        padding: '4px',
        gap: '4px',
        ...style,
      }}
    >
      {normalized.map((item) => {
        const active = item.value === currentValue

        return (
          <button
            key={item.value}
            type="button"
            className="appui-SegmentedControl-label"
            data-active={active ? 'true' : undefined}
            disabled={item.disabled}
            onClick={() => {
              if (item.disabled) return
              if (!controlled) {
                setInternalValue(item.value)
              }
              onChange?.(item.value)
            }}
            style={{
              minHeight: `${resolved.height}px`,
              padding: '0 14px',
              borderRadius: '9999px',
              border: 'none',
              background: active ? 'hsl(var(--primary))' : 'transparent',
              color: active ? 'hsl(var(--primary-foreground))' : 'inherit',
              fontSize: resolved.fontSize,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

type SliderProps = {
  min?: number
  max?: number
  step?: number
  value?: number
  onChange?: (value: number) => void
  label?: ReactNode | ((value: number) => ReactNode)
  className?: string
  w?: CSSProperties['width']
  [key: string]: unknown
}

export function Slider(props: SliderProps) {
  const {
    min = 0,
    max = 100,
    step = 1,
    value = min,
    onChange,
    label: _label,
    className,
    w,
    ...restProps
  } = props

  const { rest, style } = splitSystemProps(restProps)

  return (
    <UiSlider
      {...rest}
      min={min}
      max={max}
      step={step}
      value={[value]}
      onValueChange={(next) => onChange?.(next[0] ?? value)}
      className={cn('appui-Slider-root', className)}
      style={{ ...(style ?? {}), width: resolveDimension(w) }}
    />
  )
}

