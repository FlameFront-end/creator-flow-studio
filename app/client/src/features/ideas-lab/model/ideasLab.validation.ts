import type { IdeaFormat } from '../../../shared/api/services/ideas.api'

type StartIdeasGenerationInput = {
  projectId: string | null
  personaId: string | null
  topic: string
  count: string
  format: IdeaFormat
}

export type StartIdeasGenerationField = 'projectId' | 'personaId' | 'topic' | 'count'

export type StartIdeasGenerationFieldErrors = Partial<Record<StartIdeasGenerationField, string>>

type StartIdeasGenerationError = {
  fieldErrors: StartIdeasGenerationFieldErrors
}

type StartIdeasGenerationPayload = {
  projectId: string
  personaId: string
  topic: string
  count: number
  format: IdeaFormat
}

export const validateStartIdeasGeneration = (
  input: StartIdeasGenerationInput,
): StartIdeasGenerationError | StartIdeasGenerationPayload => {
  const parsedCount = Number(input.count)
  const trimmedTopic = input.topic.trim()
  const fieldErrors: StartIdeasGenerationFieldErrors = {}

  if (!input.projectId) {
    fieldErrors.projectId = 'Выберите проект'
  }

  if (!input.personaId) {
    fieldErrors.personaId = 'Выберите персонажа'
  }

  if (trimmedTopic.length < 3) {
    fieldErrors.topic = 'Укажите тему'
  }

  if (!Number.isFinite(parsedCount) || parsedCount < 1) {
    fieldErrors.count = 'Укажите количество идей'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors }
  }

  const projectId = input.projectId as string
  const personaId = input.personaId as string

  return {
    projectId,
    personaId,
    topic: trimmedTopic,
    count: Math.floor(parsedCount),
    format: input.format,
  }
}
