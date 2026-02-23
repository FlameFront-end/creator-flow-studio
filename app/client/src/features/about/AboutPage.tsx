import {
  Badge,
  Box,
  Button,
  Container,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  IconArrowLeft,
  IconBulb,
  IconChecklist,
  IconFileText,
  IconRocket,
  IconSettings,
  IconSparkles,
} from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../shared/model/routes'

const quickStartSteps = [
  {
    icon: IconRocket,
    title: '1. Создайте проект',
    description: 'Во вкладке «Проекты» добавьте проект с понятным названием и описанием.',
  },
  {
    icon: IconSettings,
    title: '2. Настройте промпты',
    description: 'Заполните персонажей, шаблоны и правила в «Промпт-студии».',
  },
  {
    icon: IconSparkles,
    title: '3. Запустите генерацию',
    description: 'Во вкладке «Идеи и сценарии» выберите проект и персонажа, затем запускайте идеи/сценарии/подписи.',
  },
]

export default function AboutPage() {
  const navigate = useNavigate()

  return (
    <Box mih="100vh" py={36}>
      <Container size="xl" className="app-page-container">
        <Stack gap="lg">
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
                    Панель помогает управлять проектами и запускать AI-генерацию контента: идеи, сценарии и подписи в
                    едином рабочем потоке.
                  </Text>
                </Stack>
                <Button
                  variant="default"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={() => navigate(ROUTES.HOME)}
                >
                  Назад в панель
                </Button>
              </Group>
            </Stack>
          </Paper>

          <Paper className="panel-surface" radius={24} p="lg">
            <Stack gap="md">
              <Group gap="xs">
                <ThemeIcon variant="light" color="cyan" radius="xl">
                  <IconChecklist size={16} />
                </ThemeIcon>
                <Title order={4}>Быстрый старт</Title>
              </Group>
              <SimpleGrid cols={{ base: 1, md: 3 }} spacing="sm">
                {quickStartSteps.map((step) => (
                  <Paper key={step.title} className="inner-surface about-step-card" radius="md" p="md">
                    <Stack gap="xs">
                      <ThemeIcon variant="light" color="cyan" radius="xl" size={34}>
                        <step.icon size={18} />
                      </ThemeIcon>
                      <Text fw={700}>{step.title}</Text>
                      <Text size="sm" c="dimmed">
                        {step.description}
                      </Text>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          </Paper>

          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <Paper className="panel-surface" radius={24} p="lg">
              <Stack gap="sm">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="teal" radius="xl">
                    <IconFileText size={16} />
                  </ThemeIcon>
                  <Title order={4}>Статусы задач</Title>
                </Group>
                <Group gap="xs" wrap="wrap">
                  <Badge color="gray" variant="light">
                    В очереди
                  </Badge>
                  <Text size="sm" c="dimmed">
                    Задача принята и ожидает выполнения.
                  </Text>
                </Group>
                <Group gap="xs" wrap="wrap">
                  <Badge color="blue" variant="light">
                    Выполняется
                  </Badge>
                  <Text size="sm" c="dimmed">
                    AI сейчас обрабатывает запрос.
                  </Text>
                </Group>
                <Group gap="xs" wrap="wrap">
                  <Badge color="green" variant="light">
                    Успех
                  </Badge>
                  <Text size="sm" c="dimmed">
                    Результат получен и сохранён.
                  </Text>
                </Group>
                <Group gap="xs" wrap="wrap">
                  <Badge color="red" variant="light">
                    Ошибка
                  </Badge>
                  <Text size="sm" c="dimmed">
                    Откройте логи, чтобы увидеть причину и повторить запуск.
                  </Text>
                </Group>
              </Stack>
            </Paper>

            <Paper className="panel-surface" radius={24} p="lg">
              <Stack gap="sm">
                <Group gap="xs">
                  <ThemeIcon variant="light" color="yellow" radius="xl">
                    <IconBulb size={16} />
                  </ThemeIcon>
                  <Title order={4}>Если что-то не работает</Title>
                </Group>
                <Text size="sm" c="dimmed">
                  1. Проверьте заполнение обязательных полей проекта и промптов.
                </Text>
                <Text size="sm" c="dimmed">
                  2. Убедитесь, что запущены server, worker и redis.
                </Text>
                <Text size="sm" c="dimmed">
                  3. Проверьте переменные окружения (`OPENAI_API_KEY`, БД, Redis).
                </Text>
                <Text size="sm" c="dimmed">
                  4. Смотрите «Логи прогонов AI» в разделе идей: время, операция, статус и текст ошибки.
                </Text>
              </Stack>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  )
}
