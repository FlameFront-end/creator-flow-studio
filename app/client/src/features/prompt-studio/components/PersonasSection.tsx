import {
  ActionIcon,
  Alert,
  Button,
  Group,
  NumberInput,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { personasApi } from '../../../shared/api/services/personas.api'
import { AppTable } from '../../../shared/components/AppTable'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../../shared/lib/toast'
import { PERSONAS_QUERY_KEY } from '../promptStudio.queryKeys'

export function PersonasSection() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState<number | ''>('')
  const [archetypeTone, setArchetypeTone] = useState('')
  const [bio, setBio] = useState('')
  const [visualCode, setVisualCode] = useState('')
  const [voiceCode, setVoiceCode] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const personasQuery = useQuery({
    queryKey: PERSONAS_QUERY_KEY,
    queryFn: personasApi.getPersonas,
  })

  const createMutation = useMutation({
    mutationFn: personasApi.createPersona,
    onSuccess: () => {
      resetForm()
      void queryClient.invalidateQueries({ queryKey: PERSONAS_QUERY_KEY })
      showSuccessToast('Персонаж создан')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось сохранить персонажа')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof personasApi.updatePersona>[1] }) =>
      personasApi.updatePersona(id, payload),
    onSuccess: () => {
      resetForm()
      void queryClient.invalidateQueries({ queryKey: PERSONAS_QUERY_KEY })
      showSuccessToast('Персонаж обновлён')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось обновить персонажа')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: personasApi.deletePersona,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PERSONAS_QUERY_KEY })
      if (editingId) {
        resetForm()
      }
      showSuccessToast('Персонаж удалён')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось удалить персонажа')
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim().length < 2) {
      showValidationToast('Имя персонажа должно быть не короче 2 символов')
      return
    }

    const payload = {
      name: name.trim(),
      age: age === '' ? undefined : age,
      archetypeTone: archetypeTone || undefined,
      bio: bio || undefined,
      visualCode: visualCode || undefined,
      voiceCode: voiceCode || undefined,
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload })
      return
    }

    createMutation.mutate(payload)
  }

  const startEdit = (persona: Awaited<ReturnType<typeof personasApi.getPersonas>>[number]) => {
    if (editingId === persona.id) {
      resetForm()
      return
    }

    setEditingId(persona.id)
    setName(persona.name)
    setAge(persona.age ?? '')
    setArchetypeTone(persona.archetypeTone ?? '')
    setBio(persona.bio ?? '')
    setVisualCode(persona.visualCode ?? '')
    setVoiceCode(persona.voiceCode ?? '')
  }

  const resetForm = () => {
    setEditingId(null)
    setName('')
    setAge('')
    setArchetypeTone('')
    setBio('')
    setVisualCode('')
    setVoiceCode('')
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
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Имя"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              required
              maxLength={120}
            />
            <NumberInput
              label="Возраст"
              value={age}
              onChange={(value) => setAge(typeof value === 'number' ? value : '')}
              min={1}
              max={130}
            />
          </SimpleGrid>

          <TextInput
            label="Архетип / тон"
            value={archetypeTone}
            onChange={(event) => setArchetypeTone(event.currentTarget.value)}
            maxLength={120}
          />
          <Textarea
            label="Био"
            value={bio}
            onChange={(event) => setBio(event.currentTarget.value)}
            minRows={3}
            maxRows={10}
            autosize
            styles={{ input: { resize: 'vertical' } }}
          />
          <Textarea
            label="Визуальный код"
            value={visualCode}
            onChange={(event) => setVisualCode(event.currentTarget.value)}
            minRows={3}
            maxRows={10}
            autosize
            styles={{ input: { resize: 'vertical' } }}
          />
          <Textarea
            label="Голосовой код"
            value={voiceCode}
            onChange={(event) => setVoiceCode(event.currentTarget.value)}
            minRows={3}
            maxRows={10}
            autosize
            styles={{ input: { resize: 'vertical' } }}
          />

          <Group justify="space-between">
            <Title order={5}>{editingId ? 'Редактирование персонажа' : 'Создание персонажа'}</Title>
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
          {getErrorMessage(mutationError, 'Не удалось сохранить персонажа')}
        </Alert>
      ) : null}

      {personasQuery.isError ? (
        <Alert color="red" title="Ошибка" variant="light">
          {getErrorMessage(personasQuery.error, 'Не удалось загрузить персонажей')}
        </Alert>
      ) : null}

      {!personasQuery.data?.length ? (
        <Text c="dimmed">Пока нет персонажей</Text>
      ) : (
        <AppTable>
          <AppTable.Thead>
            <AppTable.Tr>
              <AppTable.Th>Имя</AppTable.Th>
              <AppTable.Th>Возраст</AppTable.Th>
              <AppTable.Th>Тон</AppTable.Th>
              <AppTable.Th>Действия</AppTable.Th>
            </AppTable.Tr>
          </AppTable.Thead>
          <AppTable.Tbody>
            {personasQuery.data.map((persona) => (
              <AppTable.Tr key={persona.id}>
                <AppTable.Td>{persona.name}</AppTable.Td>
                <AppTable.Td>{persona.age ?? '-'}</AppTable.Td>
                <AppTable.Td>{persona.archetypeTone ?? '-'}</AppTable.Td>
                <AppTable.Td>
                  <Group gap="xs">
                    <ActionIcon variant="light" color="cyan" onClick={() => startEdit(persona)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon
                      variant="light"
                      color="red"
                      loading={deleteMutation.isPending}
                      onClick={() => setDeleteTarget({ id: persona.id, name: persona.name })}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </AppTable.Td>
              </AppTable.Tr>
            ))}
          </AppTable.Tbody>
        </AppTable>
      )}

      <ConfirmActionModal
        opened={Boolean(deleteTarget)}
        title="Подтвердите удаление персонажа"
        message={deleteTarget ? `Удалить персонажа "${deleteTarget.name}"?` : ''}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Stack>
  )
}
