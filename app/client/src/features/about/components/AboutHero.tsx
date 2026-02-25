import { Group, Paper, Stack, Text, Title } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
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
            <AppBadge color="cyan" variant="light" w="fit-content">
              Справка
            </AppBadge>
            <Title order={1} className="about-title">
              О приложении и инструкция
            </Title>
            <Text className="about-subtitle">
              Подробное руководство по рабочему процессу: что настраивать, в каком порядке запускать генерацию и куда переходить при ошибках.
            </Text>
          </Stack>
          <AppButton variant="default" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate(ROUTES.HOME)}>
            Назад в панель
          </AppButton>
        </Group>
      </Stack>
    </Paper>
  )
}




