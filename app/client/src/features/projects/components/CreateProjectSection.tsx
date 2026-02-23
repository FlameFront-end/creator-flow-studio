import { Alert, Button, Group, Paper, Stack, TextInput, Textarea, Title } from '@mantine/core'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { projectsApi } from '../../../shared/api/services/projects.api'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast, showValidationToast } from '../../../shared/lib/toast'
import type { EditableProject } from '../ProjectsPage'
import { PROJECTS_QUERY_KEY } from '../projects.queryKeys'

type CreateProjectSectionProps = {
  editingProject: EditableProject | null
  onCancelEdit: () => void
  onDoneEdit: () => void
}

export function CreateProjectSection({
  editingProject,
  onCancelEdit,
  onDoneEdit,
}: CreateProjectSectionProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name)
      setDescription(editingProject.description ?? '')
      return
    }

    setName('')
    setDescription('')
  }, [editingProject])

  const createProjectMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      setName('')
      setDescription('')
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      showSuccessToast('Проект создан')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось создать проект')
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof projectsApi.updateProject>[1] }) =>
      projectsApi.updateProject(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      showSuccessToast('Проект обновлён')
      onDoneEdit()
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось обновить проект')
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (name.trim().length < 2) {
      showValidationToast('Название проекта должно быть не короче 2 символов')
      return
    }

    const nextName = name.trim()
    const nextDescription = description.trim()

    if (editingProject) {
      const originalName = editingProject.name.trim()
      const originalDescription = (editingProject.description ?? '').trim()
      const hasChanges = nextName !== originalName || nextDescription !== originalDescription

      if (!hasChanges) {
        onCancelEdit()
        return
      }

      updateProjectMutation.mutate({
        id: editingProject.id,
        payload: {
          name: nextName,
          description: nextDescription || undefined,
        },
      })
      return
    }

    createProjectMutation.mutate({
      name: nextName,
      description: nextDescription || undefined,
    })
  }

  const isEditing = Boolean(editingProject)
  const isPending = createProjectMutation.isPending || updateProjectMutation.isPending
  const mutationError = createProjectMutation.error ?? updateProjectMutation.error

  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>{isEditing ? 'Изменить проект' : 'Создать проект'}</Title>

        <form onSubmit={onSubmit}>
          <Stack gap="sm">
            <TextInput
              label="Название"
              value={name}
              onChange={(event) => setName(event.currentTarget.value)}
              minLength={2}
              maxLength={120}
              required
            />
            <Textarea
              label="Описание"
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              maxLength={500}
              minRows={3}
              maxRows={8}
              autosize
              styles={{ input: { resize: 'vertical' } }}
            />
            <Group justify="flex-end">
              {isEditing ? (
                <Button variant="default" onClick={onCancelEdit} disabled={isPending}>
                  Отмена
                </Button>
              ) : null}
              <Button type="submit" loading={isPending}>
                {isEditing ? 'Сохранить изменения' : 'Создать'}
              </Button>
            </Group>
          </Stack>
        </form>

        {mutationError ? (
          <Alert color="red" title="Ошибка" variant="light">
            {getErrorMessage(mutationError, isEditing ? 'Не удалось обновить проект' : 'Не удалось создать проект')}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  )
}
