import { Box, Container, SimpleGrid, Stack } from '@ui/core'
import { AboutHero } from '../components/AboutHero'
import { FaqSection } from '../components/FaqSection'
import { GlossarySection } from '../components/GlossarySection'
import { LmStudioGuideSection } from '../components/LmStudioGuideSection'
import { QuickStartSection } from '../components/QuickStartSection'
import { ScenariosSection } from '../components/ScenariosSection'
import { StatusesSection } from '../components/StatusesSection'
import { TroubleshootingSection } from '../components/TroubleshootingSection'

export default function AboutPage() {
  return (
    <Box mih="100vh" py={36}>
      <Container size="xl" className="app-page-container">
        <Stack gap="lg">
          <AboutHero />
          <QuickStartSection />
          <LmStudioGuideSection />
          <ScenariosSection />
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <StatusesSection />
            <TroubleshootingSection />
          </SimpleGrid>
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="lg">
            <FaqSection />
            <GlossarySection />
          </SimpleGrid>
        </Stack>
      </Container>
    </Box>
  )
}

