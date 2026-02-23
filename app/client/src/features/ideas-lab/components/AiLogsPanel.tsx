import { Badge, Button, Group, Paper, Stack, Text, Tooltip, Title } from '@mantine/core'
import { AppTable } from '../../../shared/components/AppTable'
import { formatRuDateTime, formatRuNumber } from '../../../shared/lib/formatters'
import type { IdeasLabController } from '../hooks/useIdeasLabController'
import { formatOperationLabel, formatStatusLabel, statusColor } from '../lib/ideasLab.formatters'

const formatLatency = (latencyMs: number | null) => {
  if (latencyMs == null) return '-'
  return `${latencyMs} мс`
}

const formatTokens = (tokens: number | null) => {
  if (tokens == null) return '-'
  return formatRuNumber(tokens)
}

export const AiLogsPanel = ({ controller }: { controller: IdeasLabController }) => {
  const { logsStats, logsQuery } = controller
  const logs = logsQuery.data ?? []
  const hasLogs = logs.length > 0
  const showClearLogsButton = Boolean(controller.projectId) && hasLogs

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="sm">
        <Group justify="space-between" align="center" wrap="wrap">
          <Title order={4}>Логи прогонов AI</Title>
          <Group gap="xs" wrap="wrap" justify="flex-end">
            <Badge variant="light">Всего: {logsStats.total}</Badge>
            <Badge color="green" variant="light">
              Успех: {logsStats.successCount}
            </Badge>
            <Badge color="red" variant="light">
              Ошибка: {logsStats.failedCount}
            </Badge>
            <Badge color="cyan" variant="light">
              Средняя задержка: {logsStats.avgLatencyMs} мс
            </Badge>
            <Badge color="grape" variant="light">
              Токены: {formatRuNumber(logsStats.totalTokens)}
            </Badge>
            <Button size="xs" variant="default" onClick={() => controller.setIsLogsCollapsed((prev) => !prev)}>
              {controller.isLogsCollapsed ? 'Развернуть таблицу' : 'Свернуть таблицу'}
            </Button>
            {showClearLogsButton ? (
              <Button
                size="xs"
                variant="default"
                color="red"
                disabled={controller.clearLogsMutation.isPending}
                onClick={() => controller.setClearLogsModalOpen(true)}
              >
                Очистить логи
              </Button>
            ) : null}
          </Group>
        </Group>

        {controller.isLogsCollapsed ? (
          <Text c="dimmed">Таблица логов свернута</Text>
        ) : !hasLogs ? (
          <Text c="dimmed">Логи пока пустые</Text>
        ) : (
          <div className="table-x-scroll">
            <AppTable className="ai-logs-table">
              <AppTable.Thead>
                <AppTable.Tr>
                  <AppTable.Th>Время</AppTable.Th>
                  <AppTable.Th>Операция</AppTable.Th>
                  <AppTable.Th>Статус</AppTable.Th>
                  <AppTable.Th>Модель</AppTable.Th>
                  <AppTable.Th>Токены</AppTable.Th>
                  <AppTable.Th>Задержка</AppTable.Th>
                  <AppTable.Th>Request ID</AppTable.Th>
                  <AppTable.Th>Ошибка</AppTable.Th>
                  <AppTable.Th />
                </AppTable.Tr>
              </AppTable.Thead>
              <AppTable.Tbody>
                {logs.map((log) => (
                  <AppTable.Tr key={log.id}>
                    <AppTable.Td>{formatRuDateTime(log.createdAt)}</AppTable.Td>
                    <AppTable.Td>{formatOperationLabel(log.operation)}</AppTable.Td>
                    <AppTable.Td>
                      <Badge color={statusColor[log.status] ?? 'gray'}>{formatStatusLabel(log.status)}</Badge>
                    </AppTable.Td>
                    <AppTable.Td>
                      <Stack gap={2}>
                        <Text size="sm">{log.model}</Text>
                        <Text size="xs" c="dimmed">
                          {log.provider}
                        </Text>
                      </Stack>
                    </AppTable.Td>
                    <AppTable.Td>{formatTokens(log.tokens)}</AppTable.Td>
                    <AppTable.Td>{formatLatency(log.latencyMs)}</AppTable.Td>
                    <AppTable.Td>
                      {log.requestId ? (
                        <Tooltip label={log.requestId} withArrow>
                          <Text size="sm" c="dimmed">
                            {log.requestId.slice(0, 12)}...
                          </Text>
                        </Tooltip>
                      ) : (
                        '-'
                      )}
                    </AppTable.Td>
                    <AppTable.Td>{log.error ?? '-'}</AppTable.Td>
                    <AppTable.Td>
                      <Button size="xs" color="red" variant="subtle" onClick={() => controller.setDeleteLogId(log.id)}>
                        Удалить
                      </Button>
                    </AppTable.Td>
                  </AppTable.Tr>
                ))}
              </AppTable.Tbody>
            </AppTable>
          </div>
        )}
      </Stack>
    </Paper>
  )
}
