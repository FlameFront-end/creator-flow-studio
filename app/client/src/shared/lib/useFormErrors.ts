import { useCallback, useMemo, useState } from 'react'

type FormErrors<TField extends string> = Partial<Record<TField, string>>

export function useFormErrors<TField extends string>() {
  const [errors, setErrors] = useState<FormErrors<TField>>({})

  const setError = useCallback((field: TField, message: string) => {
    setErrors((current) => ({ ...current, [field]: message }))
  }, [])

  const clearError = useCallback((field: TField) => {
    setErrors((current) => {
      if (!current[field]) {
        return current
      }
      const next = { ...current }
      delete next[field]
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setErrors({})
  }, [])

  const getFirstErrorField = useCallback((): TField | null => {
    const first = Object.keys(errors)[0]
    return (first as TField | undefined) ?? null
  }, [errors])

  const hasErrors = useMemo(() => Object.keys(errors).length > 0, [errors])

  return {
    errors,
    hasErrors,
    setErrors,
    setError,
    clearError,
    clearAll,
    getFirstErrorField,
  }
}
