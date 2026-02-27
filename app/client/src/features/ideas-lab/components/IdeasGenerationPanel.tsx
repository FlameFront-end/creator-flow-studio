import { Group, Paper, Select, SimpleGrid, Stack, Textarea, TextInput, Title } from '@ui/core'
import { useEffect, useState } from 'react'
import { AppButton } from '../../../shared/components/AppButton'
import type { IdeasLabController } from '../hooks/useIdeasLabController'

type IdeasGenerationPanelProps = {
  controller: IdeasLabController
  onGenerationAccepted?: () => void
}

export const IdeasGenerationPanel = ({
  controller,
  onGenerationAccepted,
}: IdeasGenerationPanelProps) => {
  const [awaitingAcceptance, setAwaitingAcceptance] = useState(false)
  const fieldErrors = controller.generationFieldErrors

  useEffect(() => {
    if (!awaitingAcceptance) {
      return
    }

    if (controller.generateIdeasMutation.isSuccess) {
      setAwaitingAcceptance(false)
      onGenerationAccepted?.()
      return
    }

    if (controller.generateIdeasMutation.isError) {
      setAwaitingAcceptance(false)
    }
  }, [
    awaitingAcceptance,
    controller.generateIdeasMutation.isError,
    controller.generateIdeasMutation.isSuccess,
    onGenerationAccepted,
  ])

  const handleStartGeneration = () => {
    controller.generateIdeasMutation.reset()
    const started = controller.startIdeaGeneration()
    if (started) {
      setAwaitingAcceptance(true)
    }
  }

  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>Идеи и сценарии</Title>
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <Select
            label="Проект"
            value={controller.projectId}
            onChange={(value) => {
              controller.setProjectId(value)
              controller.setPersonaId(null)
              if (value) {
                controller.clearGenerationFieldError('projectId')
              }
              controller.clearGenerationFieldError('personaId')
            }}
            data={(controller.projectsQuery.data ?? []).map((project) => ({
              value: project.id,
              label: project.name,
            }))}
            searchable
            placeholder="Выберите проект"
            error={fieldErrors.projectId}
          />
          <Select
            label="Персонаж"
            value={controller.personaId}
            onChange={(value) => {
              controller.setPersonaId(value)
              if (value) {
                controller.clearGenerationFieldError('personaId')
              }
            }}
            data={(controller.personasQuery.data ?? []).map((persona) => ({
              value: persona.id,
              label: persona.name,
            }))}
            searchable
            placeholder={controller.projectId ? 'Выберите персонажа' : 'Сначала выберите проект'}
            disabled={!controller.projectId}
            nothingFoundMessage={controller.projectId ? 'Для проекта нет персонажей' : 'Сначала выберите проект'}
            error={fieldErrors.personaId}
          />
          <Select
            label="Формат"
            value={controller.format}
            onChange={(value) => controller.setFormat((value as typeof controller.format) ?? 'reel')}
            data={[
              { value: 'reel', label: 'Рилс' },
              { value: 'short', label: 'Шортс' },
              { value: 'tiktok', label: 'ТикТок' },
            ]}
            allowDeselect={false}
          />
        </SimpleGrid>

        <Stack gap={0}>
          <Textarea
            label="Тема"
            value={controller.topic}
            onChange={(event) => {
              const nextValue = event.currentTarget.value
              controller.setTopic(nextValue)
              if (nextValue.trim().length >= 3) {
                controller.clearGenerationFieldError('topic')
              }
            }}
            minRows={2}
            autosize
            error={fieldErrors.topic}
          />

          <Group justify="space-between" align="end">
            <TextInput
              label="Количество идей"
              value={controller.count}
              onChange={(event) => {
                const nextValue = event.currentTarget.value
                controller.setCount(nextValue)
                const parsedCount = Number(nextValue)
                if (Number.isFinite(parsedCount) && parsedCount >= 1) {
                  controller.clearGenerationFieldError('count')
                }
              }}
              w={260}
              error={fieldErrors.count}
            />
            <AppButton
              buttonVariant="dark"
              loading={controller.generateIdeasMutation.isPending}
              onClick={handleStartGeneration}
              disabled={controller.generateIdeasMutation.isPending}
            >
              Сгенерировать идеи
            </AppButton>
          </Group>
        </Stack>
      </Stack>
    </Paper>
  )
}


