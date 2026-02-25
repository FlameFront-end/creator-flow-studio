import { ActionIcon, Card, Divider, Group, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconCopy, IconPencil, IconSearch, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { promptTemplatesApi } from '../../../shared/api/services/promptTemplates.api'
import type { PromptTemplateKey } from '../../../shared/api/services/promptTemplates.api'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../../shared/lib/toast'
import { TEMPLATE_KEYS, TEMPLATE_KEY_LABEL } from '../promptStudio.constants'
import { PROMPT_TEMPLATES_QUERY_KEY } from '../promptStudio.queryKeys'

type TemplateFilterKey = PromptTemplateKey | 'all'

const extractTemplateVariables = (value: string): string[] =>
  Array.from(
    new Set(
      Array.from(value.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)).map(([, variable]) => variable),
    ),
  )

export function PromptTemplatesSection() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [key, setKey] = useState<PromptTemplateKey>('ideas')
  const [template, setTemplate] = useState('')
  const [search, setSearch] = useState('')
  const [filterKey, setFilterKey] = useState<TemplateFilterKey>('all')
  const [expandedTemplateIds, setExpandedTemplateIds] = useState<string[]>([])
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
  const templates = templatesQuery.data ?? []

  const visibleTemplates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return templates.filter((item) => {
      if (filterKey !== 'all' && item.key !== filterKey) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return (
        TEMPLATE_KEY_LABEL[item.key].toLowerCase().includes(normalizedSearch) ||
        item.template.toLowerCase().includes(normalizedSearch)
      )
    })
  }, [filterKey, search, templates])

  const templateTypeOptions = useMemo(
    () => [
      { value: 'all', label: 'Все типы' },
      ...TEMPLATE_KEYS.map((item) => ({ value: item, label: TEMPLATE_KEY_LABEL[item] })),
    ],
    [],
  )

  const copyTemplateText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      showSuccessToast('Текст шаблона скопирован')
    } catch {
      showValidationToast('Не удалось скопировать текст шаблона')
    }
  }

  const toggleTemplateExpanded = (templateId: string) => {
    setExpandedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    )
  }

  return (
    <Stack gap="md">
      <SimpleGrid cols={{ base: 1, xl: 2 }} spacing="md" className="prompt-templates-layout">
        <Paper className="inner-surface prompt-templates-editor" radius="md" p="md">
          <Stack gap="sm">
            <Group justify="space-between" align="center">
              <Title order={4}>{editingId ? 'Редактирование шаблона' : 'Новый шаблон'}</Title>
              <AppBadge color={editingId ? 'cyan' : 'gray'} variant="light">
                {editingId ? 'Режим редактирования' : 'Режим создания'}
              </AppBadge>
            </Group>

            <Text size="sm" c="dimmed">
              Шаблон используется как основа для генерации промптов. Переменные задаются в формате
              {' '}
              {'{{переменная}}'}.
            </Text>

            <Divider />

            <form onSubmit={onSubmit}>
              <Stack gap="sm">
                <Select
                  label="Тип шаблона"
                  value={key}
                  onChange={(value) => setKey((value as PromptTemplateKey) ?? 'ideas')}
                  data={TEMPLATE_KEYS.map((item) => ({ value: item, label: TEMPLATE_KEY_LABEL[item] }))}
                  allowDeselect={false}
                />

                <Textarea
                  label="Текст шаблона"
                  description="Можно использовать переменные вида {{topic}}, {{hook}}, {{format}}"
                  value={template}
                  onChange={(event) => setTemplate(event.currentTarget.value)}
                  minRows={12}
                  minLength={10}
                  maxLength={8000}
                  required
                  maxRows={22}
                  autosize
                  styles={{ input: { resize: 'vertical' } }}
                />

                <Group justify="space-between" align="center">
                  <Text size="xs" c="dimmed">
                    Символов: {template.trim().length}
                  </Text>
                  <Group>
                    {editingId ? (
                      <AppButton variant="default" onClick={resetForm}>
                        Отмена
                      </AppButton>
                    ) : null}
                    <AppButton type="submit" loading={createMutation.isPending || updateMutation.isPending}>
                      {editingId ? 'Сохранить' : 'Создать'}
                    </AppButton>
                  </Group>
                </Group>
              </Stack>
            </form>
          </Stack>
        </Paper>

        <Stack gap="sm">
          <Paper className="inner-surface" radius="md" p="md">
            <Stack gap="sm">
              <Group justify="space-between" align="center">
                <Title order={4}>Список шаблонов</Title>
                <AppBadge variant="light" color="cyan">
                  Показано: {visibleTemplates.length} из {templates.length}
                </AppBadge>
              </Group>

              <Group grow>
                <Select
                  label="Фильтр по типу"
                  value={filterKey}
                  onChange={(value) => setFilterKey((value as TemplateFilterKey) ?? 'all')}
                  data={templateTypeOptions}
                  allowDeselect={false}
                />
                <TextInput
                  label="Поиск"
                  value={search}
                  onChange={(event) => setSearch(event.currentTarget.value)}
                  placeholder="По названию или тексту шаблона"
                  leftSection={<IconSearch size={16} />}
                />
              </Group>
            </Stack>
          </Paper>

          {!templates.length ? (
            <Paper className="inner-surface" radius="md" p="md">
              <Text c="dimmed">Пока нет шаблонов</Text>
            </Paper>
          ) : !visibleTemplates.length ? (
            <Paper className="inner-surface" radius="md" p="md">
              <Text c="dimmed">По текущему фильтру ничего не найдено</Text>
            </Paper>
          ) : (
            <Stack gap="sm">
              {visibleTemplates.map((item) => {
                const templateVariables = extractTemplateVariables(item.template)
                const isEditing = editingId === item.id
                const isExpanded = expandedTemplateIds.includes(item.id)
                const canExpand = item.template.length > 260

                return (
                  <Card
                    key={item.id}
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
                          <ActionIcon
                            variant="light"
                            color={isEditing ? 'gray' : 'cyan'}
                            onClick={() => startEdit(item)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="light"
                            color="gray"
                            onClick={() => void copyTemplateText(item.template)}
                          >
                            <IconCopy size={16} />
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
                        className={
                          isExpanded
                            ? 'prompt-template-text prompt-template-text-open'
                            : 'prompt-template-text'
                        }
                      >
                        <Text component="pre" className="prompt-template-text-content">
                          {item.template}
                        </Text>
                      </Paper>

                      {canExpand ? (
                        <Group justify="flex-end">
                          <AppButton
                            size="xs"
                            variant="subtle"
                            onClick={() => toggleTemplateExpanded(item.id)}
                          >
                            {isExpanded ? 'Свернуть' : 'Показать полностью'}
                          </AppButton>
                        </Group>
                      ) : null}
                    </Stack>
                  </Card>
                )
              })}
            </Stack>
          )}
        </Stack>
      </SimpleGrid>

      {mutationError ? (
        <AppInlineErrorAlert>
          {getErrorMessage(mutationError, 'Не удалось сохранить шаблон')}
        </AppInlineErrorAlert>
      ) : null}

      {templatesQuery.isError ? (
        <AppInlineErrorAlert>
          {getErrorMessage(templatesQuery.error, 'Не удалось загрузить шаблоны')}
        </AppInlineErrorAlert>
      ) : null}

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




