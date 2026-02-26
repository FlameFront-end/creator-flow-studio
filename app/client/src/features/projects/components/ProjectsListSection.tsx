import { ActionIcon, Group, Loader, Paper, Stack, Text, TextInput, Title } from '@ui/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { IconPencil, IconSearch, IconTrash } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import { projectsApi } from '../../../shared/api/services/projects.api'
import { AppButton } from '../../../shared/components/AppButton'
import { AppInlineErrorAlert } from '../../../shared/components/AppInlineErrorAlert'
import { AppTable } from '../../../shared/components/AppTable'
import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import { getErrorMessage } from '../../../shared/lib/httpError'
import { showErrorToast, showSuccessToast } from '../../../shared/lib/toast'
import type { EditableProject } from '../pages/projects.page'
import { PROJECTS_QUERY_KEY } from '../model/projects.queryKeys'

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
  const [searchQuery, setSearchQuery] = useState('')

  const projectsQuery = useQuery({
    queryKey: PROJECTS_QUERY_KEY,
    queryFn: projectsApi.getProjects,
  })

  const deleteMutation = useMutation({
    mutationFn: projectsApi.deleteProject,
    onSuccess: async (_, projectId) => {
      await queryClient.invalidateQueries({ queryKey: PROJECTS_QUERY_KEY })
      await queryClient.refetchQueries({ queryKey: PROJECTS_QUERY_KEY, type: 'active' })
      setDeleteTarget(null)
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
    deleteMutation.mutate(deleteTarget.id)
  }

  const filteredProjects = useMemo(() => {
    const projects = projectsQuery.data ?? []
    const query = searchQuery.trim().toLowerCase()
    if (!query) {
      return projects
    }

    return projects.filter((project) => {
      const name = project.name.toLowerCase()
      const description = (project.description ?? '').toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [projectsQuery.data, searchQuery])

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

        {!projectsQuery.isLoading && projectsQuery.data?.length ? (
          <TextInput
            placeholder="Поиск по названию или описанию"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.currentTarget.value)}
            leftSection={<IconSearch size={16} />}
          />
        ) : null}

        {!projectsQuery.isLoading && !projectsQuery.data?.length ? (
          <Paper className="inner-surface projects-empty-state" radius="md" p="md">
            <Stack gap={4}>
              <Text fw={600}>Пока нет проектов</Text>
              <Text c="dimmed" size="sm">
                Создайте первый проект слева, чтобы начать генерацию контента.
              </Text>
            </Stack>
          </Paper>
        ) : null}

        {projectsQuery.data?.length && !filteredProjects.length ? (
          <Paper className="inner-surface projects-empty-state" radius="md" p="md">
            <Stack gap={8}>
              <Text fw={600}>Ничего не найдено</Text>
              <Text c="dimmed" size="sm">
                Попробуйте другой запрос или сбросьте фильтр.
              </Text>
              <Group>
                <AppButton variant="default" size="xs" onClick={() => setSearchQuery('')}>
                  Сбросить поиск
                </AppButton>
              </Group>
            </Stack>
          </Paper>
        ) : null}

        {filteredProjects.length ? (
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
                {filteredProjects.map((project) => {
                  const isEditing = editingProjectId === project.id
                  const isDeletingThisProject =
                    deleteMutation.isPending && deleteMutation.variables === project.id

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
                            loading={isDeletingThisProject}
                            disabled={deleteMutation.isPending && !isDeletingThisProject}
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
