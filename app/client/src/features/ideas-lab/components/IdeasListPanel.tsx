import { Alert, Badge, Button, Card, Group, Paper, Stack, Text, Title } from '@mantine/core'
import { getErrorMessage } from '../../../shared/lib/httpError'
import type { IdeasLabController } from '../hooks/useIdeasLabController'
import { formatStatusLabel, statusColor } from '../lib/ideasLab.formatters'

export const IdeasListPanel = ({ controller }: { controller: IdeasLabController }) => {
  const ideas = controller.ideasQuery.data ?? []
  const hasIdeas = ideas.length > 0
  const showClearIdeasButton = Boolean(controller.projectId) && hasIdeas

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={4}>Список идей</Title>
          {showClearIdeasButton ? (
            <Button
              size="xs"
              variant="default"
              color="red"
              disabled={controller.clearIdeasMutation.isPending}
              onClick={() => controller.setClearIdeasModalOpen(true)}
            >
              Очистить идеи
            </Button>
          ) : null}
        </Group>

        {!hasIdeas ? (
          <Text c="dimmed">Пока нет идей для выбранного проекта</Text>
        ) : (
          ideas.map((idea) => (
            <Card
              key={idea.id}
              withBorder
              radius="md"
              p="md"
              style={{
                cursor: 'pointer',
                borderColor: controller.selectedIdeaId === idea.id ? 'var(--mantine-color-cyan-6)' : undefined,
              }}
              onClick={() => controller.setSelectedIdeaId(idea.id)}
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
                  <Badge color={statusColor[idea.latestImage?.status ?? 'queued'] ?? 'gray'} variant="light">
                    Image: {formatStatusLabel(idea.latestImage?.status ?? 'queued')}
                  </Badge>
                </Group>
                <Group>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.generateScriptMutation.mutate({ ideaId: idea.id, regenerate: false })
                    }}
                  >
                    Сценарий
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.generateScriptMutation.mutate({ ideaId: idea.id, regenerate: true })
                    }}
                  >
                    Сценарий regen
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.generateCaptionMutation.mutate({ ideaId: idea.id, regenerate: false })
                    }}
                  >
                    Подпись
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.generateCaptionMutation.mutate({ ideaId: idea.id, regenerate: true })
                    }}
                  >
                    Подпись regen
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.generateImagePromptMutation.mutate(idea.id)
                    }}
                  >
                    Image prompt
                  </Button>
                  <Button
                    size="xs"
                    variant="light"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.generateImageMutation.mutate({ ideaId: idea.id, regenerate: false })
                    }}
                  >
                    Image
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.generateImageMutation.mutate({ ideaId: idea.id, regenerate: true })
                    }}
                  >
                    Image regen
                  </Button>
                  <Button
                    size="xs"
                    variant="default"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.generateVideoMutation.mutate({ ideaId: idea.id, regenerate: true })
                    }}
                  >
                    Video regen
                  </Button>
                  <Button
                    size="xs"
                    color="red"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation()
                      controller.setDeleteIdeaId(idea.id)
                    }}
                  >
                    Удалить
                  </Button>
                </Group>
              </Stack>
            </Card>
          ))
        )}

        {controller.generateImagePromptMutation.isError ? (
          <Alert color="red">
            {getErrorMessage(controller.generateImagePromptMutation.error, 'Не удалось сгенерировать image prompt')}
          </Alert>
        ) : null}
        {controller.generateImageMutation.isError ? (
          <Alert color="red">
            {getErrorMessage(controller.generateImageMutation.error, 'Не удалось поставить генерацию картинки в очередь')}
          </Alert>
        ) : null}
        {controller.generateVideoMutation.isError ? (
          <Alert color="red">
            {getErrorMessage(controller.generateVideoMutation.error, 'Не удалось поставить генерацию видео в очередь')}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  )
}
