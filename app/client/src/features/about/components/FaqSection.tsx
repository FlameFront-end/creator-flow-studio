import { Accordion, Group, Paper, Stack, Text, ThemeIcon, Title } from '@ui/core'
import { aboutIcons, faqItems } from '../model/about.content'

export const FaqSection = () => {
  const FaqIcon = aboutIcons.faq

  return (
    <Paper className="panel-surface" radius={24} p="lg">
      <Stack gap="sm">
        <Group gap="xs">
          <ThemeIcon variant="light" color="yellow" radius="xl">
            <FaqIcon size={16} />
          </ThemeIcon>
          <Title order={4}>Частые вопросы</Title>
        </Group>

        <Accordion variant="separated" radius="md">
          {faqItems.map((item) => (
            <Accordion.Item key={item.question} value={item.question}>
              <Accordion.Control>{item.question}</Accordion.Control>
              <Accordion.Panel>
                <Text size="sm" c="dimmed">
                  {item.answer}
                </Text>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
      </Stack>
    </Paper>
  )
}

