import {
  IDEAS_LOGS_COLLAPSED_STORAGE_KEY,
  IDEAS_SELECTED_ID_BY_PROJECT_STORAGE_KEY,
} from './ideasLab.constants'

export type PersistedSelectedIdeaByProject = Record<string, string>

export const readPersistedSelectedIdeaByProject = (): PersistedSelectedIdeaByProject => {
  if (typeof window === 'undefined') return {}

  const raw = window.localStorage.getItem(IDEAS_SELECTED_ID_BY_PROJECT_STORAGE_KEY)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === 'string' && typeof entry[1] === 'string' && entry[1].length > 0,
    )

    return Object.fromEntries(entries)
  } catch {
    return {}
  }
}

export const writePersistedSelectedIdeaByProject = (value: PersistedSelectedIdeaByProject) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(IDEAS_SELECTED_ID_BY_PROJECT_STORAGE_KEY, JSON.stringify(value))
}

export const readIdeasLogsCollapsed = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(IDEAS_LOGS_COLLAPSED_STORAGE_KEY) === '1'
}

export const writeIdeasLogsCollapsed = (collapsed: boolean) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(IDEAS_LOGS_COLLAPSED_STORAGE_KEY, collapsed ? '1' : '0')
}
