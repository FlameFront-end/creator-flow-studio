import { useMutation } from '@tanstack/react-query'
import { TextInput } from '@ui/core'
import { useState, type FormEvent } from 'react'
import { authApi } from '../../../shared/api/services/auth.api'
import { AppButton } from '../../../shared/components/AppButton'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { setAuthToken } from '../../../shared/lib/auth'
import { getErrorMessage } from '../../../shared/lib/httpError'
import {
  showErrorToast,
  showSuccessToast,
  showValidationToast,
} from '../../../shared/lib/toast'

export function LoginForm() {
  const [password, setPassword] = useState('admin-password')

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ token }) => {
      setAuthToken(token)
      showSuccessToast('Вход выполнен')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось выполнить вход')
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (password.trim().length < 3) {
      showValidationToast('Введите корректный пароль')
      return
    }

    loginMutation.mutate({ password })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Для локального запуска пароль по умолчанию:{' '}
        <span className="font-semibold text-foreground">admin-password</span>
      </p>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Пароль
          </label>
          <TextInput
            id="password"
            type="password"
            placeholder="admin-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
          />
        </div>

        <AppButton type="submit" loading={loginMutation.isPending} fullWidth>
          Войти
        </AppButton>

        {loginMutation.isError ? (
          <AppInlineErrorAlert>
            {getErrorMessage(loginMutation.error, 'Не удалось выполнить вход')}
          </AppInlineErrorAlert>
        ) : null}
      </form>
    </div>
  )
}
