import { Badge, Box, Container, Paper, Stack, Text, Title } from '@mantine/core'
import { LoginForm } from '../LoginForm'

const AuthPage = () => {
  return (
    <Box mih="100vh" py={36}>
      <Container size={460}>
        <Stack gap="lg">
          <Paper className="hero-surface" radius={24} p="xl">
            <Stack gap={6}>
              <Badge color="cyan" variant="light" w="fit-content">
                Локальный вход
              </Badge>
              <Title order={2} style={{ letterSpacing: '-0.02em' }}>
                Авторизация администратора
              </Title>
              <Text c="dimmed">Введите пароль и войдите в панель управления</Text>
            </Stack>
          </Paper>
          <LoginForm />
        </Stack>
      </Container>
    </Box>
  )
}

export default AuthPage
