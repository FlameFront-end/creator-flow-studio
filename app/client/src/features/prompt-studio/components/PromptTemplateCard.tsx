import { ActionIcon, Card, Group, Paper, Stack, Text } from '@ui/core'
import { IconCopy, IconPencil, IconTrash } from '@tabler/icons-react'
import type { PromptTemplate } from '../../../shared/api/services/promptTemplates.api'
import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { TEMPLATE_KEY_LABEL } from '../model/promptStudio.constants'
import { extractTemplateVariables } from '../model/promptTemplates.utils'

type PromptTemplateCardProps = {
  item: PromptTemplate
  isEditing: boolean
  isExpanded: boolean
  isDeletePending: boolean
  isDeleteDisabled?: boolean
  onEdit: (item: PromptTemplate) => void
  onCopy: (template: string) => void
  onDelete: (item: PromptTemplate) => void
  onToggleExpanded: (templateId: string) => void
}

export function PromptTemplateCard({
  item,
  isEditing,
  isExpanded,
  isDeletePending,
  isDeleteDisabled = false,
  onEdit,
  onCopy,
  onDelete,
  onToggleExpanded,
}: PromptTemplateCardProps) {
  const templateVariables = extractTemplateVariables(item.template)
  const canExpand = item.template.length > 260

  return (
    <Card
      withBorder
      radius="md"
      p="sm"
      className={isEditing ? 'prompt-template-card prompt-template-card-active' : 'prompt-template-card'}
    >
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start" className="prompt-template-head">
          <Stack gap={4} align="flex-start" className="prompt-template-meta">
            <AppBadge
              color="cyan"
              variant={isEditing ? 'filled' : 'light'}
              className="prompt-template-key-badge"
            >
              {TEMPLATE_KEY_LABEL[item.key]}
            </AppBadge>
            <Text size="xs" c="dimmed">
              Переменных: {templateVariables.length} • Символов: {item.template.length}
            </Text>
          </Stack>

          <Group gap="xs">
            <ActionIcon variant="light" color={isEditing ? 'gray' : 'cyan'} onClick={() => onEdit(item)}>
              <IconPencil size={16} />
            </ActionIcon>
            <ActionIcon variant="light" color="gray" onClick={() => void onCopy(item.template)}>
              <IconCopy size={16} />
            </ActionIcon>
            <ActionIcon
              variant="light"
              color="red"
              loading={isDeletePending}
              disabled={isDeleteDisabled}
              onClick={() => onDelete(item)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        </Group>

        {templateVariables.length ? (
          <Group gap={6}>
            {templateVariables.map((variable) => (
              <AppBadge key={`${item.id}-${variable}`} size="sm" variant="dot" color="blue">
                {`{{${variable}}}`}
              </AppBadge>
            ))}
          </Group>
        ) : null}

        <Paper
          radius="sm"
          p="sm"
          className={isExpanded ? 'prompt-template-text prompt-template-text-open' : 'prompt-template-text'}
        >
          <Text component="pre" className="prompt-template-text-content">
            {item.template}
          </Text>
        </Paper>

        {canExpand ? (
          <Group justify="flex-end">
            <AppButton size="xs" variant="subtle" onClick={() => onToggleExpanded(item.id)}>
              {isExpanded ? 'Свернуть' : 'Показать полностью'}
            </AppButton>
          </Group>
        ) : null}
      </Stack>
    </Card>
  )
}
