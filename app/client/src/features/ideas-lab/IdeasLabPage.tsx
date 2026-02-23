import { SimpleGrid, Stack } from '@mantine/core'
import { AiLogsPanel } from './components/AiLogsPanel'
import { IdeaResultsPanel } from './components/IdeaResultsPanel'
import { IdeasGenerationPanel } from './components/IdeasGenerationPanel'
import { IdeasLabModals } from './components/IdeasLabModals'
import { IdeasListPanel } from './components/IdeasListPanel'
import { useIdeasLabController } from './hooks/useIdeasLabController'

export function IdeasLabPage() {
  const controller = useIdeasLabController()

  return (
    <Stack gap="md">
      <IdeasGenerationPanel controller={controller} />

      <SimpleGrid cols={{ base: 1, lg: 2 }}>
        <IdeasListPanel controller={controller} />
        <IdeaResultsPanel controller={controller} />
      </SimpleGrid>

      <AiLogsPanel controller={controller} />
      <IdeasLabModals controller={controller} />
    </Stack>
  )
}

