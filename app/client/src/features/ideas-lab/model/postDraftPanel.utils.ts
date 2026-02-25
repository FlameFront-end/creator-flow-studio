import type { IdeaDetails } from '../../../shared/api/services/ideas.api'
import type { ModerationCheckItem } from '../../../shared/api/services/postDrafts.api'

export const postDraftStatusColor: Record<string, string> = {
  draft: 'gray',
  approved: 'green',
  published: 'cyan',
  archived: 'dark',
}

export const postDraftModerationColor: Record<string, string> = {
  passed: 'green',
  failed: 'red',
}

export const formatDraftStatusLabel = (status: string): string => {
  switch (status) {
    case 'draft':
      return 'Черновик'
    case 'approved':
      return 'Подтвержден'
    case 'published':
      return 'Опубликован'
    case 'archived':
      return 'В архиве'
    default:
      return status
  }
}

export const formatModerationStatusLabel = (status: string): string => {
  switch (status) {
    case 'passed':
      return 'Пройдена'
    case 'failed':
      return 'Не пройдена'
    default:
      return status
  }
}

export const toLocalDatetime = (value: string | null): string => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

export const localDatetimeToRuParts = (value: string): { date: string; time: string } => {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return { date: '', time: '' }
  }

  const [datePart, timePart] = value.split('T')
  const [year, month, day] = datePart.split('-')
  return {
    date: `${day}.${month}.${year}`,
    time: timePart,
  }
}

export const ruPartsToLocalDatetime = (dateRu: string, timeRu: string): string => {
  const dateMatch = dateRu.match(/^(\d{2})\.(\d{2})\.(\d{4})$/)
  const timeMatch = timeRu.match(/^(\d{2}):(\d{2})$/)
  if (!dateMatch || !timeMatch) return ''

  const [, day, month, year] = dateMatch
  const [, hours, minutes] = timeMatch

  const dayNumber = Number(day)
  const monthNumber = Number(month)
  const yearNumber = Number(year)
  const hoursNumber = Number(hours)
  const minutesNumber = Number(minutes)

  if (
    monthNumber < 1 ||
    monthNumber > 12 ||
    dayNumber < 1 ||
    dayNumber > 31 ||
    hoursNumber < 0 ||
    hoursNumber > 23 ||
    minutesNumber < 0 ||
    minutesNumber > 59
  ) {
    return ''
  }

  const candidate = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber, hoursNumber, minutesNumber))
  if (
    candidate.getUTCFullYear() !== yearNumber ||
    candidate.getUTCMonth() + 1 !== monthNumber ||
    candidate.getUTCDate() !== dayNumber
  ) {
    return ''
  }

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export const defaultAssetIds = (details: IdeaDetails | undefined): string[] => {
  const succeededAssets =
    details?.assets.filter(
      (asset) =>
        asset.status === 'succeeded' &&
        (asset.type === 'image' || asset.type === 'video'),
    ) ?? []

  const latestVideo = succeededAssets.find((asset) => asset.type === 'video')
  const latestImage = succeededAssets.find((asset) => asset.type === 'image')

  const selected: string[] = []
  if (latestVideo) selected.push(latestVideo.id)
  if (latestImage && !selected.includes(latestImage.id)) selected.push(latestImage.id)
  if (!selected.length && succeededAssets[0]) selected.push(succeededAssets[0].id)
  return selected
}

export const formatCheckResult = (check: ModerationCheckItem): string => {
  if (check.passed) return 'Ок'
  if (!check.hits.length) return 'Ошибка'
  return `Ошибка: ${check.hits.join(', ')}`
}

export const buildTextPreview = (value: string | null | undefined, maxLength = 96): string => {
  const compact = (value ?? '').replace(/\s+/g, ' ').trim()
  if (!compact) return 'Без текста'
  if (compact.length <= maxLength) return compact
  return `${compact.slice(0, maxLength - 1)}…`
}
