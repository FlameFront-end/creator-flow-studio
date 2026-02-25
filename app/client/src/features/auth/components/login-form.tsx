import { useMutation } from '@tanstack/react-query'
import { ActionIcon, TextInput } from '@ui/core'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { authApi } from '../../../shared/api/services/auth.api'
import { AppButton } from '../../../shared/components/AppButton'
import { setAuthToken } from '../../../shared/lib/auth'
import {
  showErrorToast,
  showSuccessToast,
  showValidationToast,
} from '../../../shared/lib/toast'

export function LoginForm() {
  const [password, setPassword] = useState('admin-password')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

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

      <form onSubmit={onSubmit} className="space-y-3" noValidate>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Пароль
          </label>
          <TextInput
            id="password"
            type={isPasswordVisible ? 'text' : 'password'}
            placeholder="admin-password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            required
            rightSection={
              <ActionIcon
                variant="subtle"
                onClick={() => setIsPasswordVisible((current) => !current)}
                aria-label={isPasswordVisible ? 'Скрыть пароль' : 'Показать пароль'}
                style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
              >
                {isPasswordVisible ? <IconEyeOff size={16} /> : <IconEye size={16} />}
              </ActionIcon>
            }
          />
        </div>

        <AppButton type="submit" loading={loginMutation.isPending} fullWidth>
          Войти
        </AppButton>
      </form>
    </div>
  )
}
