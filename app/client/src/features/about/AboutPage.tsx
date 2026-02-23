import { Box, Container, SimpleGrid, Stack } from '@mantine/core'
import { AboutHero } from './components/AboutHero'
import { QuickStartSection } from './components/QuickStartSection'
import { StatusesSection } from './components/StatusesSection'
import { TroubleshootingSection } from './components/TroubleshootingSection'

export default function AboutPage() {
  return (
    <Box mih="100vh" py={36}>
      <Container size="xl" className="app-page-container">
        <Stack gap="lg">
          <AboutHero />
          <QuickStartSection />
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <StatusesSection />
            <TroubleshootingSection />
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  )
}

