import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppRoutes } from '../components/AppRoutes'
import { lazyImport } from '../../shared/lib/lazyImport'
import { buildIdeasLabRoute, buildPromptStudioRoute, ROUTES } from '../../shared/model/routes'
import ErrorPage from '../../features/error/ErrorPage'
import NotFoundPage from '../../features/not-found/NotFoundPage'

export const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    element: <AppRoutes />,
    children: [
      {
        path: '/',
        element: <Navigate to={ROUTES.HOME} replace />,
      },
      {
        path: ROUTES.LOGIN,
        lazy: () => lazyImport(() => import('../../features/auth/pages/auth.page')),
      },
      {
        path: ROUTES.HOME,
        element: <Navigate to={ROUTES.DASHBOARD_PROJECTS} replace />,
      },
      {
        path: '/dashboard',
        lazy: () => lazyImport(() => import('../../features/dashboard/pages/dashboard-layout.page')),
        children: [
          {
            path: 'projects',
            lazy: () => lazyImport(() => import('../../features/dashboard/pages/dashboard-projects.page')),
          },
          {
            path: 'prompt-studio',
            element: <Navigate to={buildPromptStudioRoute('personas')} replace />,
          },
          {
            path: 'prompt-studio/:workspace',
            lazy: () => lazyImport(() => import('../../features/dashboard/pages/dashboard-prompt-studio.page')),
          },
          {
            path: 'ideas-lab',
            element: <Navigate to={buildIdeasLabRoute('brief')} replace />,
          },
          {
            path: 'ideas-lab/:workspace',
            lazy: () => lazyImport(() => import('../../features/dashboard/pages/dashboard.page')),
          },
        ],
      },
      {
        path: ROUTES.ABOUT,
        lazy: () => lazyImport(() => import('../../features/about/AboutPage')),
      },
      {
        path: ROUTES.POST_DRAFT_EXPORT,
        lazy: () =>
          lazyImport(
            () => import('../../features/post-drafts/PostDraftExportPage'),
          ),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
