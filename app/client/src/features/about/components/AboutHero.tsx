import { Badge, Button, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { IconArrowLeft } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../shared/model/routes'

export const AboutHero = () => {
  const navigate = useNavigate()

  return (
    <Paper className="hero-surface about-hero" radius={28} p="xl">
      <Stack gap="md">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Stack gap={8} maw={860}>
            <Badge color="cyan" variant="light" w="fit-content">
              Справка
            </Badge>
            <Title order={1} className="about-title">
              О приложении и инструкция
            </Title>
            <Text className="about-subtitle">
              Панель помогает управлять проектами и запускать AI-генерацию контента: идеи, сценарии и подписи в едином рабочем потоке.
            </Text>
          </Stack>
          <Button variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(ROUTES.HOME)}>
            Назад в панель
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}

