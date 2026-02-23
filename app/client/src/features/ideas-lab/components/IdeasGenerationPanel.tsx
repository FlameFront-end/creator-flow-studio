import { Button, Group, Paper, Select, SimpleGrid, Stack, Textarea, TextInput, Title } from '@mantine/core'
import type { IdeasLabController } from '../hooks/useIdeasLabController'

export const IdeasGenerationPanel = ({ controller }: { controller: IdeasLabController }) => {
  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>Идеи и сценарии</Title>
        <SimpleGrid cols={{ base: 1, md: 3 }}>
          <Select
            label="Проект"
            value={controller.projectId}
            onChange={controller.setProjectId}
            data={(controller.projectsQuery.data ?? []).map((project) => ({
              value: project.id,
              label: project.name,
            }))}
            searchable
            placeholder="Выберите проект"
          />
          <Select
            label="Персонаж"
            value={controller.personaId}
            onChange={controller.setPersonaId}
            data={(controller.personasQuery.data ?? []).map((persona) => ({
              value: persona.id,
              label: persona.name,
            }))}
            searchable
            placeholder="Выберите персонажа"
          />
          <Select
            label="Формат"
            value={controller.format}
            onChange={(value) => controller.setFormat((value as typeof controller.format) ?? 'reel')}
            data={[
              { value: 'reel', label: 'Reel' },
              { value: 'short', label: 'Short' },
              { value: 'tiktok', label: 'TikTok' },
            ]}
            allowDeselect={false}
          />
        </SimpleGrid>

        <Textarea
          label="Тема"
          value={controller.topic}
          onChange={(event) => controller.setTopic(event.currentTarget.value)}
          minRows={2}
          autosize
        />

        <Group justify="space-between" align="end">
          <TextInput
            label="Количество идей"
            value={controller.count}
            onChange={(event) => controller.setCount(event.currentTarget.value)}
            w={260}
          />
          <Button
            loading={controller.generateIdeasMutation.isPending}
            onClick={controller.startIdeaGeneration}
            disabled={!controller.projectId || !controller.personaId}
          >
            Сгенерировать идеи
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}

