import { Card, Group, Progress, Stack, Text } from '@ui/core'
import { AppBadge } from '../../../../shared/components/AppBadge'
import { AppButton } from '../../../../shared/components/AppButton'
import type { IdeasLabController, IdeasLabIdea } from '../../hooks/useIdeasLabController'
import { formatIdeaFormatLabel } from '../../lib/ideasLab.formatters'
import { IDEA_PIPELINE_STEP_COUNT } from './ideasListPanel.constants'
import { IdeaPipelineStepRow } from './IdeaPipelineStepRow'
import { buildIdeasListItemModel } from './ideasListItem.model'

type IdeasListItemCardProps = {
  idea: IdeasLabIdea
  controller: IdeasLabController
}

export const IdeasListItemCard = ({ idea, controller }: IdeasListItemCardProps) => {
  const { steps, stepActions, completedStepCount, pipelineProgress, selected, isIdeaFailed } =
    buildIdeasListItemModel(idea, controller)

  return (
    <Card
      id={`ideas-lab-idea-card-${idea.id}`}
      withBorder
      radius="md"
      p="md"
      style={{
        cursor: 'pointer',
        borderColor: selected ? 'var(--appui-color-brand-6)' : undefined,
        boxShadow: selected ? '0 0 0 1px rgba(26, 144, 255, 0.35)' : undefined,
      }}
      onClick={() => controller.setSelectedIdeaId(idea.id)}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" wrap="nowrap">
          <Stack gap={3} maw="100%">
            <Text fw={700} lineClamp={2}>
              {idea.topic}
            </Text>
            <Text size="sm" c="dimmed" lineClamp={2}>
              {idea.hook}
            </Text>
          </Stack>
          <AppButton
            size="xs"
            color="red"
            variant="subtle"
            onClick={(event) => {
              event.stopPropagation()
              controller.setDeleteIdeaId(idea.id)
            }}
          >
            Удалить
          </AppButton>
        </Group>

        <Group gap="xs" wrap="wrap">
          <AppBadge variant="light">{formatIdeaFormatLabel(idea.format)}</AppBadge>
          <AppBadge variant="light">
            Выполнено: {completedStepCount}/{IDEA_PIPELINE_STEP_COUNT}
          </AppBadge>
        </Group>

        <Stack gap={6}>
          <Group justify="space-between" wrap="nowrap">
            <Text size="xs" c="dimmed">
              Прогресс выполнения
            </Text>
            <Text size="xs" fw={700} c="dimmed">
              {pipelineProgress}%
            </Text>
          </Group>
          <Progress value={pipelineProgress} radius="xl" size="sm" color="green" />
        </Stack>

        <Stack gap={6}>
          {steps.map((step) => (
            <IdeaPipelineStepRow key={step.key} step={step} action={stepActions[step.key]} />
          ))}
        </Stack>

        {isIdeaFailed ? (
          <AppBadge color="red" variant="light">
            Требует внимания
          </AppBadge>
        ) : null}
      </Stack>
    </Card>
  )
}
