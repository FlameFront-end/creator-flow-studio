import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
  Title,
} from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { ideasApi, type Idea, type IdeaFormat } from '../../shared/api/services/ideas.api'
import { personasApi } from '../../shared/api/services/personas.api'
import { projectsApi } from '../../shared/api/services/projects.api'
import { AppTable } from '../../shared/components/AppTable'
import { getErrorMessage } from '../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../shared/lib/toast'

const IDEAS_QUERY_KEY = ['ideas'] as const
const IDEA_DETAILS_QUERY_KEY = ['idea-details'] as const
const AI_LOGS_QUERY_KEY = ['ai-run-logs'] as const

const formatStatusLabel = (status: string) => {
  switch (status) {
    case 'queued':
      return 'В очереди'
    case 'running':
      return 'Выполняется'
    case 'succeeded':
      return 'Успех'
    case 'failed':
      return 'Ошибка'
    default:
      return status
  }
}

const formatOperationLabel = (operation: string) => {
  switch (operation) {
    case 'ideas':
      return 'Генерация идей'
    case 'script':
      return 'Генерация сценария'
    case 'caption':
      return 'Генерация подписи'
    default:
      return operation
  }
}

const formatLatency = (latencyMs: number | null) => {
  if (latencyMs == null) {
    return '—'
  }
  if (latencyMs < 1000) {
    return `${latencyMs} мс`
  }
  return `${(latencyMs / 1000).toFixed(2)} с`
}

const formatTokens = (tokens: number | null) => {
  if (tokens == null) {
    return '—'
  }
  return tokens.toLocaleString('ru-RU')
}

const formatLogDate = (value: string) =>
  new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

const statusColor: Record<string, string> = {
  queued: 'gray',
  running: 'blue',
  succeeded: 'green',
  failed: 'red',
}

