import { Group, Paper, Stack, Textarea, TextInput, Title } from '@ui/core'

import { AppButton } from '../../../shared/components/AppButton'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { projectsApi } from '../../../shared/api/services/projects.api'
import { showErrorToast, showSuccessToast } from '../../../shared/lib/toast'
import { useFormErrors } from '../../../shared/lib/useFormErrors'
import type { EditableProject } from '../pages/projects.page'
import { PROJECTS_QUERY_KEY } from '../model/projects.queryKeys'

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
  const nameInputRef = useRef<HTMLInputElement>(null)
  const { errors, setErrors, clearError, clearAll, getFirstErrorField } = useFormErrors<'name'>()

  useEffect(() => {
    if (editingProject) {
      setName(editingProject.name)
      setDescription(editingProject.description ?? '')
      clearAll()
      return
    }

    setName('')
    setDescription('')
    clearAll()
  }, [clearAll, editingProject])

  const refreshProjects = async () => {
    await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
    await queryClient.refetchQueries({ queryKey: PROJECTS_QUERY_KEY, type: 'active' })
  }

  const createProjectMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: async () => {
      await refreshProjects()
      setName('')
      setDescription('')
      showSuccessToast('Проект создан')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось создать проект')
    },
  })

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof projectsApi.updateProject>[1] }) =>
      projectsApi.updateProject(id, payload),
    onSuccess: async () => {
      await refreshProjects()
      showSuccessToast('Проект обновлён')
      onDoneEdit()
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось обновить проект')
    },
  })

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    const nextDescription = description.trim()
    const nextErrors: Partial<Record<'name', string>> = {}

    if (nextName.length < 2) {
      nextErrors.name = 'Название проекта должно быть не короче 2 символов'
    }

    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      const firstErrorField = (Object.keys(nextErrors)[0] ?? getFirstErrorField()) as 'name' | null
      if (firstErrorField === 'name') {
        nameInputRef.current?.focus()
      }
      return
    }

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

  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>{isEditing ? 'Изменить проект' : 'Создать проект'}</Title>

        <form onSubmit={onSubmit} noValidate>
          <Stack gap="sm">
            <TextInput
              ref={nameInputRef}
              label={<span style={{ color: errors.name ? 'rgba(248, 113, 113, 0.9)' : undefined }}>Название</span>}
              value={name}
              onChange={(event) => {
                const nextValue = event.currentTarget.value
                setName(nextValue)
                if (nextValue.trim().length >= 2) {
                  clearError('name')
                }
              }}
              minLength={2}
              maxLength={120}
              required
              error={errors.name}
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
                <AppButton variant="default" onClick={onCancelEdit} disabled={isPending}>
                  Отмена
                </AppButton>
              ) : null}
              <AppButton type="submit" loading={isPending}>
                {isEditing ? 'Сохранить изменения' : 'Создать'}
              </AppButton>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Paper>
  )
}




