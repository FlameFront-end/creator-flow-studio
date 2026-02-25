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

export const ROUTE_PATHS = {
  ROOT: '/',
  WILDCARD: '*',
} as const

export const ROUTE_PREFIXES = {
  AUTH: '/auth/',
} as const

export const DASHBOARD_CHILD_PATHS = {
  PROJECTS: 'projects',
  PROMPT_STUDIO: 'prompt-studio',
  PROMPT_STUDIO_WORKSPACE: 'prompt-studio/:workspace',
  IDEAS_LAB: 'ideas-lab',
  IDEAS_LAB_WORKSPACE: 'ideas-lab/:workspace',
} as const

export const buildPostDraftExportRoute = (id: string) =>
  `/post-drafts/${id}/export`

export type AdminView = 'projects' | 'prompt-studio' | 'ideas-lab'

export const isAdminView = (value: string | null | undefined): value is AdminView =>
  value === 'projects' || value === 'prompt-studio' || value === 'ideas-lab'

export type IdeasLabWorkspaceRoute = 'brief' | 'ideas' | 'logs'

export const isIdeasLabWorkspaceRoute = (
  value: string | undefined,
): value is IdeasLabWorkspaceRoute =>
  value === 'brief' || value === 'ideas' || value === 'logs'

export const buildIdeasLabRoute = (workspace: IdeasLabWorkspaceRoute) =>
  `/dashboard/ideas-lab/${workspace}`

export type PromptStudioWorkspaceRoute = 'personas' | 'rules' | 'templates' | 'preview'

export const buildPromptStudioRoute = (workspace: PromptStudioWorkspaceRoute) =>
  `/dashboard/prompt-studio/${workspace}`