export function IdeasLabPage() {
  const queryClient = useQueryClient()
  const [projectId, setProjectId] = useState<string | null>(null)
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [topic, setTopic] = useState('Вертикальный ролик с цепляющим первым кадром')
  const [count, setCount] = useState('5')
  const [format, setFormat] = useState<IdeaFormat>('reel')

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.getProjects,
  })
  const personasQuery = useQuery({
    queryKey: ['personas'],
    queryFn: personasApi.getPersonas,
  })

  useEffect(() => {
    if (!projectId && projectsQuery.data?.length) {
      setProjectId(projectsQuery.data[0].id)
    }
  }, [projectId, projectsQuery.data])

  useEffect(() => {
    if (!personaId && personasQuery.data?.length) {
      setPersonaId(personasQuery.data[0].id)
    }
  }, [personaId, personasQuery.data])

  const ideasQuery = useQuery({
    queryKey: [...IDEAS_QUERY_KEY, projectId],
    queryFn: () => ideasApi.getIdeas(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: 4000,
  })

  useEffect(() => {
    if (!selectedIdeaId && ideasQuery.data?.length) {
      setSelectedIdeaId(ideasQuery.data[0].id)
    }
  }, [selectedIdeaId, ideasQuery.data])

  const detailsQuery = useQuery({
    queryKey: [...IDEA_DETAILS_QUERY_KEY, selectedIdeaId],
    queryFn: () => ideasApi.getIdea(selectedIdeaId as string),
    enabled: Boolean(selectedIdeaId),
    refetchInterval: 4000,
  })

  const logsQuery = useQuery({
    queryKey: [...AI_LOGS_QUERY_KEY, projectId],
    queryFn: () => ideasApi.getLogs(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: 4000,
  })

  const generateIdeasMutation = useMutation({
    mutationFn: ideasApi.generateIdeas,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...IDEAS_QUERY_KEY, projectId] })
      void queryClient.invalidateQueries({ queryKey: [...AI_LOGS_QUERY_KEY, projectId] })
      showSuccessToast('Задача генерации идей поставлена в очередь')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось поставить задачу в очередь')
    },
  })

  const generateScriptMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateScript(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...IDEAS_QUERY_KEY, projectId] })
      void queryClient.invalidateQueries({ queryKey: [...IDEA_DETAILS_QUERY_KEY, selectedIdeaId] })
      void queryClient.invalidateQueries({ queryKey: [...AI_LOGS_QUERY_KEY, projectId] })
      showSuccessToast('Задача генерации сценария поставлена в очередь')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось поставить сценарий в очередь')
    },
  })

  const generateCaptionMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateCaption(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [...IDEAS_QUERY_KEY, projectId] })
      void queryClient.invalidateQueries({ queryKey: [...IDEA_DETAILS_QUERY_KEY, selectedIdeaId] })
      void queryClient.invalidateQueries({ queryKey: [...AI_LOGS_QUERY_KEY, projectId] })
      showSuccessToast('Задача генерации подписи поставлена в очередь')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось поставить подпись в очередь')
    },
  })

  const selectedIdea = useMemo(
    () => ideasQuery.data?.find((idea) => idea.id === selectedIdeaId) ?? null,
    [ideasQuery.data, selectedIdeaId],
  )

  const logsStats = useMemo(() => {
    const logs = logsQuery.data ?? []
    const successCount = logs.filter((log) => log.status === 'succeeded').length
    const failedCount = logs.filter((log) => log.status === 'failed').length
    const avgLatencyMs =
      logs.length > 0
        ? Math.round(logs.reduce((acc, log) => acc + (log.latencyMs ?? 0), 0) / logs.length)
        : 0
    const totalTokens = logs.reduce((acc, log) => acc + (log.tokens ?? 0), 0)

    return {
      total: logs.length,
      successCount,
      failedCount,
      avgLatencyMs,
      totalTokens,
    }
  }, [logsQuery.data])

  const submitDisabled = !projectId || !personaId || topic.trim().length < 3
  const parsedCount = Number(count)
  const safeCount = Number.isFinite(parsedCount) ? Math.max(3, Math.min(10, Math.floor(parsedCount))) : 5

  const startIdeaGeneration = () => {
    if (submitDisabled) {
      showValidationToast('Выберите проект, персонажа и заполните тему')
      return
    }

    if (!Number.isFinite(parsedCount)) {
      showValidationToast('Количество идей должно быть числом от 3 до 10')
      return
    }

    if (parsedCount < 3 || parsedCount > 10) {
      showValidationToast('Количество идей должно быть в диапазоне 3-10')
      return
    }

    generateIdeasMutation.mutate({
      projectId: projectId as string,
      personaId: personaId as string,
      topic: topic.trim(),
      count: safeCount,
      format,
    })
  }

  const triggerScript = (idea: Idea, regenerate: boolean) => {
    generateScriptMutation.mutate({ ideaId: idea.id, regenerate })
  }

  const triggerCaption = (idea: Idea, regenerate: boolean) => {
    generateCaptionMutation.mutate({ ideaId: idea.id, regenerate })
  }

  return (
    <Stack gap="md">
      <Paper className="panel-surface" radius={28} p="xl">
        <Stack gap="md">
          <Title order={3}>Идеи и сценарии</Title>
          <SimpleGrid cols={{ base: 1, md: 3 }}>
            <Select
              label="Проект"
              value={projectId}
              onChange={setProjectId}
              data={(projectsQuery.data ?? []).map((project) => ({
                value: project.id,
                label: project.name,
              }))}
              searchable
              placeholder="Выберите проект"
            />
            <Select
              label="Персонаж"
              value={personaId}
              onChange={setPersonaId}
              data={(personasQuery.data ?? []).map((persona) => ({
                value: persona.id,
                label: persona.name,
              }))}
              searchable
              placeholder="Выберите персонажа"
            />
            <Select
              label="Формат"
              value={format}
              onChange={(value) => setFormat((value as IdeaFormat) ?? 'reel')}
              data={[
                { value: 'reel', label: 'Reel' },
                { value: 'short', label: 'Short' },
                { value: 'tiktok', label: 'TikTok' },
              ]}
              allowDeselect={false}
            />
          </SimpleGrid>

          <Textarea
            label="Тема"
            value={topic}
            onChange={(event) => setTopic(event.currentTarget.value)}
            minRows={2}
            maxRows={4}
            autosize
          />

          <Group justify="space-between" align="end">
            <TextInput
              label="Количество идей (3-10)"
              value={count}
              onChange={(event) => setCount(event.currentTarget.value)}
              w={220}
            />
            <Button loading={generateIdeasMutation.isPending} onClick={startIdeaGeneration} disabled={submitDisabled}>
              Сгенерировать идеи
            </Button>
          </Group>

          {generateIdeasMutation.isError ? (
            <Alert color="red" variant="light" title="Ошибка генерации">
              {getErrorMessage(generateIdeasMutation.error, 'Не удалось поставить задачу в очередь')}
            </Alert>
          ) : null}
        </Stack>
      </Paper>

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <Paper className="panel-surface" radius={24} p="lg">
          <Stack gap="sm">
            <Title order={4}>Список идей</Title>
            {!ideasQuery.data?.length ? (
              <Text c="dimmed">Пока нет идей для выбранного проекта</Text>
            ) : (
              ideasQuery.data.map((idea) => (
                <Card
                  key={idea.id}
                  withBorder
                  radius="md"
                  p="md"
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedIdeaId === idea.id ? 'var(--mantine-color-cyan-6)' : undefined,
                  }}
                  onClick={() => setSelectedIdeaId(idea.id)}
                >
                  <Stack gap={8}>
                    <Group justify="space-between">
                      <Text fw={600}>{idea.topic}</Text>
                      <Badge color={statusColor[idea.status] ?? 'gray'}>{formatStatusLabel(idea.status)}</Badge>
                    </Group>
                    <Text size="sm" c="dimmed">
                      {idea.hook}
                    </Text>
                    <Group gap="xs">
                      <Badge variant="light">{idea.format}</Badge>
                      <Badge color={statusColor[idea.latestScript?.status ?? 'queued'] ?? 'gray'} variant="light">
                        Сценарий: {formatStatusLabel(idea.latestScript?.status ?? 'queued')}
                      </Badge>
                      <Badge color={statusColor[idea.latestCaption?.status ?? 'queued'] ?? 'gray'} variant="light">
                        Подпись: {formatStatusLabel(idea.latestCaption?.status ?? 'queued')}
                      </Badge>
                    </Group>
                    <Group>
                      <Button
                        size="xs"
                        variant="light"
                        loading={generateScriptMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation()
                          triggerScript(idea, false)
                        }}
                      >
                        Сгенерировать сценарий
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        onClick={(event) => {
                          event.stopPropagation()
                          triggerScript(idea, true)
                        }}
                      >
                        Перегенерировать сценарий
                      </Button>
                      <Button
                        size="xs"
                        variant="light"
                        loading={generateCaptionMutation.isPending}
                        onClick={(event) => {
                          event.stopPropagation()
                          triggerCaption(idea, false)
                        }}
                      >
                        Сгенерировать подпись
                      </Button>
                      <Button
                        size="xs"
                        variant="default"
                        onClick={(event) => {
                          event.stopPropagation()
                          triggerCaption(idea, true)
                        }}
                      >
                        Перегенерировать подпись
                      </Button>
                    </Group>
                    {idea.latestScript?.status === 'failed' && idea.latestScript.error ? (
                      <Alert color="red" variant="light" title="Ошибка сценария">
                        {idea.latestScript.error}
                      </Alert>
                    ) : null}
                    {idea.latestCaption?.status === 'failed' && idea.latestCaption.error ? (
                      <Alert color="red" variant="light" title="Ошибка подписи">
                        {idea.latestCaption.error}
                      </Alert>
                    ) : null}
                  </Stack>
                </Card>
              ))
            )}

            {generateScriptMutation.isError ? (
              <Alert color="red" variant="light" title="Ошибка сценария">
                {getErrorMessage(generateScriptMutation.error, 'Не удалось поставить сценарий в очередь')}
              </Alert>
            ) : null}

            {generateCaptionMutation.isError ? (
              <Alert color="red" variant="light" title="Ошибка подписи">
                {getErrorMessage(generateCaptionMutation.error, 'Не удалось поставить подпись в очередь')}
              </Alert>
            ) : null}
          </Stack>
        </Paper>

        <Paper className="panel-surface" radius={24} p="lg">
          <Stack gap="sm">
            <Title order={4}>Результаты по идее</Title>
            {!selectedIdea ? (
              <Text c="dimmed">Выберите идею слева</Text>
            ) : (
              <>
                <Text fw={600}>{selectedIdea.topic}</Text>
                <Text size="sm" c="dimmed">
                  {selectedIdea.hook}
                </Text>

                <Title order={5}>Сценарии</Title>
                {!detailsQuery.data?.scripts.length ? (
                  <Text c="dimmed">Сценарии пока не сгенерированы</Text>
                ) : (
                  detailsQuery.data.scripts.map((script) => (
                    <Card key={script.id} withBorder radius="md">
                      <Stack gap={6}>
                        <Group justify="space-between">
                          <Text size="sm" fw={600}>
                            {new Date(script.createdAt).toLocaleString('ru-RU')}
                          </Text>
                          <Badge color={statusColor[script.status] ?? 'gray'}>
                            {formatStatusLabel(script.status)}
                          </Badge>
                        </Group>
                        {script.text ? <Text size="sm">{script.text}</Text> : null}
                        {script.shotList?.length ? (
                          <Stack gap={2}>
                            {script.shotList.map((shot, index) => (
                              <Text key={`${script.id}-${index}`} size="xs" c="dimmed">
                                {index + 1}. {shot}
                              </Text>
                            ))}
                          </Stack>
                        ) : null}
                        {script.error ? (
                          <Alert color="red" variant="light" title="Ошибка">
                            {script.error}
                          </Alert>
                        ) : null}
                      </Stack>
                    </Card>
                  ))
                )}

                <Title order={5}>Подписи</Title>
                {!detailsQuery.data?.captions.length ? (
                  <Text c="dimmed">Подписи пока не сгенерированы</Text>
                ) : (
                  detailsQuery.data.captions.map((caption) => (
                    <Card key={caption.id} withBorder radius="md">
                      <Stack gap={6}>
                        <Group justify="space-between">
                          <Text size="sm" fw={600}>
                            {new Date(caption.createdAt).toLocaleString('ru-RU')}
                          </Text>
                          <Badge color={statusColor[caption.status] ?? 'gray'}>
                            {formatStatusLabel(caption.status)}
                          </Badge>
                        </Group>
                        {caption.text ? <Text size="sm">{caption.text}</Text> : null}
                        {caption.hashtags?.length ? (
                          <Text size="xs" c="dimmed">
                            {caption.hashtags.join(' ')}
                          </Text>
                        ) : null}
                        {caption.error ? (
                          <Alert color="red" variant="light" title="Ошибка">
                            {caption.error}
                          </Alert>
                        ) : null}
                      </Stack>
                    </Card>
                  ))
                )}
              </>
            )}
          </Stack>
        </Paper>
      </SimpleGrid>

      <Paper className="panel-surface" radius={24} p="lg">
        <Stack gap="sm">
          <Group justify="space-between" align="center" wrap="wrap">
            <Title order={4}>Логи прогонов AI</Title>
            <Group gap="xs">
              <Badge variant="light">Всего: {logsStats.total}</Badge>
              <Badge color="green" variant="light">
                Успех: {logsStats.successCount}
              </Badge>
              <Badge color="red" variant="light">
                Ошибка: {logsStats.failedCount}
              </Badge>
              <Badge color="cyan" variant="light">
                Средняя задержка: {formatLatency(logsStats.avgLatencyMs)}
              </Badge>
              <Badge color="grape" variant="light">
                Токены: {logsStats.totalTokens.toLocaleString('ru-RU')}
              </Badge>
            </Group>
          </Group>
          {!logsQuery.data?.length ? (
            <Text c="dimmed">Логи пока пустые</Text>
          ) : (
            <div className="table-x-scroll">
              <AppTable className="ai-logs-table">
                <AppTable.Thead>
                  <AppTable.Tr>
                    <AppTable.Th>Время</AppTable.Th>
                    <AppTable.Th>Операция</AppTable.Th>
                    <AppTable.Th>Статус</AppTable.Th>
                    <AppTable.Th>Модель</AppTable.Th>
                    <AppTable.Th>Токены</AppTable.Th>
                    <AppTable.Th>Задержка</AppTable.Th>
                    <AppTable.Th>Request ID</AppTable.Th>
                    <AppTable.Th>Ошибка</AppTable.Th>
                  </AppTable.Tr>
                </AppTable.Thead>
                <AppTable.Tbody>
                  {logsQuery.data.map((log) => (
                    <AppTable.Tr key={log.id}>
                      <AppTable.Td>{formatLogDate(log.createdAt)}</AppTable.Td>
                      <AppTable.Td>{formatOperationLabel(log.operation)}</AppTable.Td>
                      <AppTable.Td>
                        <Badge color={statusColor[log.status] ?? 'gray'}>{formatStatusLabel(log.status)}</Badge>
                      </AppTable.Td>
                      <AppTable.Td>
                        <Stack gap={2}>
                          <Text size="sm">{log.model}</Text>
                          <Text size="xs" c="dimmed">
                            {log.provider}
                          </Text>
                        </Stack>
                      </AppTable.Td>
                      <AppTable.Td>{formatTokens(log.tokens)}</AppTable.Td>
                      <AppTable.Td>{formatLatency(log.latencyMs)}</AppTable.Td>
                      <AppTable.Td>
                        {log.requestId ? (
                          <Tooltip label={log.requestId} withArrow>
                            <Text size="sm" c="dimmed">
                              {log.requestId.slice(0, 12)}...
                            </Text>
                          </Tooltip>
                        ) : (
                          '—'
                        )}
                      </AppTable.Td>
                    <AppTable.Td>
                      {log.error ? (
                        <Text size="sm" lineClamp={2}>
                          {log.error}
                        </Text>
                      ) : (
                        '—'
                      )}
                    </AppTable.Td>
                    </AppTable.Tr>
                  ))}
                </AppTable.Tbody>
              </AppTable>
            </div>
          )}
        </Stack>
      </Paper>
    </Stack>
  )
}
