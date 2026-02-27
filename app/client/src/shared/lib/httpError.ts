import axios from 'axios'

type ApiErrorShape = {
  message?: string | string[]
  error?: string
}

const EXACT_ERROR_TRANSLATIONS: Record<string, string> = {
  'Internal server error': 'Внутренняя ошибка сервера',
  'Internal Server Error': 'Внутренняя ошибка сервера',
  'Invalid credentials': 'Неверные учетные данные',
  'User already exists': 'Пользователь с таким email уже существует',
  'Invalid or expired access token': 'Токен доступа недействителен или истек',
  'Invalid or expired refresh token': 'Сессия истекла. Выполните вход повторно',
  'Template key must be unique': 'Шаблон с таким типом уже существует',
  'Template key must be unique for persona':
    'Для этого персонажа шаблон такого типа уже существует',
  'Project name must be unique': 'Проект с таким названием уже существует',
  'Persona name must be unique': 'Персонаж с таким именем уже существует',
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
  'Script is required. Generate script first.':
    'Сначала сгенерируйте сценарий, затем запускайте этот этап',
  'Image prompt is empty. Generate image prompt first.':
    'Промпт изображения пуст. Сначала сгенерируйте промпт изображения',
  'Video prompt is empty. Generate video prompt first.':
    'Промпт видео пуст. Сначала сгенерируйте промпт видео',
  'Unsupported provider. Use openai, openrouter, or openai-compatible.':
    'Неподдерживаемый провайдер. Используйте openai, openrouter или openai-compatible',
  'Model is required': 'Укажите модель',
  'Base URL is required for openai-compatible provider':
    'Для openai-compatible требуется Base URL',
  'Base URL must be a valid HTTP(S) URL':
    'Base URL должен быть валидным HTTP(S) адресом',
  'Base URL must use HTTP or HTTPS':
    'Base URL должен начинаться с http:// или https://',
  'Base URL host is not allowed for security reasons':
    'Хост Base URL запрещен по соображениям безопасности',
  'OPENAI API key is required to save this provider':
    'Для OpenAI необходимо указать API ключ',
  'OPENROUTER API key is required to save this provider':
    'Для OpenRouter необходимо указать API ключ',
  'LLM API key is required to save openai-compatible provider':
    'Для openai-compatible необходимо указать API ключ',
  'Too many AI connection test requests. Try again in one minute.':
    'Слишком много проверок подключения. Повторите через минуту',
  'AI connection test failed': 'Не удалось выполнить проверку подключения к ИИ',
  'AI connection test rate limiter is temporarily unavailable.':
    'Сервис ограничения запросов для проверки ИИ временно недоступен',
  'Auth rate limiter is temporarily unavailable.':
    'Сервис ограничения запросов авторизации временно недоступен',
  'AI connection test returned an empty response':
    'Проверка подключения вернула пустой ответ',
  'AI provider timed out. Please try again in a moment.':
    'Модель долго не отвечает. Попробуйте ещё раз через несколько секунд',
  'OPENAI_API_KEY is not configured for AI generation':
    'API-ключ OpenAI не настроен для генерации ИИ',
  'OPENROUTER_API_KEY is not configured for AI generation':
    'API-ключ OpenRouter не настроен для генерации ИИ',
  'LLM_MODEL is not configured for AI generation':
    'Модель LLM не настроена для генерации ИИ',
  'LLM_BASE_URL is not configured for AI generation':
    'Base URL LLM не настроен для генерации ИИ',
  'OpenAI response is empty or malformed':
    'Ответ OpenAI пустой или некорректного формата',
  'OpenAI returned invalid JSON payload':
    'OpenAI вернул некорректный JSON',
  'OpenRouter response is empty or malformed':
    'Ответ OpenRouter пустой или некорректного формата',
  'OpenRouter returned invalid JSON payload':
    'OpenRouter вернул некорректный JSON',
  'OpenAI-compatible response is empty or malformed':
    'Ответ OpenAI-compatible провайдера пустой или некорректного формата',
  'OpenAI-compatible provider returned invalid JSON payload':
    'OpenAI-compatible провайдер вернул некорректный JSON',
}

const stripErrorCodePrefix = (message: string): string =>
  message.replace(/^\[[a-z0-9_]+\]\s*/i, '').trim()

const getProviderLabel = (provider: string): string => {
  const normalizedProvider = provider.trim().toLowerCase()
  if (normalizedProvider === 'openai-compatible') {
    return 'локальному AI-серверу'
  }
  if (normalizedProvider === 'openai') {
    return 'OpenAI'
  }
  if (normalizedProvider === 'openrouter') {
    return 'OpenRouter'
  }
  return provider
}

