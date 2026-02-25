import { ActionIcon, Alert, Code, Group, Paper, Select, SimpleGrid, Stack, Text, Textarea, TextInput, Title } from '@ui/core'
import { useMutation, useQuery } from '@tanstack/react-query'
import { IconPlus, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { personasApi } from '../../../shared/api/services/personas.api'
import { promptPreviewApi } from '../../../shared/api/services/promptPreview.api'
import { promptTemplatesApi } from '../../../shared/api/services/promptTemplates.api'
import type { PromptTemplateKey } from '../../../shared/api/services/promptTemplates.api'
import { AppButton } from '../../../shared/components/AppButton'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { AppTable } from '../../../shared/components/AppTable'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast } from '../../../shared/lib/toast'
import { TEMPLATE_KEYS, TEMPLATE_KEY_LABEL } from '../model/promptStudio.constants'
import type { PreviewVariableType } from '../model/promptStudio.constants'
import { PERSONAS_QUERY_KEY, PROMPT_TEMPLATES_QUERY_KEY } from '../model/promptStudio.queryKeys'

export function PromptPreviewSection() {
  const personasQuery = useQuery({
    queryKey: PERSONAS_QUERY_KEY,
    queryFn: personasApi.getPersonas,
  })
  const templatesQuery = useQuery({
    queryKey: PROMPT_TEMPLATES_QUERY_KEY,
    queryFn: promptTemplatesApi.getPromptTemplates,
  })

  const [personaId, setPersonaId] = useState<string | null>(null)
  const [templateKey, setTemplateKey] = useState<PromptTemplateKey>('ideas')
  const [variablesMap, setVariablesMap] = useState<Record<string, string | number | boolean>>({
    topic: 'вдохновляющий рилс для блогера',
  })
  const [variablesRaw, setVariablesRaw] = useState(
    JSON.stringify({ topic: 'вдохновляющий рилс для блогера' }, null, 2),
  )
  const [varKey, setVarKey] = useState('')
  const [varType, setVarType] = useState<PreviewVariableType>('string')
  const [varValue, setVarValue] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)

  const previewMutation = useMutation({
    mutationFn: promptPreviewApi.preview,
    onSuccess: () => {
      showSuccessToast('Промпт собран')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось сгенерировать предпросмотр')
    },
  })

  const hasTemplate = useMemo(
    () => (templatesQuery.data ?? []).some((item) => item.key === templateKey),
    [templatesQuery.data, templateKey],
  )

  const syncRawFromMap = (nextMap: Record<string, string | number | boolean>) => {
    setVariablesRaw(JSON.stringify(nextMap, null, 2))
  }

  const addVariable = () => {
    const key = varKey.trim()
    if (!key) {
      setJsonError('Укажите ключ переменной')
      return
    }

    let parsedValue: string | number | boolean = varValue
    if (varType === 'number') {
      const asNumber = Number(varValue)
      if (!Number.isFinite(asNumber)) {
        setJsonError('Для типа числа нужно ввести корректное число')
        return
      }
      parsedValue = asNumber
    }
    if (varType === 'boolean') {
      const normalized = varValue.trim().toLowerCase()
      if (!['true', 'false', '1', '0', 'да', 'нет'].includes(normalized)) {
        setJsonError('Для типа да/нет используйте true/false, 1/0, да/нет')
        return
      }
      parsedValue = ['true', '1', 'да'].includes(normalized)
    }

    const nextMap = { ...variablesMap, [key]: parsedValue }
    setVariablesMap(nextMap)
    syncRawFromMap(nextMap)
    setVarKey('')
    setVarValue('')
    setJsonError(null)
  }

  const removeVariable = (key: string) => {
    const nextMap = { ...variablesMap }
    delete nextMap[key]
    setVariablesMap(nextMap)
    syncRawFromMap(nextMap)
  }

  const importFromJson = () => {
    try {
      const parsed = JSON.parse(variablesRaw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setJsonError('Ожидается объект в JSON-формате')
        return
      }

      const normalized: Record<string, string | number | boolean> = {}
      for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
          setJsonError('Допустимые типы: строка, число, да/нет')
          return
        }
        normalized[key] = value
      }

      setVariablesMap(normalized)
      setJsonError(null)
    } catch {
      setJsonError('Ожидается валидный JSON')
    }
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!personaId) {
      setJsonError('Укажите персонажа')
      return
    }

    let variables: Record<string, string | number | boolean> = {}
    if (variablesRaw.trim().length > 0) {
      try {
        const parsed = JSON.parse(variablesRaw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          setJsonError('Ожидается объект в JSON-формате')
          return
        }

        for (const value of Object.values(parsed as Record<string, unknown>)) {
          if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
            setJsonError('Допустимые типы: строка, число, да/нет')
            return
          }
        }

        variables = parsed as Record<string, string | number | boolean>
      } catch {
        setJsonError('Ожидается валидный JSON')
        return
      }
    }

    setJsonError(null)
    previewMutation.mutate({
      personaId,
      templateKey,
      variables,
    })
  }

  return (
    <Stack gap="md">
      <form onSubmit={onSubmit}>
        <Stack gap="sm">
          <Select
            label="Персонаж"
            value={personaId}
            onChange={setPersonaId}
            data={(personasQuery.data ?? []).map((persona) => ({
              value: persona.id,
              label: persona.name,
            }))}
            placeholder="Выберите персонажа"
            searchable
          />

          <Select
            label="Тип шаблона"
            value={templateKey}
            onChange={(value) => setTemplateKey((value as PromptTemplateKey) ?? 'ideas')}
            data={TEMPLATE_KEYS.map((item) => ({ value: item, label: TEMPLATE_KEY_LABEL[item] }))}
            allowDeselect={false}
          />

          {!hasTemplate ? (
            <Alert color="yellow" title="Внимание" variant="light">
              Нет активного текста для выбранного шаблона. Сначала сохраните шаблон во вкладке "Шаблоны".
            </Alert>
          ) : null}

          <Paper className="inner-surface" radius="md" p="sm">
            <Stack gap="sm">
              <Title order={5}>Быстрое добавление переменных</Title>
              <SimpleGrid cols={{ base: 1, sm: 3 }} className="prompt-preview-quick-grid">
                <TextInput
                  label="Ключ"
                  placeholder="topic"
                  value={varKey}
                  onChange={(event) => setVarKey(event.currentTarget.value)}
                />
                <Select
                  label="Тип"
                  value={varType}
                  onChange={(value) => setVarType((value as PreviewVariableType) ?? 'string')}
                  data={[
                    { value: 'string', label: 'Строка' },
                    { value: 'number', label: 'Число' },
                    { value: 'boolean', label: 'Да/нет' },
                  ]}
                  allowDeselect={false}
                />
                <TextInput
                  label="Значение"
                  placeholder={varType === 'boolean' ? 'true / false' : 'значение'}
                  value={varValue}
                  onChange={(event) => setVarValue(event.currentTarget.value)}
                />
              </SimpleGrid>

              <Group justify="flex-end" className="prompt-preview-quick-actions">
                <AppButton leftSection={<IconPlus size={16} />} onClick={addVariable} variant="light">
                  Добавить
                </AppButton>
              </Group>

              {Object.keys(variablesMap).length ? (
                <AppTable>
                  <AppTable.Thead>
                    <AppTable.Tr>
                      <AppTable.Th>Ключ</AppTable.Th>
                      <AppTable.Th>Значение</AppTable.Th>
                      <AppTable.Th>Тип</AppTable.Th>
                      <AppTable.Th>Действия</AppTable.Th>
                    </AppTable.Tr>
                  </AppTable.Thead>
                  <AppTable.Tbody>
                    {Object.entries(variablesMap).map(([key, value]) => (
                      <AppTable.Tr key={key}>
                        <AppTable.Td>{key}</AppTable.Td>
                        <AppTable.Td>{String(value)}</AppTable.Td>
                        <AppTable.Td>{typeof value === 'boolean' ? 'Да/нет' : typeof value === 'number' ? 'Число' : 'Строка'}</AppTable.Td>
                        <AppTable.Td>
                          <ActionIcon color="red" variant="light" onClick={() => removeVariable(key)}>
                            <IconTrash size={14} />
                          </ActionIcon>
                        </AppTable.Td>
                      </AppTable.Tr>
                    ))}
                  </AppTable.Tbody>
                </AppTable>
              ) : (
                <Text c="dimmed">Переменные еще не добавлены</Text>
              )}
            </Stack>
          </Paper>

          <Textarea
            label="Переменные (JSON)"
            value={variablesRaw}
            onChange={(event) => setVariablesRaw(event.currentTarget.value)}
            minRows={8}
            maxRows={12}
            autosize
            styles={{ input: { resize: 'vertical' } }}
          />

          <Group justify="space-between">
            <AppButton variant="default" onClick={importFromJson}>
              Импортировать JSON в таблицу
            </AppButton>
            <AppButton type="submit" loading={previewMutation.isPending}>
              Сгенерировать
            </AppButton>
          </Group>

          {jsonError ? (
            <AppInlineErrorAlert title="Ошибка ввода">
              {jsonError}
            </AppInlineErrorAlert>
          ) : null}

          {previewMutation.isError ? (
            <AppInlineErrorAlert>
              {getErrorMessage(previewMutation.error, 'Не удалось сгенерировать предпросмотр')}
            </AppInlineErrorAlert>
          ) : null}
        </Stack>
      </form>

      <Paper className="inner-surface" radius="md" p="sm">
        <Title order={5} mb="sm">
          Результат
        </Title>
        {previewMutation.data?.prompt ? (
          <Code block>{previewMutation.data.prompt}</Code>
        ) : (
          <Text c="dimmed">Здесь появится сгенерированный prompt</Text>
        )}
      </Paper>
    </Stack>
  )
}


