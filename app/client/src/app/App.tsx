import { RouterProvider } from 'react-router-dom'
import { ErrorBoundary } from '../shared/components/ErrorBoundary'
import { AppProviders } from './providers/AppProviders'
import { router } from './model/router'

export const App = () => {
  return (
    <ErrorBoundary>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </ErrorBoundary>
  )
}
