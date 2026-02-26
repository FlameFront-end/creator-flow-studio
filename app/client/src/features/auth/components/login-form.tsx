import { useMutation } from '@tanstack/react-query'
import { ActionIcon, TextInput } from '@ui/core'
import { IconEye, IconEyeOff } from '@tabler/icons-react'
import { useState, type FormEvent } from 'react'
import { authApi } from '../../../shared/api/services/auth.api'
import { AppButton } from '../../../shared/components/AppButton'
import { AppTabs } from '../../../shared/components/AppTabs'
import { setAuthSession } from '../../../shared/lib/auth'
import {
  showErrorToast,
  showSuccessToast,
  showValidationToast,
} from '../../../shared/lib/toast'

type AuthMode = 'login' | 'register'

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ accessToken, refreshToken }) => {
      setAuthSession({ accessToken, refreshToken })
      showSuccessToast('Вход выполнен')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось выполнить вход')
    },
  })

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: ({ accessToken, refreshToken }) => {
      setAuthSession({ accessToken, refreshToken })
      showSuccessToast('Регистрация выполнена')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось зарегистрироваться')
    },
  })

  const isPending = loginMutation.isPending || registerMutation.isPending

  const validateForm = (): boolean => {
    const normalizedEmail = email.trim()
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      showValidationToast('Введите корректный email')
      return false
    }

    if (password.length < 8) {
      showValidationToast('Пароль должен содержать минимум 8 символов')
      return false
    }

    return true
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) {
      return
    }

    const payload = {
      email: email.trim().toLowerCase(),
      password,
    }

    if (mode === 'login') {
      loginMutation.mutate(payload)
      return
    }

    registerMutation.mutate(payload)
  }

  return (
    <div className="space-y-5">
      <AppTabs
        className="auth-mode-tabs"
        value={mode}
        onChange={(nextMode) => {
          if (nextMode === 'login' || nextMode === 'register') {
            setMode(nextMode)
          }
        }}
        items={[
          { value: 'login', label: 'Вход' },
          { value: 'register', label: 'Регистрация' },
        ]}
        listClassName="overflow-hidden bg-background/40"
        tabClassName="flex-1 justify-center"
      />

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium text-foreground/95">
            Email
          </label>
          <TextInput
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(event) => setEmail(event.currentTarget.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="text-sm font-medium text-foreground/95">
              Пароль
            </label>
            <span className="text-xs text-muted-foreground">Минимум 8 символов</span>
          </div>
          <TextInput
            id="password"
            type={isPasswordVisible ? 'text' : 'password'}
            placeholder={mode === 'login' ? 'Введите пароль' : 'Создайте пароль'}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
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

        <AppButton type="submit" loading={isPending} fullWidth>
          {mode === 'login' ? 'Войти в аккаунт' : 'Создать аккаунт'}
        </AppButton>

        <p className="text-xs leading-relaxed text-muted-foreground">
          {mode === 'login' ? 'Нет аккаунта? ' : 'Уже есть аккаунт? '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="font-medium text-cyan-400 transition-colors hover:text-cyan-300"
          >
            {mode === 'login' ? 'Создать аккаунт' : 'Войти'}
          </button>
        </p>
      </form>
    </div>
  )
}
