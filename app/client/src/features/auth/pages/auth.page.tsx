import { AppBadge } from '../../../shared/components/AppBadge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/components/ui/card'
import { LoginForm } from '../LoginForm'

const AuthPage = () => {
  return (
    <div className="auth-page relative flex min-h-screen items-center py-8">
      <div className="container max-w-[460px]">
        <Card className="panel-surface auth-card border-border/80 bg-card/90">
          <CardHeader className="space-y-4">
            <AppBadge color="cyan" variant="light" w="fit-content">
              Вход в систему
            </AppBadge>
            <CardTitle className="auth-title">Creator Flow Studio</CardTitle>
            <CardDescription className="auth-subtitle text-sm md:text-base">
              Авторизуйтесь, чтобы открыть панель управления контентом.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AuthPage
