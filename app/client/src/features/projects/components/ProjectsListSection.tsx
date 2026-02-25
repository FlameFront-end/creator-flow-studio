import { ActionIcon, Group, Loader, Paper, Stack, Text, Title } from '@ui/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPencil, IconTrash } from '@tabler/icons-react'
import { projectsApi } from '../../../shared/api/services/projects.api'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { AppTable } from '../../../shared/components/AppTable'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast } from '../../../shared/lib/toast'
import type { EditableProject } from '../ProjectsPage'
import { PROJECTS_QUERY_KEY } from '../projects.queryKeys'
import { useState } from 'react'

type ProjectsListSectionProps = {
  editingProjectId: string | null
  onStartEdit: (project: EditableProject) => void
  onCancelEdit: () => void
  onDeletedProject: (projectId: string) => void
}

export function ProjectsListSection({
  editingProjectId,
  onStartEdit,
  onCancelEdit,
  onDeletedProject,
}: ProjectsListSectionProps) {
  const queryClient = useQueryClient()
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const projectsQuery = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: projectsApi.getProjects,
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: (_, projectId) => {
      void queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      onDeletedProject(projectId)
      showSuccessToast('Проект удалён')
    },
    onError: (error) => {
      showErrorToast(error, 'Не удалось удалить проект')
    },
  })

  const confirmDelete = () => {
    if (!deleteTarget) {
      return
    }
    const targetId = deleteTarget.id
    setDeleteTarget(null)
    deleteMutation.mutate(targetId)
  }

  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>Список проектов</Title>

        {projectsQuery.isLoading ? (
          <Group justify="center" py="md">
            <Loader />
          </Group>
        ) : null}

        {projectsQuery.isError ? (
          <AppInlineErrorAlert>
            {getErrorMessage(projectsQuery.error, 'Не удалось загрузить проекты')}
          </AppInlineErrorAlert>
        ) : null}

        {deleteMutation.isError ? (
          <AppInlineErrorAlert>
            {getErrorMessage(deleteMutation.error, 'Не удалось удалить проект')}
          </AppInlineErrorAlert>
        ) : null}

        {!projectsQuery.isLoading && !projectsQuery.data?.length ? <Text c="dimmed">Пока нет проектов</Text> : null}

        {projectsQuery.data?.length ? (
          <div className="projects-table-wrap">
            <AppTable className="projects-table">
              <AppTable.Thead>
                <AppTable.Tr>
                  <AppTable.Th>Название</AppTable.Th>
                  <AppTable.Th>Описание</AppTable.Th>
                  <AppTable.Th>Создан</AppTable.Th>
                  <AppTable.Th>Действия</AppTable.Th>
                </AppTable.Tr>
              </AppTable.Thead>
              <AppTable.Tbody>
                {projectsQuery.data.map((project) => {
                  const isEditing = editingProjectId === project.id

                  return (
                    <AppTable.Tr key={project.id}>
                      <AppTable.Td>{project.name}</AppTable.Td>
                      <AppTable.Td>{project.description || '-'}</AppTable.Td>
                      <AppTable.Td>{new Date(project.createdAt).toLocaleString('ru-RU')}</AppTable.Td>
                      <AppTable.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant={isEditing ? 'filled' : 'light'}
                            color="cyan"
                            onClick={() => {
                              if (isEditing) {
                                onCancelEdit()
                                return
                              }

                              onStartEdit({
                                id: project.id,
                                name: project.name,
                                description: project.description,
                              })
                            }}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>

                          <ActionIcon
                            variant="light"
                            color="red"
                            loading={deleteMutation.isPending}
                            onClick={() => {
                              setDeleteTarget({ id: project.id, name: project.name })
                            }}
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
          </div>
        ) : null}
      </Stack>

      <ConfirmActionModal
        opened={Boolean(deleteTarget)}
        title="Подтвердите удаление проекта"
        message={deleteTarget ? `Удалить проект "${deleteTarget.name}"?` : ''}
        confirmLabel="Удалить"
        cancelLabel="Отмена"
        loading={deleteMutation.isPending}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </Paper>
  )
}


