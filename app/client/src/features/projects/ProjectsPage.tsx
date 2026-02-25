import { Stack } from '@ui/core'
import { useState } from 'react'
import type { Project } from '../../shared/api/services/projects.api'
import { CreateProjectSection } from './components/CreateProjectSection'
import { ProjectsListSection } from './components/ProjectsListSection'

export type EditableProject = Pick<Project, 'id' | 'name' | 'description'>

export function ProjectsPage() {
  const [editingProject, setEditingProject] = useState<EditableProject | null>(null)

  return (
    <Stack gap="lg">
      <CreateProjectSection
        editingProject={editingProject}
        onCancelEdit={() => setEditingProject(null)}
        onDoneEdit={() => setEditingProject(null)}
      />
      <ProjectsListSection
        editingProjectId={editingProject?.id ?? null}
        onStartEdit={(project) => setEditingProject(project)}
        onCancelEdit={() => setEditingProject(null)}
        onDeletedProject={(projectId) => {
          if (editingProject?.id === projectId) {
            setEditingProject(null)
          }
        }}
      />
    </Stack>
  )
}