const translateProviderTransportError = (provider: string, reason: string): string => {
  const normalizedReason = reason.trim().toLowerCase()
  const providerLabel = getProviderLabel(provider)

  if (
    normalizedReason.includes('fetch failed') ||
    normalizedReason.includes('failed to fetch') ||
    normalizedReason.includes('network error') ||
    normalizedReason.includes('unknown network error')
  ) {
    return `Не удалось подключиться к ${providerLabel}. Проверьте подключение и настройки доступа`
  }

  if (normalizedReason.includes('econnrefused')) {
    return `Не удалось подключиться к ${providerLabel} (соединение отклонено). Проверьте, что сервер запущен и адрес указан верно`
  }

  if (normalizedReason.includes('enotfound') || normalizedReason.includes('getaddrinfo')) {
    return `Не удалось определить адрес для ${providerLabel}. Проверьте URL и DNS`
  }

  if (
    normalizedReason.includes('etimedout') ||
    normalizedReason.includes('timed out') ||
    normalizedReason.includes('timeout')
  ) {
    return `${providerLabel} слишком долго отвечает. Попробуйте ещё раз`
  }

  if (normalizedReason.includes('econnreset') || normalizedReason.includes('socket hang up')) {
    return `Соединение с ${providerLabel} было разорвано. Попробуйте повторить запрос`
  }

  if (providerLabel === 'локальному AI-серверу') {
    return 'Не удалось выполнить запрос к локальному AI-серверу. Проверьте Base URL и доступность сервера'
  }

  return `Не удалось выполнить запрос к ${providerLabel}. Попробуйте ещё раз`
}

const translateErrorMessage = (message: string): string => {
  const normalized = message.trim()
  if (!normalized) {
    return message
  }

  const normalizedWithoutCodePrefix = stripErrorCodePrefix(normalized)
  const lookupMessage = normalizedWithoutCodePrefix || normalized

  const exact = EXACT_ERROR_TRANSLATIONS[lookupMessage]
  if (exact) {
    return exact
  }

  const aiRateLimitMatch = lookupMessage.match(
    /^Too many AI connection test requests\. Try again in (\d+) seconds\.$/i,
  )
  if (aiRateLimitMatch) {
    return `Слишком много проверок подключения. Повторите через ${aiRateLimitMatch[1]} сек.`
  }

  if (/timed out after \d+ms/i.test(lookupMessage)) {
    return 'Модель долго не отвечает. Попробуйте ещё раз через несколько секунд'
  }

  const providerFailedBeforeResponseMatch = lookupMessage.match(
    /^(OpenAI-compatible|OpenAI|OpenRouter) request failed before response: (.+)$/i,
  )
  if (providerFailedBeforeResponseMatch) {
    return translateProviderTransportError(
      providerFailedBeforeResponseMatch[1],
      providerFailedBeforeResponseMatch[2],
    )
  }

  const providerFailedWithStatusMatch = lookupMessage.match(
    /^(OpenAI-compatible|OpenAI|OpenRouter) request failed \((\d{3})\s+(.+)\)$/i,
  )
  if (providerFailedWithStatusMatch) {
    const providerLabel = getProviderLabel(providerFailedWithStatusMatch[1])
    return `Запрос к ${providerLabel} завершился ошибкой HTTP ${providerFailedWithStatusMatch[2]}`
  }

  const providerFailedGenericMatch = lookupMessage.match(
    /^(OpenAI-compatible|OpenAI|OpenRouter) request failed$/i,
  )
  if (providerFailedGenericMatch) {
    const providerLabel = getProviderLabel(providerFailedGenericMatch[1])
    return `Не удалось выполнить запрос к ${providerLabel}`
  }

  if (
    /^fetch failed$/i.test(lookupMessage) ||
    /^failed to fetch$/i.test(lookupMessage) ||
    /^network error$/i.test(lookupMessage)
  ) {
    return 'Сетевой запрос не выполнен. Проверьте подключение и доступность сервера'
  }

  if (/econnrefused/i.test(lookupMessage)) {
    return 'Сервер недоступен (соединение отклонено). Проверьте адрес и запущен ли сервис'
  }

  if (/enotfound|getaddrinfo/i.test(lookupMessage)) {
    return 'Не удалось найти адрес сервера. Проверьте URL'
  }

  if (/etimedout|timed out|timeout/i.test(lookupMessage)) {
    return 'Сервер слишком долго отвечает. Попробуйте ещё раз'
  }

  const shouldNotExistMatch = lookupMessage.match(/^property (.+) should not exist$/i)
  if (shouldNotExistMatch) {
    const fieldName = shouldNotExistMatch[1]
    return `Поле "${fieldName}" не должно передаваться в этом запросе`
  }

  const quotedNotFoundMatch = lookupMessage.match(
    /^(Script|Caption|Asset|Prompt template) "(.+)" not found$/i,
  )
  if (quotedNotFoundMatch) {
    const kind = quotedNotFoundMatch[1].toLowerCase()
    const id = quotedNotFoundMatch[2]
    if (kind === 'script') return `Сценарий "${id}" не найден`
    if (kind === 'caption') return `Подпись "${id}" не найдена`
    if (kind === 'asset') return `Ассет "${id}" не найден`
    return `Шаблон "${id}" не найден`
  }

  const unavailableModelMatch = lookupMessage.match(/^Requested model "(.+)" is unavailable\.$/i)
  if (unavailableModelMatch) {
    return `Запрошенная модель "${unavailableModelMatch[1]}" недоступна`
  }

  if (/environment variable is required$/i.test(lookupMessage)) {
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

  if (typeof error === 'string' && error.trim().length > 0) {
    return translateErrorMessage(error)
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return translateErrorMessage(error.message)
  }

  return fallback
}
