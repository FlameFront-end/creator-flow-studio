import { Paper, Stack, Tabs, Title } from '@mantine/core'
import { PersonasSection } from './components/PersonasSection'
import { PolicyRulesSection } from './components/PolicyRulesSection'
import { PromptPreviewSection } from './components/PromptPreviewSection'
import { PromptTemplatesSection } from './components/PromptTemplatesSection'

export function PromptStudioPage() {
  return (
    <Paper className="panel-surface" radius={28} p="xl">
      <Stack gap="md">
        <Title order={3}>Промпт-студия</Title>
        <Tabs defaultValue="personas" variant="outline" className="studio-tabs">
          <Tabs.List>
            <Tabs.Tab value="personas">Персонажи</Tabs.Tab>
            <Tabs.Tab value="rules">Правила</Tabs.Tab>
            <Tabs.Tab value="templates">Шаблоны</Tabs.Tab>
            <Tabs.Tab value="preview">Предпросмотр</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="personas" pt="md">
            <PersonasSection />
          </Tabs.Panel>

          <Tabs.Panel value="rules" pt="md">
            <PolicyRulesSection />
          </Tabs.Panel>

          <Tabs.Panel value="templates" pt="md">
            <PromptTemplatesSection />
          </Tabs.Panel>

          <Tabs.Panel value="preview" pt="md">
            <PromptPreviewSection />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Paper>
  )
}
