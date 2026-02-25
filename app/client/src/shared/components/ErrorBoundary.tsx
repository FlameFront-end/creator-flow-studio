import { Group, Paper, Stack, Text, Title } from '@ui/core'
import { AppButton } from '../../shared/components/AppButton'
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

type Props = {
  children: ReactNode
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  private handleGoHome = () => {
    window.location.href = '/dashboard'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <Paper className="panel-surface" radius={24} p="xl" maw={720} mx="auto" mt={60}>
          <Stack gap="sm">
            <Title order={3}>Что-то пошло не так</Title>
            <Text c="dimmed">
              {this.state.error?.message ?? 'Произошла непредвиденная ошибка интерфейса'}
            </Text>
            <Group mt="sm">
              <AppButton onClick={this.handleReload}>Перезагрузить страницу</AppButton>
              <AppButton variant="default" onClick={this.handleGoHome}>
                На главную
              </AppButton>
            </Group>
          </Stack>
        </Paper>
      )
    }

    return this.props.children
  }
}

