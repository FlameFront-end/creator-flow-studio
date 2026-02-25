import { Group, Paper, SimpleGrid, Stack, Text, ThemeIcon, Title } from '@ui/core'
import { aboutIcons, glossaryItems } from '../model/about.content'

export const GlossarySection = () => {
  const GlossaryIcon = aboutIcons.glossary

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon variant="light" color="teal" radius="xl">
            <GlossaryIcon size={16} />
          </ThemeIcon>
          <Title order={4}>Глоссарий</Title>
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {glossaryItems.map((item) => (
            <Paper key={item.term} className="inner-surface" radius="md" p="sm">
              <Stack gap={4}>
                <Text fw={700} size="sm">
                  {item.term}
                </Text>
                <Text size="sm" c="dimmed">
                  {item.description}
                </Text>
              </Stack>
            </Paper>
          ))}
        </SimpleGrid>
      </Stack>
    </Paper>
  )
}

