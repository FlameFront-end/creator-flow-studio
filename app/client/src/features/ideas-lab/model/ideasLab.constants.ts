export const PROJECTS_QUERY_KEY = ['projects'] as const
export const PERSONAS_QUERY_KEY = ['personas'] as const
export const IDEAS_QUERY_KEY = ['ideas'] as const
export const IDEA_DETAILS_QUERY_KEY = ['idea-details'] as const
export const AI_LOGS_QUERY_KEY = ['ai-run-logs'] as const
export const POST_DRAFT_LATEST_QUERY_KEY = ['post-draft-latest'] as const

export const ideasQueryKey = (projectId: string | null | undefined) =>
  [...IDEAS_QUERY_KEY, projectId] as const

export const ideaDetailsQueryKey = (ideaId: string | null | undefined) =>
  [...IDEA_DETAILS_QUERY_KEY, ideaId] as const

export const aiLogsQueryKey = (projectId: string | null | undefined) =>
  [...AI_LOGS_QUERY_KEY, projectId] as const

export const postDraftLatestQueryKey = (ideaId: string | null | undefined) =>
  [...POST_DRAFT_LATEST_QUERY_KEY, ideaId] as const

export const IDEAS_DEFAULT_TOPIC = 'Вертикальный ролик с цепляющим первым кадром'
export const IDEAS_DEFAULT_COUNT = '5'
export const IDEAS_LOGS_COLLAPSED_STORAGE_KEY = 'ideas_lab_logs_collapsed'
export const IDEAS_SELECTED_ID_BY_PROJECT_STORAGE_KEY = 'ideas_lab_selected_id_by_project'
export const IDEAS_OPEN_ADVANCED_SETTINGS_EVENT = 'ideas-lab:open-advanced-settings'
