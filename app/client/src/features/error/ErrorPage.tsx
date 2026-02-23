import {
  Alert,
  Badge,
  Button,
  Code,
  Divider,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core'
import {
  IconAlertTriangle,
  IconBug,
  IconCopy,
  IconRefresh,
  IconShieldLock,
} from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { isRouteErrorResponse, useLocation, useNavigate, useRouteError } from 'react-router-dom'
import { ROUTES } from '../../shared/model/routes'

const isModuleLoadLikeError = (error: unknown): boolean =>
  error instanceof Error &&
  /chunk|module script|failed to fetch|importing a module script failed|networkerror|preload css/i.test(
    error.message,
  )

const getErrorMessage = (error: unknown): string => {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return 'Страница не найдена'
    }
    if (error.status >= 500) {
      return 'Внутренняя ошибка сервера'
    }
    return error.statusText || 'Ошибка роутинга'
  }

  if (error instanceof Error) {
    const messageLower = error.message.toLowerCase()

    if (
      messageLower.includes('preload css') ||
      messageLower.includes('unable to preload css') ||
      messageLower.includes('failed to preload css')
    ) {
      return 'Ошибка предзагрузки ресурсов. Попробуйте обновить страницу.'
    }

    if (isModuleLoadLikeError(error)) {
      return 'Не удалось загрузить часть приложения. Возможно, кеш устарел или есть сетевой сбой.'
    }

    return error.message || 'Непредвиденная ошибка'
  }

  return 'Непредвиденная ошибка'
}

const formatErrorDetails = (error: unknown) => {
  if (isRouteErrorResponse(error)) {
    return {
      type: 'RouteErrorResponse',
      status: error.status,
      statusText: error.statusText,
      data: error.data,
    }
  }

  if (error instanceof Error) {
    return {
      type: 'Error',
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    }
  }

  return { type: 'Unknown', value: String(error) }
}

export default function ErrorPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const error = useRouteError()
  const [showDetails, setShowDetails] = useState(false)
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle')

  const message = useMemo(() => getErrorMessage(error), [error])
  const isModuleLoadError = useMemo(() => isModuleLoadLikeError(error), [error])
  const details = useMemo(() => formatErrorDetails(error), [error])
  const detailsString = useMemo(() => JSON.stringify(details, null, 2), [details])

  const handleReload = () => window.location.reload()

  const handleClearCacheAndReload = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map((name) => caches.delete(name)))
      }

      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((reg) => reg.unregister()))
      }
    } finally {
      window.location.reload()
    }
  }

  const handleCopyDetails = async () => {
    try {
      await navigator.clipboard.writeText(
        [
          'Отчёт об ошибке',
          '',
          `Маршрут: ${location.pathname}`,
          `Сообщение: ${message}`,
          '',
          'Детали:',
          detailsString,
        ].join('\n'),
      )
      setCopyState('ok')
    } catch {
      setCopyState('error')
    } finally {
      setTimeout(() => setCopyState('idle'), 1600)
    }
  }

  return (
    <Paper className="panel-surface error-page-shell" radius={24} p="xl" maw={980} mx="auto" mt={40}>
      <Stack gap="lg">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <Group align="flex-start" gap="md">
            <ThemeIcon radius="xl" size={48} variant="light" color="red">
              <IconAlertTriangle size={26} />
            </ThemeIcon>
            <Stack gap={6}>
              <Title order={1} className="error-page-title">
                Что-то пошло не так
              </Title>
              <Text c="dimmed" size="lg">
                {message}
              </Text>
            </Stack>
          </Group>
          <Badge color={isModuleLoadError ? 'orange' : 'red'} size="lg" variant="light">
            {isModuleLoadError ? 'Проблема загрузки модулей' : 'Ошибка интерфейса'}
          </Badge>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Paper className="inner-surface error-meta-card" radius="md" p="sm">
            <Group gap="xs" mb={6}>
              <IconShieldLock size={16} />
              <Text size="sm" fw={600}>
                Маршрут
              </Text>
            </Group>
            <Code>{location.pathname}</Code>
          </Paper>
          <Paper className="inner-surface error-meta-card" radius="md" p="sm">
            <Group gap="xs" mb={6}>
              <IconBug size={16} />
              <Text size="sm" fw={600}>
                Тип ошибки
              </Text>
            </Group>
            <Code>{isRouteErrorResponse(error) ? 'RouteErrorResponse' : 'RuntimeError'}</Code>
          </Paper>
        </SimpleGrid>

        {isModuleLoadError ? (
          <Alert color="orange" variant="light" title="Рекомендация">
            Похоже на ошибку chunk/module. Обычно помогает очистка кеша и перезагрузка.
          </Alert>
        ) : null}

        <Group gap="sm" wrap="wrap">
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={isModuleLoadError ? handleClearCacheAndReload : handleReload}
          >
            {isModuleLoadError ? 'Очистить кеш и перезагрузить' : 'Перезагрузить'}
          </Button>
          <Button variant="default" onClick={() => navigate(ROUTES.HOME, { replace: true })}>
            На главную
          </Button>
          <Button variant="subtle" onClick={() => setShowDetails((prev) => !prev)}>
            {showDetails ? 'Скрыть детали' : 'Показать детали'}
          </Button>
          <Button variant="subtle" leftSection={<IconCopy size={15} />} onClick={handleCopyDetails}>
            {copyState === 'idle'
              ? 'Скопировать детали'
              : copyState === 'ok'
                ? 'Скопировано'
                : 'Ошибка копирования'}
          </Button>
        </Group>

        <Divider opacity={0.4} />

        {showDetails ? (
          <Paper className="inner-surface error-details" radius="md" p="sm">
            <Code block>{detailsString}</Code>
          </Paper>
        ) : null}
      </Stack>
    </Paper>
  )
}
