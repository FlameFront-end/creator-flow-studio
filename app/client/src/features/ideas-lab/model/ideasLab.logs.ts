import type { AiRunLog } from '../../../shared/api/services/ideas.api'

export const getIdeasLogsStats = (logs: AiRunLog[]) => ({
  total: logs.length,
  successCount: logs.filter((log) => log.status === 'succeeded').length,
  failedCount: logs.filter((log) => log.status === 'failed').length,
  avgLatencyMs: logs.length
    ? Math.round(logs.reduce((acc, log) => acc + (log.latencyMs ?? 0), 0) / logs.length)
    : 0,
  totalTokens: logs.reduce((acc, log) => acc + (log.tokens ?? 0), 0),
})
