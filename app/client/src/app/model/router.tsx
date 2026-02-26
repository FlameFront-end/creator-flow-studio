import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppRoutes } from '../components/AppRoutes'
import { lazyImport } from '../../shared/lib/lazyImport'
import {
  buildIdeasLabRoute,
  buildPromptStudioRoute,
  DASHBOARD_CHILD_PATHS,
  ROUTE_PATHS,
  ROUTES,
} from '../../shared/model/routes'
import ErrorPage from '../../features/error/pages/error.page'
import NotFoundPage from '../../features/not-found/pages/not-found.page'

export const router = createBrowserRouter([
  {
    errorElement: <ErrorPage />,
    element: <AppRoutes />,
    children: [
      {
        path: ROUTE_PATHS.ROOT,
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
        path: ROUTES.HOME,
        lazy: () => lazyImport(() => import('../../features/dashboard/pages/dashboard-layout.page')),
        children: [
          {
            path: DASHBOARD_CHILD_PATHS.PROJECTS,
            lazy: () =>
              lazyImport(() =>
                import('../../features/projects/pages/projects.page').then((module) => ({
                  default: module.ProjectsPage,
                })),
              ),
          },
          {
            path: DASHBOARD_CHILD_PATHS.PROMPT_STUDIO,
            element: <Navigate to={buildPromptStudioRoute('personas')} replace />,
          },
          {
            path: DASHBOARD_CHILD_PATHS.PROMPT_STUDIO_WORKSPACE,
            lazy: () =>
              lazyImport(() =>
                import('../../features/prompt-studio/pages/prompt-studio.page').then((module) => ({
                  default: module.PromptStudioPage,
                })),
              ),
          },
          {
            path: DASHBOARD_CHILD_PATHS.AI_PROVIDERS,
            lazy: () =>
              lazyImport(() =>
                import('../../features/ai-providers/pages/ai-providers.page').then((module) => ({
                  default: module.AiProvidersPage,
                })),
              ),
          },
          {
            path: DASHBOARD_CHILD_PATHS.IDEAS_LAB,
            element: <Navigate to={buildIdeasLabRoute('brief')} replace />,
          },
          {
            path: DASHBOARD_CHILD_PATHS.IDEAS_LAB_WORKSPACE,
            lazy: () =>
              lazyImport(() =>
                import('../../features/ideas-lab/pages/ideas-lab.page').then((module) => ({
                  default: module.IdeasLabPage,
                })),
              ),
          },
        ],
      },
      {
        path: ROUTES.ABOUT,
        lazy: () => lazyImport(() => import('../../features/about/pages/about.page')),
      },
      {
        path: ROUTES.POST_DRAFT_EXPORT,
        lazy: () =>
          lazyImport(
            () => import('../../features/post-drafts/pages/post-draft-export.page'),
          ),
      },
      {
        path: ROUTE_PATHS.WILDCARD,
        element: <NotFoundPage />,
      },
    ],
  },
])
