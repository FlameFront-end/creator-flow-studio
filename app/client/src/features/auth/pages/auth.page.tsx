import { Paper, Stack, Text, Title } from '@ui/core'
import { AppBadge } from '../../../shared/components/AppBadge'
import { LoginForm } from '../components/login-form'

const AuthPage = () => {
  return (
    <div className="auth-page relative flex min-h-screen items-center py-8">
      <div className="container max-w-[460px]">
        <Paper className="panel-surface auth-card border-border/80 bg-card/90" p="lg">
          <Stack gap="md">
            <AppBadge color="cyan" variant="light" w="fit-content">
              Вход в систему
            </AppBadge>
            <Title order={2} className="auth-title">
              Creator Flow Studio
            </Title>
            <Text className="auth-subtitle text-sm md:text-base">
              Авторизуйтесь, чтобы открыть панель управления контентом.
            </Text>

            <LoginForm />
          </Stack>
        </Paper>
      </div>
    </div>
  )
}

export default AuthPage
