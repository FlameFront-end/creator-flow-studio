import type { IdeaFormat } from '../../../shared/api/services/ideas.api'

type StartIdeasGenerationInput = {
  projectId: string | null
  personaId: string | null
  topic: string
  count: string
  format: IdeaFormat
}

type StartIdeasGenerationError = {
  error: string
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

  if (!input.projectId || !input.personaId || trimmedTopic.length < 3) {
    return { error: 'Выберите проект, персонажа и заполните тему' }
  }

  if (!Number.isFinite(parsedCount) || parsedCount < 1) {
    return { error: 'Количество идей должно быть числом от 1' }
  }

  return {
    projectId: input.projectId,
    personaId: input.personaId,
    topic: trimmedTopic,
    count: Math.floor(parsedCount),
    format: input.format,
  }
}
