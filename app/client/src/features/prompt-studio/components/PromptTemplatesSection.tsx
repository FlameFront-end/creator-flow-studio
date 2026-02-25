import { Divider, Group, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconSearch } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { promptTemplatesApi } from '../../../shared/api/services/promptTemplates.api'
import type { PromptTemplate, PromptTemplateKey } from '../../../shared/api/services/promptTemplates.api'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../../shared/lib/toast'
import { TEMPLATE_KEYS, TEMPLATE_KEY_LABEL } from '../model/promptStudio.constants'
import { PROMPT_TEMPLATES_QUERY_KEY } from '../model/promptStudio.queryKeys'
import { PromptTemplateCard } from './PromptTemplateCard'
import {
  filterTemplates,
  getTemplateTypeOptions,
  type TemplateFilterKey,
} from '../model/promptTemplates.utils'

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

  const refreshTemplates = async () => {
    await queryClient.invalidateQueries({ queryKey: PROMPT_TEMPLATES_QUERY_KEY })
    await queryClient.refetchQueries({ queryKey: PROMPT_TEMPLATES_QUERY_KEY, type: 'active' })
  }

  const createMutation = useMutation({
    mutationFn: promptTemplatesApi.createPromptTemplate,
    onSuccess: async () => {
      resetForm()
      await refreshTemplates()
      showSuccessToast('Шаблон создан')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось сохранить шаблон')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof promptTemplatesApi.updatePromptTemplate>[1] }) =>
      promptTemplatesApi.updatePromptTemplate(id, payload),
    onSuccess: async () => {
      resetForm()
      await refreshTemplates()
      showSuccessToast('Шаблон обновлён')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось обновить шаблон')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: promptTemplatesApi.deletePromptTemplate,
    onSuccess: async (_, templateId) => {
      if (editingId) {
        resetForm()
      }
      await refreshTemplates()
      if (deleteTarget?.id === templateId) {
        setDeleteTarget(null)
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

  const startEdit = (item: PromptTemplate) => {
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
    deleteMutation.mutate(deleteTarget.id)
  }

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error
  const templates = templatesQuery.data ?? []

  const visibleTemplates = useMemo(
    () => filterTemplates(templates, search, filterKey),
    [filterKey, search, templates],
  )

  const templateTypeOptions = useMemo(() => getTemplateTypeOptions(), [])

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
                const isEditing = editingId === item.id
                const isExpanded = expandedTemplateIds.includes(item.id)

                return (
                  <PromptTemplateCard
                    key={item.id}
                    item={item}
                    isEditing={isEditing}
                    isExpanded={isExpanded}
                    isDeletePending={deleteMutation.isPending && deleteMutation.variables === item.id}
                    isDeleteDisabled={deleteMutation.isPending && deleteMutation.variables !== item.id}
                    onEdit={startEdit}
                    onCopy={copyTemplateText}
                    onDelete={(template) =>
                      setDeleteTarget({ id: template.id, label: TEMPLATE_KEY_LABEL[template.key] })
                    }
                    onToggleExpanded={toggleTemplateExpanded}
                  />
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




