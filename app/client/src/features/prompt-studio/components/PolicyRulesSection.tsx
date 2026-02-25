import { ActionIcon, Group, Select, SimpleGrid, Stack, Text, Textarea, Title } from '@ui/core'


import { AppBadge } from '../../../shared/components/AppBadge'
import { AppButton } from '../../../shared/components/AppButton'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { policyRulesApi } from '../../../shared/api/services/policyRules.api'
import type { PolicyRuleSeverity, PolicyRuleType } from '../../../shared/api/services/policyRules.api'
import { AppTable } from '../../../shared/components/AppTable'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../../shared/lib/toast'
import { POLICY_RULES_QUERY_KEY } from '../model/promptStudio.queryKeys'

export function PolicyRulesSection() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [type, setType] = useState<PolicyRuleType>('DO')
  const [severity, setSeverity] = useState<PolicyRuleSeverity>('hard')
  const [text, setText] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; text: string } | null>(null)

  const rulesQuery = useQuery({
    queryKey: POLICY_RULES_QUERY_KEY,
    queryFn: policyRulesApi.getPolicyRules,
  })

  const refreshPolicyRules = async () => {
    await queryClient.invalidateQueries({ queryKey: POLICY_RULES_QUERY_KEY })
    await queryClient.refetchQueries({ queryKey: POLICY_RULES_QUERY_KEY, type: 'active' })
  }

  const createMutation = useMutation({
    mutationFn: policyRulesApi.createPolicyRule,
    onSuccess: async () => {
      resetForm()
      await refreshPolicyRules()
      showSuccessToast('Правило создано')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось сохранить правило')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof policyRulesApi.updatePolicyRule>[1] }) =>
      policyRulesApi.updatePolicyRule(id, payload),
    onSuccess: async () => {
      resetForm()
      await refreshPolicyRules()
      showSuccessToast('Правило обновлено')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось обновить правило')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: policyRulesApi.deletePolicyRule,
    onSuccess: async (_, ruleId) => {
      if (editingId) {
        resetForm()
      }
      await refreshPolicyRules()
      if (deleteTarget?.id === ruleId) {
        setDeleteTarget(null)
      }
      showSuccessToast('Правило удалено')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось удалить правило')
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (text.trim().length < 3) {
      showValidationToast('Текст правила должен быть не короче 3 символов')
      return
    }

    const payload = { type, severity, text: text.trim() }
    if (editingId) {
      updateMutation.mutate({ id: editingId, payload })
      return
    }
    createMutation.mutate(payload)
  }

  const startEdit = (rule: Awaited<ReturnType<typeof policyRulesApi.getPolicyRules>>[number]) => {
    if (editingId === rule.id) {
      resetForm()
      return
    }

    setEditingId(rule.id)
    setType(rule.type)
    setSeverity(rule.severity)
    setText(rule.text)
  }

  const resetForm = () => {
    setEditingId(null)
    setType('DO')
    setSeverity('hard')
    setText('')
  }

  const confirmDelete = () => {
    if (!deleteTarget) {
      return
    }
    deleteMutation.mutate(deleteTarget.id)
  }

  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error

  return (
    <Stack gap="md">
      <form onSubmit={onSubmit} noValidate>
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <Select
              label="Тип правила"
              value={type}
              onChange={(value) => setType((value as PolicyRuleType) ?? 'DO')}
              data={[
                { value: 'DO', label: 'Рекомендация (можно)' },
                { value: 'DONT', label: 'Ограничение (нельзя)' },
              ]}
              allowDeselect={false}
            />
            <Select
              label="Жесткость"
              value={severity}
              onChange={(value) => setSeverity((value as PolicyRuleSeverity) ?? 'hard')}
              data={[
                { value: 'hard', label: 'Строгое правило' },
                { value: 'soft', label: 'Гибкая рекомендация' },
              ]}
              allowDeselect={false}
            />
          </SimpleGrid>

          <Textarea
            label="Текст правила"
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            minRows={3}
            required
            minLength={3}
            maxLength={500}
            maxRows={8}
            autosize
            styles={{ input: { resize: 'vertical' } }}
          />

          <Group justify="space-between">
            <Title order={5}>{editingId ? 'Редактирование правила' : 'Создание правила'}</Title>
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

      {mutationError ? (
        <AppInlineErrorAlert>
          {getErrorMessage(mutationError, 'Не удалось сохранить правило')}
        </AppInlineErrorAlert>
      ) : null}

      {rulesQuery.isError ? (
        <AppInlineErrorAlert>
          {getErrorMessage(rulesQuery.error, 'Не удалось загрузить правила')}
        </AppInlineErrorAlert>
      ) : null}

      {!rulesQuery.data?.length ? (
        <Text c="dimmed">Пока нет правил</Text>
      ) : (
        <AppTable>
          <AppTable.Thead>
            <AppTable.Tr>
              <AppTable.Th>Тип</AppTable.Th>
              <AppTable.Th>Жесткость</AppTable.Th>
              <AppTable.Th>Текст</AppTable.Th>
              <AppTable.Th>Действия</AppTable.Th>
            </AppTable.Tr>
          </AppTable.Thead>
          <AppTable.Tbody>
            {rulesQuery.data.map((rule) => {
              const isDeletingThisRule = deleteMutation.isPending && deleteMutation.variables === rule.id

              return (
                <AppTable.Tr key={rule.id}>
                  <AppTable.Td>
                    <AppBadge color={rule.type === 'DONT' ? 'red' : 'green'}>
                      {rule.type === 'DO' ? 'Рекомендация' : 'Ограничение'}
                    </AppBadge>
                  </AppTable.Td>
                  <AppTable.Td>{rule.severity === 'hard' ? 'Строгое' : 'Гибкое'}</AppTable.Td>
                  <AppTable.Td>{rule.text}</AppTable.Td>
                  <AppTable.Td>
                    <Group gap="xs">
                      <ActionIcon variant="light" color="cyan" onClick={() => startEdit(rule)}>
                        <IconPencil size={16} />
                      </ActionIcon>
                      <ActionIcon
                        variant="light"
                        color="red"
                        loading={isDeletingThisRule}
                        disabled={deleteMutation.isPending && !isDeletingThisRule}
                        onClick={() => setDeleteTarget({ id: rule.id, text: rule.text })}
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </AppTable.Td>
                </AppTable.Tr>
              )
            })}
          </AppTable.Tbody>
        </AppTable>
      )}

      <ConfirmActionModal
        opened={Boolean(deleteTarget)}
        title="Подтвердите удаление правила"
        message={deleteTarget ? `Удалить правило "${deleteTarget.text}"?` : ''}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}




