export const ROUTES = {
  LOGIN: '/auth/login',
  HOME: '/dashboard',
  DASHBOARD_PROJECTS: '/dashboard/projects',
  DASHBOARD_PROMPT_STUDIO: '/dashboard/prompt-studio',
  DASHBOARD_PROMPT_STUDIO_WORKSPACE: '/dashboard/prompt-studio/:workspace',
  DASHBOARD_IDEAS_LAB: '/dashboard/ideas-lab',
  DASHBOARD_IDEAS_LAB_WORKSPACE: '/dashboard/ideas-lab/:workspace',
  ABOUT: '/about',
  POST_DRAFT_EXPORT: '/post-drafts/:id/export',
} as const

export const buildPostDraftExportRoute = (id: string) =>
  `/post-drafts/${id}/export`

export type IdeasLabWorkspaceRoute = 'brief' | 'ideas' | 'logs'

export const buildIdeasLabRoute = (workspace: IdeasLabWorkspaceRoute) =>
  `/dashboard/ideas-lab/${workspace}`

export type PromptStudioWorkspaceRoute = 'personas' | 'rules' | 'templates' | 'preview'

export const buildPromptStudioRoute = (workspace: PromptStudioWorkspaceRoute) =>
  `/dashboard/prompt-studio/${workspace}`
