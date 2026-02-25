export const POST_DRAFT_EXPORT_QUERY_KEY = ['post-draft-export'] as const

export const postDraftExportQueryKey = (id: string | undefined) =>
  [...POST_DRAFT_EXPORT_QUERY_KEY, id] as const
