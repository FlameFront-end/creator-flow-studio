import { Alert, Badge, Button, Card, Group, Image, Paper, Stack, Text, Title } from '@mantine/core'
import { formatRuDateTime } from '../../../shared/lib/formatters'
import type { IdeasLabController } from '../hooks/useIdeasLabController'
import { formatStatusLabel, resolveAssetUrl, statusColor } from '../lib/ideasLab.formatters'

export const IdeaResultsPanel = ({ controller }: { controller: IdeasLabController }) => {
  const { selectedIdea, detailsQuery, generateImagePromptMutation } = controller

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="sm">
        <Title order={4}>Результаты по идее</Title>
        {!selectedIdea ? (
          <Text c="dimmed">Выберите идею слева</Text>
        ) : (
          <>
            <Text fw={600}>{selectedIdea.topic}</Text>
            <Text size="sm" c="dimmed">{selectedIdea.hook}</Text>

            <Title order={5}>Image prompt</Title>
            <Card withBorder radius="md">
              <Stack gap={6}>
                <Text size="sm" c={selectedIdea.imagePrompt ? undefined : 'dimmed'}>
                  {selectedIdea.imagePrompt ?? 'Промпт еще не сгенерирован'}
                </Text>
                <Button size="xs" onClick={() => generateImagePromptMutation.mutate(selectedIdea.id)}>
                  {selectedIdea.imagePrompt ? 'Перегенерировать prompt' : 'Сгенерировать prompt'}
                </Button>
              </Stack>
            </Card>

            <Title order={5}>Ассеты</Title>
            {!detailsQuery.data?.assets.length ? (
              <Text c="dimmed">Ассеты пока не сгенерированы</Text>
            ) : (
              detailsQuery.data.assets.map((asset) => (
                <Card key={asset.id} withBorder radius="md">
                  <Stack gap={6}>
                    <Group justify="space-between">
                      <Text size="sm" fw={600}>
                        {asset.type.toUpperCase()} • {formatRuDateTime(asset.createdAt)}
                      </Text>
                      <Badge color={statusColor[asset.status] ?? 'gray'}>{formatStatusLabel(asset.status)}</Badge>
                    </Group>
                    {asset.sourcePrompt ? <Text size="xs" c="dimmed" lineClamp={3}>{asset.sourcePrompt}</Text> : null}
                    {asset.type === 'image' && asset.url ? (
                      <Image src={resolveAssetUrl(asset.url)} alt="Generated asset" radius="sm" />
                    ) : null}
                    {asset.type === 'video' && asset.url ? (
                      <video
                        src={resolveAssetUrl(asset.url) ?? ''}
                        controls
                        preload="metadata"
                        style={{ width: '100%', borderRadius: 8 }}
                      />
                    ) : null}
                    {asset.url ? <Text size="xs" c="dimmed" lineClamp={1}>{asset.url}</Text> : null}
                    {asset.error ? <Alert color="red">{asset.error}</Alert> : null}
                  </Stack>
                </Card>
              ))
            )}
          </>
        )}
      </Stack>
    </Paper>
  )
}

