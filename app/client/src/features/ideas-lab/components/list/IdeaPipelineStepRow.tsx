import { Group, Stack, Text, ThemeIcon } from '@ui/core'
import { IconCheck, IconCircleDashed } from '@tabler/icons-react'
import { AppButton } from '../../../../shared/components/AppButton'
import type { IdeaStepState, StepAction } from './ideasListItem.types'

type IdeaPipelineStepRowProps = {
  step: IdeaStepState
  action: StepAction
}

export const IdeaPipelineStepRow = ({ step, action }: IdeaPipelineStepRowProps) => (
  <Stack gap={2}>
    <Group justify="space-between" align="center" wrap="nowrap">
      <Group gap={8} wrap="nowrap">
        <ThemeIcon
          size={18}
          radius="xl"
          color={step.done ? 'green' : 'gray'}
          variant={step.done ? 'light' : 'transparent'}
        >
          {step.done ? <IconCheck size={12} /> : <IconCircleDashed size={12} />}
        </ThemeIcon>
        <Text size="sm">{step.label}</Text>
      </Group>
      <Group gap="xs" wrap="nowrap" align="center">
        <Text size="0.70rem" c={step.statusColor}>
          {step.status}
        </Text>
        <AppButton
          size="xs"
          variant={step.done ? 'default' : 'light'}
          loading={action.loading}
          disabled={action.disabled}
          className="ideas-lab-step-action-btn"
          style={{ minWidth: 118 }}
          onClick={(event) => {
            event.stopPropagation()
            action.onClick()
          }}
        >
          {action.loading ? null : action.label}
        </AppButton>
      </Group>
    </Group>
  </Stack>
)
