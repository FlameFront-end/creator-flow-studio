import { Paper, Stack, Text, Title } from '@ui/core'
import { LoginForm } from '../components/login-form'

const AuthPage = () => {
  return (
    <div className="auth-page relative min-h-screen py-8 md:py-12">
      <div className="container max-w-[560px]">
        <Paper className="panel-surface border-border/80 bg-card/90 p-6 md:p-8" radius={24}>
          <Stack gap="sm">
            <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-400/90">
              Creator Flow Studio
            </Text>
            <Title order={1} className="auth-title text-3xl md:text-4xl">
              Вход в аккаунт
            </Title>
            <Text className="auth-subtitle text-sm md:text-base">
              Введите email и пароль. Если аккаунта нет, создайте его за минуту.
            </Text>
            <LoginForm />
          </Stack>
        </Paper>
      </div>
    </div>
  )
}

export default AuthPage
