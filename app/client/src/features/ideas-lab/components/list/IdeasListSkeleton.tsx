import { Card, Group, Stack } from '@ui/core'
import { IDEA_PIPELINE_STEP_COUNT } from './ideasListPanel.constants'

type IdeasListSkeletonProps = {
  count: number
  scope: 'empty' | 'append'
}

export const IdeasListSkeleton = ({ count, scope }: IdeasListSkeletonProps) => (
  <Stack gap="sm" className="ideas-skeleton-list">
    {Array.from({ length: count }).map((_, index) => (
      <Card
        key={`${scope}-ideas-skeleton-${index}`}
        withBorder
        radius="md"
        p="md"
        className="ideas-skeleton-card"
      >
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start" wrap="nowrap">
            <Stack gap={4} style={{ flex: 1 }}>
              <div className="ideas-skeleton-line ideas-skeleton-line-title" />
              <div className="ideas-skeleton-line ideas-skeleton-line-subtitle" />
              <div className="ideas-skeleton-line ideas-skeleton-line-subtitle ideas-skeleton-line-short" />
            </Stack>
            <div className="ideas-skeleton-pill ideas-skeleton-pill-danger" />
          </Group>

          <Group gap="xs" wrap="wrap">
            <div className="ideas-skeleton-pill" />
            <div className="ideas-skeleton-pill" />
            <div className="ideas-skeleton-pill ideas-skeleton-pill-wide" />
          </Group>

          <Stack gap={6}>
            <Group justify="space-between" wrap="nowrap">
              <div className="ideas-skeleton-line ideas-skeleton-line-caption" />
              <div className="ideas-skeleton-line ideas-skeleton-line-caption ideas-skeleton-line-caption-short" />
            </Group>
            <div className="ideas-skeleton-progress" />
          </Stack>

          <Stack gap={8}>
            {Array.from({ length: IDEA_PIPELINE_STEP_COUNT }).map((_, stepIndex) => (
              <Group
                key={`${scope}-ideas-skeleton-step-${index}-${stepIndex}`}
                justify="space-between"
                wrap="nowrap"
              >
                <Group gap="xs" wrap="nowrap">
                  <div className="ideas-skeleton-dot" />
                  <div className="ideas-skeleton-line ideas-skeleton-line-step" />
                </Group>
                <Group gap="xs" wrap="nowrap">
                  <div className="ideas-skeleton-line ideas-skeleton-line-status" />
                  <div className="ideas-skeleton-pill ideas-skeleton-pill-action" />
                </Group>
              </Group>
            ))}
          </Stack>
        </Stack>
      </Card>
    ))}
  </Stack>
)
