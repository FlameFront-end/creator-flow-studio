import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { ideasApi, type Idea, type IdeaFormat } from '../../../shared/api/services/ideas.api'
import { personasApi } from '../../../shared/api/services/personas.api'
import { projectsApi } from '../../../shared/api/services/projects.api'
import { showErrorToast, showValidationToast } from '../../../shared/lib/toast'
import {
  AI_LOGS_QUERY_KEY,
  IDEA_DETAILS_QUERY_KEY,
  IDEAS_DEFAULT_COUNT,
  IDEAS_DEFAULT_TOPIC,
  IDEAS_LOGS_COLLAPSED_STORAGE_KEY,
  IDEAS_QUERY_KEY,
  IDEAS_SELECTED_ID_BY_PROJECT_STORAGE_KEY,
} from '../model/ideasLab.constants'

type PersistedSelectedIdeaByProject = Record<string, string>

const readPersistedSelectedIdeaByProject = (): PersistedSelectedIdeaByProject => {
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

const writePersistedSelectedIdeaByProject = (value: PersistedSelectedIdeaByProject) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(IDEAS_SELECTED_ID_BY_PROJECT_STORAGE_KEY, JSON.stringify(value))
}

export const useIdeasLabController = () => {
  const queryClient = useQueryClient()

  const [projectId, setProjectId] = useState<string | null>(null)
  const [personaId, setPersonaId] = useState<string | null>(null)
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [topic, setTopic] = useState(IDEAS_DEFAULT_TOPIC)
  const [count, setCount] = useState(IDEAS_DEFAULT_COUNT)
  const [format, setFormat] = useState<IdeaFormat>('reel')

  const [clearIdeasModalOpen, setClearIdeasModalOpen] = useState(false)
  const [clearLogsModalOpen, setClearLogsModalOpen] = useState(false)
  const [deleteIdeaId, setDeleteIdeaId] = useState<string | null>(null)
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null)
  const [isLogsCollapsed, setIsLogsCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(IDEAS_LOGS_COLLAPSED_STORAGE_KEY) === '1'
  })

  const projectsQuery = useQuery({ queryKey: ['projects'], queryFn: projectsApi.getProjects })
  const personasQuery = useQuery({ queryKey: ['personas'], queryFn: personasApi.getPersonas })

  useEffect(() => {
    window.localStorage.setItem(IDEAS_LOGS_COLLAPSED_STORAGE_KEY, isLogsCollapsed ? '1' : '0')
  }, [isLogsCollapsed])

  useEffect(() => {
    if (!projectId && projectsQuery.data?.length) {
      setProjectId(projectsQuery.data[0].id)
    }
  }, [projectId, projectsQuery.data])

  useEffect(() => {
    if (!personaId && personasQuery.data?.length) {
      setPersonaId(personasQuery.data[0].id)
    }
  }, [personaId, personasQuery.data])

  const ideasQuery = useQuery({
    queryKey: [...IDEAS_QUERY_KEY, projectId],
    queryFn: () => ideasApi.getIdeas(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: 4000,
  })

  useEffect(() => {
    const ideas = ideasQuery.data ?? []

    if (!ideas.length) {
      if (selectedIdeaId !== null) {
        setSelectedIdeaId(null)
      }
      return
    }

    if (selectedIdeaId && ideas.some((idea) => idea.id === selectedIdeaId)) {
      return
    }

    const persistedSelectedIdeaId =
      projectId ? readPersistedSelectedIdeaByProject()[projectId] ?? null : null

    if (persistedSelectedIdeaId && ideas.some((idea) => idea.id === persistedSelectedIdeaId)) {
      setSelectedIdeaId(persistedSelectedIdeaId)
      return
    }

    setSelectedIdeaId(ideas[0].id)
  }, [projectId, selectedIdeaId, ideasQuery.data])

  useEffect(() => {
    if (!projectId || !selectedIdeaId) {
      return
    }

    if (!ideasQuery.data?.some((idea) => idea.id === selectedIdeaId)) {
      return
    }

    const persisted = readPersistedSelectedIdeaByProject()
    if (persisted[projectId] === selectedIdeaId) {
      return
    }

    writePersistedSelectedIdeaByProject({
      ...persisted,
      [projectId]: selectedIdeaId,
    })
  }, [projectId, selectedIdeaId, ideasQuery.data])

  const detailsQuery = useQuery({
    queryKey: [...IDEA_DETAILS_QUERY_KEY, selectedIdeaId],
    queryFn: () => ideasApi.getIdea(selectedIdeaId as string),
    enabled: Boolean(selectedIdeaId),
    refetchInterval: 4000,
  })

  const logsQuery = useQuery({
    queryKey: [...AI_LOGS_QUERY_KEY, projectId],
    queryFn: () => ideasApi.getLogs(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: 4000,
  })

  const invalidateAll = () => {
    void queryClient.invalidateQueries({ queryKey: [...IDEAS_QUERY_KEY, projectId] })
    void queryClient.invalidateQueries({ queryKey: [...IDEA_DETAILS_QUERY_KEY, selectedIdeaId] })
    void queryClient.invalidateQueries({ queryKey: [...AI_LOGS_QUERY_KEY, projectId] })
  }

  const generateIdeasMutation = useMutation({
    mutationFn: ideasApi.generateIdeas,
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'Не удалось поставить задачу в очередь'),
  })

  const generateScriptMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateScript(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'Не удалось поставить генерацию сценария в очередь'),
  })

  const generateCaptionMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateCaption(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'Не удалось поставить генерацию подписи в очередь'),
  })

  const generateImagePromptMutation = useMutation({
    mutationFn: (ideaId: string) => ideasApi.generateImagePrompt(ideaId),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'Не удалось сгенерировать промпт изображения'),
  })

  const generateVideoPromptMutation = useMutation({
    mutationFn: (ideaId: string) => ideasApi.generateVideoPrompt(ideaId),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'Не удалось сгенерировать промпт видео'),
  })

  const generateImageMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateImage(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'Не удалось поставить генерацию изображения в очередь'),
  })

  const generateVideoMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateVideo(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'Не удалось поставить генерацию видео в очередь'),
  })

  const clearIdeasMutation = useMutation({
    mutationFn: (currentProjectId: string) => ideasApi.clearIdeas(currentProjectId),
    onSuccess: (_, currentProjectId) => {
      const persisted = readPersistedSelectedIdeaByProject()
      if (persisted[currentProjectId]) {
        delete persisted[currentProjectId]
        writePersistedSelectedIdeaByProject(persisted)
      }

      setSelectedIdeaId(null)
      setClearIdeasModalOpen(false)
      invalidateAll()
    },
    onError: (error) => showErrorToast(error, 'Не удалось очистить список идей'),
  })

  const clearLogsMutation = useMutation({
    mutationFn: (currentProjectId: string) => ideasApi.clearLogs(currentProjectId),
    onSuccess: () => {
      setClearLogsModalOpen(false)
      invalidateAll()
    },
    onError: (error) => showErrorToast(error, 'Не удалось очистить AI-логи'),
  })

  const removeIdeaMutation = useMutation({
    mutationFn: (ideaId: string) => ideasApi.removeIdea(ideaId),
    onSuccess: () => {
      if (deleteIdeaId && deleteIdeaId === selectedIdeaId) {
        setSelectedIdeaId(null)
      }
      setDeleteIdeaId(null)
      invalidateAll()
    },
    onError: (error) => showErrorToast(error, 'Не удалось удалить идею'),
  })

  const removeLogMutation = useMutation({
    mutationFn: (logId: string) => ideasApi.removeLog(logId),
    onSuccess: () => {
      setDeleteLogId(null)
      invalidateAll()
    },
    onError: (error) => showErrorToast(error, 'Не удалось удалить лог'),
  })

  const selectedIdea = useMemo(
    () => ideasQuery.data?.find((idea) => idea.id === selectedIdeaId) ?? null,
    [ideasQuery.data, selectedIdeaId],
  )

  const logsStats = useMemo(() => {
    const logs = logsQuery.data ?? []
    return {
      total: logs.length,
      successCount: logs.filter((log) => log.status === 'succeeded').length,
      failedCount: logs.filter((log) => log.status === 'failed').length,
      avgLatencyMs: logs.length
        ? Math.round(logs.reduce((acc, log) => acc + (log.latencyMs ?? 0), 0) / logs.length)
        : 0,
      totalTokens: logs.reduce((acc, log) => acc + (log.tokens ?? 0), 0),
    }
  }, [logsQuery.data])

  const startIdeaGeneration = () => {
    const parsedCount = Number(count)

    if (!projectId || !personaId || topic.trim().length < 3) {
      showValidationToast('Выберите проект, персонажа и заполните тему')
      return
    }

    if (!Number.isFinite(parsedCount) || parsedCount < 1) {
      showValidationToast('Количество идей должно быть числом от 1')
      return
    }

    generateIdeasMutation.mutate({
      projectId,
      personaId,
      topic: topic.trim(),
      count: Math.floor(parsedCount),
      format,
    })
  }

  return {
    projectId,
    setProjectId,
    personaId,
    setPersonaId,
    selectedIdeaId,
    setSelectedIdeaId,
    topic,
    setTopic,
    count,
    setCount,
    format,
    setFormat,
    clearIdeasModalOpen,
    setClearIdeasModalOpen,
    clearLogsModalOpen,
    setClearLogsModalOpen,
    deleteIdeaId,
    setDeleteIdeaId,
    deleteLogId,
    setDeleteLogId,
    isLogsCollapsed,
    setIsLogsCollapsed,
    projectsQuery,
    personasQuery,
    ideasQuery,
    detailsQuery,
    logsQuery,
    selectedIdea,
    logsStats,
    startIdeaGeneration,
    generateIdeasMutation,
    generateScriptMutation,
    generateCaptionMutation,
    generateImagePromptMutation,
    generateVideoPromptMutation,
    generateImageMutation,
    generateVideoMutation,
    clearIdeasMutation,
    clearLogsMutation,
    removeIdeaMutation,
    removeLogMutation,
  }
}

export type IdeasLabController = ReturnType<typeof useIdeasLabController>
export type IdeasLabIdea = Idea
