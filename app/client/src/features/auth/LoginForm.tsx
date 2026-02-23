import { Alert, Button, Paper, PasswordInput, Stack, Text, Title } from '@mantine/core'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { authApi } from '../../shared/api/services/auth.api'
import { setAuthToken } from '../../shared/lib/auth'
import { getErrorMessage } from '../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../shared/lib/toast'

export function LoginForm() {
  const [password, setPassword] = useState('changeme')

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
    <Paper className="panel-surface login-surface" radius={24} p="xl">
      <Stack gap="md">
        <div>
          <Title order={3}>Вход</Title>
          <Text c="dimmed" mt={4}>
            Пароль подставлен автоматически для локальной разработки
          </Text>
        </div>

        <form onSubmit={onSubmit}>
          <Stack gap="sm">
            <PasswordInput
              label="Пароль"
              placeholder="changeme"
              value={password}
              onChange={(event) => setPassword(event.currentTarget.value)}
              required
            />

            <Button type="submit" loading={loginMutation.isPending}>
              Войти
            </Button>

            {loginMutation.isError ? (
              <Alert color="red" title="Ошибка входа" variant="light">
                {getErrorMessage(loginMutation.error, 'Не удалось выполнить вход')}
              </Alert>
            ) : null}
          </Stack>
        </form>
      </Stack>
    </Paper>
  )
}
