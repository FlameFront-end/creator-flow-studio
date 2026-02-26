import type { Caption, Script } from '../../../../shared/api/services/ideas.api'

export const INLINE_ERROR_PREVIEW_LIMIT = 180

const sortByDateDesc = <T extends { createdAt: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))

export const pickDisplayScript = (scripts: Script[]): Script | null => {
  const sorted = sortByDateDesc(scripts)
  return sorted[0] ?? null
}

export const pickDisplayCaption = (captions: Caption[]): Caption | null => {
  const sorted = sortByDateDesc(captions)
  return sorted[0] ?? null
}

export const isSucceededStatus = (status: string | null | undefined) => status === 'succeeded'

export const isInProgressStatus = (status: string | null | undefined) =>
  status === 'queued' || status === 'running'
