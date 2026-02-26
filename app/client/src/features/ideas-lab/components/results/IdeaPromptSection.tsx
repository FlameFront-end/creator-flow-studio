import { Card, Group, Loader, Text, Title } from '@ui/core'
import { AppInlineErrorAlert } from '../../../../shared/components/AppInlineErrorAlert'

type IdeaPromptSectionProps = {
  title: string
  prompt: string | null
  pending: boolean
  error: string | null
  emptyText: string
}

export const IdeaPromptSection = ({
  title,
  prompt,
  pending,
  error,
  emptyText,
}: IdeaPromptSectionProps) => (
  <div className="ideas-results-section">
    <Title order={5} className="ideas-results-section-title">
      {title}
    </Title>
    <Card withBorder radius="md" p="md" className="ideas-results-card">
      {pending ? (
        <Group justify="center" py="xl">
          <Loader size={25} />
        </Group>
      ) : (
        <Text size="sm" c={prompt ? undefined : 'dimmed'}>
          {prompt ?? emptyText}
        </Text>
      )}
    </Card>
    {error ? (
      <AppInlineErrorAlert>
        <Text size="sm" lineClamp={3}>
          {error}
        </Text>
      </AppInlineErrorAlert>
    ) : null}
  </div>
)
