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
} from '../model/ideasLab.constants'

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
    window.localStorage.setItem(
      IDEAS_LOGS_COLLAPSED_STORAGE_KEY,
      isLogsCollapsed ? '1' : '0',
    )
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
    if (!selectedIdeaId && ideasQuery.data?.length) {
      setSelectedIdeaId(ideasQuery.data[0].id)
    }
  }, [selectedIdeaId, ideasQuery.data])

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
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕСЃС‚Р°РІРёС‚СЊ Р·Р°РґР°С‡Сѓ РІ РѕС‡РµСЂРµРґСЊ'),
  })

  const generateScriptMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateScript(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕСЃС‚Р°РІРёС‚СЊ СЃС†РµРЅР°СЂРёР№ РІ РѕС‡РµСЂРµРґСЊ'),
  })

  const generateCaptionMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateCaption(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕСЃС‚Р°РІРёС‚СЊ РїРѕРґРїРёСЃСЊ РІ РѕС‡РµСЂРµРґСЊ'),
  })

  const generateImagePromptMutation = useMutation({
    mutationFn: (ideaId: string) => ideasApi.generateImagePrompt(ideaId),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ СЃРіРµРЅРµСЂРёСЂРѕРІР°С‚СЊ image prompt'),
  })

  const generateImageMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateImage(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕСЃС‚Р°РІРёС‚СЊ РіРµРЅРµСЂР°С†РёСЋ РєР°СЂС‚РёРЅРєРё РІ РѕС‡РµСЂРµРґСЊ'),
  })

  const generateVideoMutation = useMutation({
    mutationFn: (payload: { ideaId: string; regenerate: boolean }) =>
      ideasApi.generateVideo(payload.ideaId, { regenerate: payload.regenerate }),
    onSuccess: invalidateAll,
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕСЃС‚Р°РІРёС‚СЊ РіРµРЅРµСЂР°С†РёСЋ РІРёРґРµРѕ РІ РѕС‡РµСЂРµРґСЊ'),
  })

  const clearIdeasMutation = useMutation({
    mutationFn: (currentProjectId: string) => ideasApi.clearIdeas(currentProjectId),
    onSuccess: () => {
      setSelectedIdeaId(null)
      setClearIdeasModalOpen(false)
      invalidateAll()
    },
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‡РёСЃС‚РёС‚СЊ СЃРїРёСЃРѕРє РёРґРµР№'),
  })

  const clearLogsMutation = useMutation({
    mutationFn: (currentProjectId: string) => ideasApi.clearLogs(currentProjectId),
    onSuccess: () => {
      setClearLogsModalOpen(false)
      invalidateAll()
    },
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‡РёСЃС‚РёС‚СЊ AI-Р»РѕРіРё'),
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
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ РёРґРµСЋ'),
  })

  const removeLogMutation = useMutation({
    mutationFn: (logId: string) => ideasApi.removeLog(logId),
    onSuccess: () => {
      setDeleteLogId(null)
      invalidateAll()
    },
    onError: (error) => showErrorToast(error, 'РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ Р»РѕРі'),
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
      showValidationToast('Р’С‹Р±РµСЂРёС‚Рµ РїСЂРѕРµРєС‚, РїРµСЂСЃРѕРЅР°Р¶Р° Рё Р·Р°РїРѕР»РЅРёС‚Рµ С‚РµРјСѓ')
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

