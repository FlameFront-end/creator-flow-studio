import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Code,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  Textarea,
  Title,
} from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { promptTemplatesApi } from '../../../shared/api/services/promptTemplates.api'
import type { PromptTemplateKey } from '../../../shared/api/services/promptTemplates.api'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../../shared/lib/toast'
import { TEMPLATE_KEYS, TEMPLATE_KEY_LABEL } from '../promptStudio.constants'
import { PROMPT_TEMPLATES_QUERY_KEY } from '../promptStudio.queryKeys'

export function PromptTemplatesSection() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [key, setKey] = useState<PromptTemplateKey>('ideas')
  const [template, setTemplate] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null)

  const templatesQuery = useQuery({
    queryKey: PROMPT_TEMPLATES_QUERY_KEY,
    queryFn: promptTemplatesApi.getPromptTemplates,
  })

  const createMutation = useMutation({
    mutationFn: promptTemplatesApi.createPromptTemplate,
    onSuccess: () => {
      resetForm()
      void queryClient.invalidateQueries({ queryKey: PROMPT_TEMPLATES_QUERY_KEY })
      showSuccessToast('Шаблон создан')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось сохранить шаблон')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof promptTemplatesApi.updatePromptTemplate>[1] }) =>
      promptTemplatesApi.updatePromptTemplate(id, payload),
    onSuccess: () => {
      resetForm()
      void queryClient.invalidateQueries({ queryKey: PROMPT_TEMPLATES_QUERY_KEY })
      showSuccessToast('Шаблон обновлён')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось обновить шаблон')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: promptTemplatesApi.deletePromptTemplate,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROMPT_TEMPLATES_QUERY_KEY })
      if (editingId) {
        resetForm()
      }
      showSuccessToast('Шаблон удалён')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось удалить шаблон')
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (template.trim().length < 10) {
      showValidationToast('Шаблон должен быть не короче 10 символов')
      return
    }

    const payload = { key, template: template.trim() }
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload })
      return
    }
    createMutation.mutate(payload)
  }

  const startEdit = (item: Awaited<ReturnType<typeof promptTemplatesApi.getPromptTemplates>>[number]) => {
    if (editingId === item.id) {
      resetForm()
      return
    }

    setEditingId(item.id)
    setKey(item.key)
    setTemplate(item.template)
  }

  const resetForm = () => {
    setEditingId(null)
    setKey('ideas')
    setTemplate('')
  }

  const confirmDelete = () => {
    if (!deleteTarget) {
      return
    }
    const targetId = deleteTarget.id
    setDeleteTarget(null)
    deleteMutation.mutate(targetId)
  }

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error

  return (
    <Stack gap="md">
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Select
            label="Ключ шаблона"
            value={key}
            onChange={(value) => setKey((value as PromptTemplateKey) ?? 'ideas')}
            data={TEMPLATE_KEYS.map((item) => ({ value: item, label: TEMPLATE_KEY_LABEL[item] }))}
            allowDeselect={false}
          />

          <Textarea
            label="Текст шаблона"
            description="Можно использовать переменные вида {{topic}}"
            value={template}
            onChange={(event) => setTemplate(event.currentTarget.value)}
            minRows={8}
            minLength={10}
            maxLength={8000}
            required
            maxRows={14}
            autosize
            styles={{ input: { resize: 'vertical' } }}
          />

          <Group justify="space-between">
            <Title order={5}>{editingId ? 'Редактирование шаблона' : 'Создание шаблона'}</Title>
            <Group>
              {editingId ? (
                <Button variant="default" onClick={resetForm}>
                  Отмена
                </Button>
              ) : null}
              <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                {editingId ? 'Сохранить' : 'Создать'}
              </Button>
            </Group>
          </Group>
        </Stack>
      </form>

      {mutationError ? (
        <Alert color="red" title="Ошибка" variant="light">
          {getErrorMessage(mutationError, 'Не удалось сохранить шаблон')}
        </Alert>
      ) : null}

      {templatesQuery.isError ? (
        <Alert color="red" title="Ошибка" variant="light">
          {getErrorMessage(templatesQuery.error, 'Не удалось загрузить шаблоны')}
        </Alert>
      ) : null}

      {!templatesQuery.data?.length ? (
        <Text c="dimmed">Пока нет шаблонов</Text>
      ) : (
        <Stack gap="sm">
          {templatesQuery.data.map((item) => (
            <Paper key={item.id} className="inner-surface" radius="md" p="sm">
              <Stack gap={6}>
                <Group justify="space-between">
                  <Badge color="cyan" variant="light">
                    {TEMPLATE_KEY_LABEL[item.key]}
                  </Badge>
                  <Group gap="xs">
                    <ActionIcon variant="light" color="cyan" onClick={() => startEdit(item)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      loading={deleteMutation.isPending}
                      onClick={() => setDeleteTarget({ id: item.id, label: TEMPLATE_KEY_LABEL[item.key] })}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Group>
                <Code block>{item.template}</Code>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <ConfirmActionModal
        opened={Boolean(deleteTarget)}
        title="Подтвердите удаление шаблона"
        message={deleteTarget ? `Удалить шаблон "${deleteTarget.label}"?` : ''}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}
