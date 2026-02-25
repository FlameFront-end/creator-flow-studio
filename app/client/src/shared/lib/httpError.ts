import axios from 'axios'

type ApiErrorShape = {
  message?: string | string[]
  error?: string
}

const EXACT_ERROR_TRANSLATIONS: Record<string, string> = {
  'Invalid credentials': 'Неверные учетные данные',
  'Invalid or missing bearer token': 'Отсутствует или некорректный токен доступа',
  'Template key must be unique': 'Шаблон с таким типом уже существует',
  'Prompt template not found': 'Шаблон не найден',
  'Project not found': 'Проект не найден',
  'Persona not found': 'Персонаж не найден',
  'Policy rule not found': 'Правило не найдено',
  'Idea not found': 'Идея не найдена',
  'Log not found': 'Лог не найден',
  'Asset not found': 'Ассет не найден',
  'Idea not found for post draft': 'Идея для черновика не найдена',
  'Post draft not found': 'Черновик не найден',
  'Archived draft cannot be moderated': 'Архивный черновик нельзя отправить на модерацию',
  'Archived draft cannot be approved': 'Архивный черновик нельзя одобрить',
  'Published draft cannot be approved again': 'Опубликованный черновик нельзя одобрить повторно',
  'Run checks before approving draft': 'Перед одобрением запустите проверки',
  'Archived draft cannot be published': 'Архивный черновик нельзя публиковать',
  'Archived draft cannot be unapproved': 'Архивный черновик нельзя вернуть в черновик',
  'Published draft cannot be unapproved': 'Опубликованный черновик нельзя вернуть в черновик',
  'LLM returned an empty ideas list': 'Модель вернула пустой список идей',
  'LLM returned empty script text': 'Модель вернула пустой текст сценария',
  'LLM returned empty caption text': 'Модель вернула пустой текст подписи',
  'LLM returned empty image prompt': 'Модель вернула пустой промпт для изображения',
  'Image prompt is empty. Generate image prompt first.':
    'Промпт изображения пуст. Сначала сгенерируйте промпт изображения',
  'Video prompt is empty. Generate video prompt first.':
    'Промпт видео пуст. Сначала сгенерируйте промпт видео',
}

const translateErrorMessage = (message: string): string => {
  const normalized = message.trim()
  if (!normalized) {
    return message
  }

  const exact = EXACT_ERROR_TRANSLATIONS[normalized]
  if (exact) {
    return exact
  }

  const quotedNotFoundMatch = normalized.match(/^(Script|Caption|Asset|Prompt template) "(.+)" not found$/i)
  if (quotedNotFoundMatch) {
    const kind = quotedNotFoundMatch[1].toLowerCase()
    const id = quotedNotFoundMatch[2]
    if (kind === 'script') return `Сценарий "${id}" не найден`
    if (kind === 'caption') return `Подпись "${id}" не найдена`
    if (kind === 'asset') return `Ассет "${id}" не найден`
    return `Шаблон "${id}" не найден`
  }

  if (/environment variable is required$/i.test(normalized)) {
    return 'Отсутствует обязательная переменная окружения'
  }

  return message
}

const toMessage = (value: unknown): string | null => {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value
  }

  if (Array.isArray(value) && value.length > 0) {
    const firstMessage = value.find((item) => typeof item === 'string' && item.trim().length > 0)
    if (firstMessage) {
      return firstMessage
    }
  }

  return null
}

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError<ApiErrorShape>(error)) {
    const payload = error.response?.data
    const message =
      toMessage(payload?.message) ??
      toMessage(payload?.error) ??
      toMessage(error.message) ??
      fallback
    return translateErrorMessage(message)
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return translateErrorMessage(error.message)
  }

  return fallback
}
