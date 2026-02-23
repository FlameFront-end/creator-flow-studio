export const statusColor: Record<string, string> = {
  queued: 'gray',
  running: 'blue',
  succeeded: 'green',
  failed: 'red',
}

export const formatStatusLabel = (status: string): string => {
  switch (status) {
    case 'queued':
      return 'В очереди'
    case 'running':
      return 'Выполняется'
    case 'succeeded':
      return 'Успех'
    case 'failed':
      return 'Ошибка'
    default:
      return status
  }
}

export const formatOperationLabel = (operation: string): string => {
  switch (operation) {
    case 'ideas':
      return 'Генерация идей'
    case 'script':
      return 'Генерация сценария'
    case 'caption':
      return 'Генерация подписи'
    case 'image_prompt':
      return 'Генерация image prompt'
    case 'image':
      return 'Генерация картинки'
    case 'video':
      return 'Генерация видео'
    default:
      return operation
  }
}

export const resolveAssetUrl = (url: string | null): string | null => {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
  return `${apiBase}${url}`
}
