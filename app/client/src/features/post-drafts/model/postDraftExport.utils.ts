import type {
  ModerationCheckItem,
  PostDraftAsset,
  PostDraftExport,
  PostDraftModeration,
} from '../../../shared/api/services/postDrafts.api'

export type PublishChecklistItem = {
  label: string
  done: boolean
}

export type ModerationCheckView = {
  key: keyof PostDraftModeration['checks']
  value: ModerationCheckItem
}

export const statusColor: Record<string, string> = {
  draft: 'gray',
  approved: 'green',
  published: 'cyan',
  archived: 'dark',
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

export const formatAssetTypeLabel = (assetType: string): string => {
  switch (assetType.toLowerCase()) {
    case 'image':
      return 'Изображение'
    case 'video':
      return 'Видео'
    case 'audio':
      return 'Аудио'
    default:
      return assetType
  }
}

export const formatIdeaFormatLabel = (format: string): string => {
  switch (format.toLowerCase()) {
    case 'reel':
      return 'Рилс'
    case 'short':
      return 'Шортс'
    case 'tiktok':
      return 'ТикТок'
    default:
      return format
  }
}

export const resolveAssetUrl = (url: string | null): string | null => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'
  return `${base}${url.startsWith('/') ? '' : '/'}${url}`
}

export const buildCaptionForCopy = (captionText: string | null, hashtags: string[] | null): string => {
  const text = captionText?.trim() ?? ''
  const tags = (hashtags ?? []).join(' ').trim()
  if (text && tags) return `${text}\n\n${tags}`
  if (text) return text
  return tags
}

export const toPercent = (score: number): number => {
  if (!Number.isFinite(score)) return 0
  if (score <= 1) return Math.round(score * 100)
  return Math.max(0, Math.min(100, Math.round(score)))
}

export const formatCheckLabel = (key: string): string => {
  switch (key) {
    case 'nsfw':
      return 'NSFW'
    case 'toxicity':
      return 'Токсичность'
    case 'forbiddenTopics':
      return 'Запрещенные темы'
    case 'policy':
      return 'Политики'
    default:
      return key
  }
}

export const formatCheckResult = (check: ModerationCheckItem): string => {
  if (check.passed) return 'Пройдена'
  if (!check.hits.length) return 'Не пройдена'
  return `Не пройдена: ${check.hits.join(', ')}`
}

export const getAssetsStats = (assets: PostDraftAsset[]) => ({
  total: assets.length,
  images: assets.filter((asset) => asset.type === 'image').length,
  videos: assets.filter((asset) => asset.type === 'video').length,
})

export const getModerationChecks = (moderation: PostDraftModeration | null): ModerationCheckView[] => {
  if (!moderation) return []
  return [
    { key: 'nsfw', value: moderation.checks.nsfw },
    { key: 'toxicity', value: moderation.checks.toxicity },
    { key: 'forbiddenTopics', value: moderation.checks.forbiddenTopics },
    { key: 'policy', value: moderation.checks.policy },
  ]
}

export const getPublishChecklist = (
  payload: PostDraftExport,
  moderation: PostDraftModeration | null,
): PublishChecklistItem[] => [
  {
    label: 'Есть хотя бы один ассет',
    done: payload.assets.length > 0,
  },
  {
    label: 'Есть подпись',
    done: Boolean(payload.caption?.text?.trim()),
  },
  {
    label: 'Модерация пройдена',
    done: moderation?.status === 'passed',
  },
  {
    label: 'Черновик подтвержден',
    done: payload.status === 'approved' || payload.status === 'published',
  },
]
