import { Box, Container, Stack } from '@mantine/core'
import { useQueryClient } from '@tanstack/react-query'
import { clearAuthToken } from '../../../shared/lib/auth'
import { IdeasLabPage } from '../../ideas-lab/IdeasLabPage'
import { PromptStudioPage } from '../../prompt-studio/PromptStudioPage'
import { ProjectsPage } from '../../projects/ProjectsPage'
import { DashboardHero } from '../components/DashboardHero'
import { useDashboardView } from '../hooks/useDashboardView'

const DashboardPage = () => {
  const queryClient = useQueryClient()
  const { view, setView } = useDashboardView()

  return (
    <Box mih="100vh" py={36}>
      <Container size="xl" className="app-page-container">
        <Stack gap="lg">
          <DashboardHero
            view={view}
            onViewChange={setView}
            onLogout={() => {
              clearAuthToken()
              queryClient.clear()
            }}
          />

          {view === 'projects' ? <ProjectsPage /> : null}
          {view === 'prompt-studio' ? <PromptStudioPage /> : null}
          {view === 'ideas-lab' ? <IdeasLabPage /> : null}
        </Stack>
      </Container>
    </Box>
  )
}

export default DashboardPage

