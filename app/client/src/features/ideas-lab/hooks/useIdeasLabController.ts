import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { ideasApi, type Idea, type IdeaFormat } from '../../../shared/api/services/ideas.api'
import { personasApi } from '../../../shared/api/services/personas.api'
import { projectsApi } from '../../../shared/api/services/projects.api'
import { showErrorToast, showValidationToast } from '../../../shared/lib/toast'
import {
  PERSONAS_QUERY_KEY,
  PROJECTS_QUERY_KEY,
  IDEAS_DEFAULT_COUNT,
  IDEAS_DEFAULT_TOPIC,
  aiLogsQueryKey,
  ideaDetailsQueryKey,
  ideasQueryKey,
} from '../model/ideasLab.constants'
import {
  readIdeasLogsCollapsed,
  readPersistedSelectedIdeaByProject,
  writeIdeasLogsCollapsed,
  writePersistedSelectedIdeaByProject,
} from '../model/ideasLab.storage'
import { getIdeasLogsStats } from '../model/ideasLab.logs'
import { validateStartIdeasGeneration } from '../model/ideasLab.validation'

const isActiveStatus = (status: string | null | undefined): boolean =>
  status === 'queued' || status === 'running'

const hasActiveIdeaGeneration = (idea: Idea): boolean =>
  isActiveStatus(idea.status) ||
  isActiveStatus(idea.latestScript?.status) ||
  isActiveStatus(idea.latestCaption?.status) ||
  isActiveStatus(idea.latestImageStatus) ||
  isActiveStatus(idea.latestVideoStatus)

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
  const [isLogsCollapsed, setIsLogsCollapsed] = useState<boolean>(readIdeasLogsCollapsed)
  const [isWaitingForIdeas, setIsWaitingForIdeas] = useState(false)
  const [ideasGenerationBaselineLogIds, setIdeasGenerationBaselineLogIds] = useState<string[] | null>(null)
  const [ideasGenerationBaselineIdeasCount, setIdeasGenerationBaselineIdeasCount] = useState<number | null>(null)

  const projectsQuery = useQuery({ queryKey: PROJECTS_QUERY_KEY, queryFn: projectsApi.getProjects })
  const personasQuery = useQuery({
    queryKey: [...PERSONAS_QUERY_KEY, projectId],
    queryFn: () => personasApi.getPersonas(projectId ?? undefined),
    enabled: Boolean(projectId),
  })

  useEffect(() => {
    writeIdeasLogsCollapsed(isLogsCollapsed)
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
    queryKey: ideasQueryKey(projectId),
    queryFn: () => ideasApi.getIdeas(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: (query) => {
      if (isWaitingForIdeas) {
        return 1000
      }
      const ideas = (query.state.data as Idea[] | undefined) ?? []
      return ideas.some(hasActiveIdeaGeneration) ? 1000 : false
    },
  })

  const logsQuery = useQuery({
    queryKey: aiLogsQueryKey(projectId),
    queryFn: () => ideasApi.getLogs(projectId as string),
    enabled: Boolean(projectId),
    refetchInterval: () => {
      if (isWaitingForIdeas) {
        return 1000
      }
      const ideas = ideasQuery.data ?? []
      return ideas.some(hasActiveIdeaGeneration) ? 1000 : false
    },
  })

  useEffect(() => {
    if (!isWaitingForIdeas || ideasGenerationBaselineIdeasCount === null) {
      return
    }

    const currentIdeasCount = ideasQuery.data?.length ?? 0
    if (currentIdeasCount <= ideasGenerationBaselineIdeasCount) {
      return
    }

    setIsWaitingForIdeas(false)
    setIdeasGenerationBaselineLogIds(null)
    setIdeasGenerationBaselineIdeasCount(null)
  }, [ideasGenerationBaselineIdeasCount, isWaitingForIdeas, ideasQuery.data])

  useEffect(() => {
    if (!isWaitingForIdeas || ideasGenerationBaselineLogIds === null || !logsQuery.data?.length) {
      return
    }

    const baselineLogIds = new Set(ideasGenerationBaselineLogIds)
    const hasFinalLogForCurrentRequest = logsQuery.data.some((log) => {
      if (log.operation !== 'ideas') {
        return false
      }
      if (baselineLogIds.has(log.id)) {
        return false
      }
      return log.status === 'failed' || log.status === 'succeeded'
    })

    if (!hasFinalLogForCurrentRequest) {
      return
    }

    setIsWaitingForIdeas(false)
    setIdeasGenerationBaselineLogIds(null)
    setIdeasGenerationBaselineIdeasCount(null)
  }, [ideasGenerationBaselineLogIds, isWaitingForIdeas, logsQuery.data])

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
    queryKey: ideaDetailsQueryKey(selectedIdeaId),
    queryFn: () => ideasApi.getIdea(selectedIdeaId as string),
    enabled: Boolean(selectedIdeaId),
    refetchInterval: (query) => {
      const details = query.state.data
      if (!details) {
        return false
      }
      const hasActiveScripts = details.scripts.some((item) => isActiveStatus(item.status))
      const hasActiveCaptions = details.captions.some((item) => isActiveStatus(item.status))
      const hasActiveAssets = details.assets.some((item) => isActiveStatus(item.status))
      return hasActiveScripts || hasActiveCaptions || hasActiveAssets ? 1000 : false
    },
  })

  const invalidateAll = async () => {
    if (projectId) {
      await queryClient.invalidateQueries({ queryKey: ideasQueryKey(projectId) })
      await queryClient.refetchQueries({ queryKey: ideasQueryKey(projectId), type: 'active' })
      await queryClient.invalidateQueries({ queryKey: aiLogsQueryKey(projectId) })
      await queryClient.refetchQueries({ queryKey: aiLogsQueryKey(projectId), type: 'active' })
    }

    if (selectedIdeaId) {
      await queryClient.invalidateQueries({ queryKey: ideaDetailsQueryKey(selectedIdeaId) })
      await queryClient.refetchQueries({ queryKey: ideaDetailsQueryKey(selectedIdeaId), type: 'active' })
    }
  }

  const generateIdeasMutation = useMutation({
    mutationFn: ideasApi.generateIdeas,
    onSuccess: invalidateAll,
    onError: (error) => {
      setIsWaitingForIdeas(false)
      setIdeasGenerationBaselineLogIds(null)
      setIdeasGenerationBaselineIdeasCount(null)
      showErrorToast(error, 'Не удалось поставить задачу в очередь')
    },
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
    onSuccess: async (_, currentProjectId) => {
      const persisted = readPersistedSelectedIdeaByProject()
      if (persisted[currentProjectId]) {
        delete persisted[currentProjectId]
        writePersistedSelectedIdeaByProject(persisted)
      }

      setSelectedIdeaId(null)
      await queryClient.invalidateQueries({ queryKey: ideasQueryKey(currentProjectId) })
      await queryClient.refetchQueries({ queryKey: ideasQueryKey(currentProjectId), type: 'active' })
      await queryClient.invalidateQueries({ queryKey: aiLogsQueryKey(currentProjectId) })
      await queryClient.refetchQueries({ queryKey: aiLogsQueryKey(currentProjectId), type: 'active' })
      setClearIdeasModalOpen(false)
    },
    onError: (error) => showErrorToast(error, 'Не удалось очистить список идей'),
  })

  const clearLogsMutation = useMutation({
    mutationFn: (currentProjectId: string) => ideasApi.clearLogs(currentProjectId),
    onSuccess: async (_, currentProjectId) => {
      await queryClient.invalidateQueries({ queryKey: aiLogsQueryKey(currentProjectId) })
      await queryClient.refetchQueries({ queryKey: aiLogsQueryKey(currentProjectId), type: 'active' })
      setClearLogsModalOpen(false)
    },
    onError: (error) => showErrorToast(error, 'Не удалось очистить AI-логи'),
  })

  const removeIdeaMutation = useMutation({
    mutationFn: (ideaId: string) => ideasApi.removeIdea(ideaId),
    onSuccess: async (_, removedIdeaId) => {
      if (removedIdeaId === selectedIdeaId) {
        setSelectedIdeaId(null)
      }

      if (projectId) {
        const persisted = readPersistedSelectedIdeaByProject()
        if (persisted[projectId] === removedIdeaId) {
          delete persisted[projectId]
          writePersistedSelectedIdeaByProject(persisted)
        }
      }

      if (projectId) {
        await queryClient.invalidateQueries({ queryKey: ideasQueryKey(projectId) })
        await queryClient.refetchQueries({ queryKey: ideasQueryKey(projectId), type: 'active' })
        await queryClient.invalidateQueries({ queryKey: aiLogsQueryKey(projectId) })
        await queryClient.refetchQueries({ queryKey: aiLogsQueryKey(projectId), type: 'active' })
      }

      setDeleteIdeaId(null)
    },
    onError: (error) => showErrorToast(error, 'Не удалось удалить идею'),
  })

  const removeLogMutation = useMutation({
    mutationFn: (logId: string) => ideasApi.removeLog(logId),
    onSuccess: async () => {
      if (projectId) {
        await queryClient.invalidateQueries({ queryKey: aiLogsQueryKey(projectId) })
        await queryClient.refetchQueries({ queryKey: aiLogsQueryKey(projectId), type: 'active' })
      }
      setDeleteLogId(null)
    },
    onError: (error) => showErrorToast(error, 'Не удалось удалить лог'),
  })

  const selectedIdea = useMemo(
    () => ideasQuery.data?.find((idea) => idea.id === selectedIdeaId) ?? null,
    [ideasQuery.data, selectedIdeaId],
  )

  const logsStats = useMemo(() => {
    return getIdeasLogsStats(logsQuery.data ?? [])
  }, [logsQuery.data])

  const startIdeaGeneration = (): boolean => {
    const validated = validateStartIdeasGeneration({
      projectId,
      personaId,
      topic,
      count,
      format,
    })
    if ('error' in validated) {
      showValidationToast(validated.error)
      return false
    }

    generateIdeasMutation.mutate(validated)
    setIdeasGenerationBaselineLogIds(
      (logsQuery.data ?? []).filter((log) => log.operation === 'ideas').map((log) => log.id),
    )
    setIdeasGenerationBaselineIdeasCount(ideasQuery.data?.length ?? 0)
    setIsWaitingForIdeas(true)
    return true
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
    isWaitingForIdeas,
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
