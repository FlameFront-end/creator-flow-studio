import { Group, Paper, Stack, Text, Title } from '@ui/core'

import { AppButton } from '../../shared/components/AppButton'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../shared/model/routes'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <Paper className="panel-surface" radius={24} p="xl" maw={700} mx="auto" mt={50}>
      <Stack gap="sm">
        <Title order={2}>404</Title>
        <Text c="dimmed">Страница не найдена</Text>
        <Group mt="sm">
          <AppButton onClick={() => navigate(ROUTES.HOME, { replace: true })}>На главную</AppButton>
        </Group>
      </Stack>
    </Paper>
  )
}





