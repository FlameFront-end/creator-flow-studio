import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppRoutes } from '../components/AppRoutes'
import { lazyImport } from '../../shared/lib/lazyImport'
import { ROUTES } from '../../shared/model/routes'
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
        lazy: () => lazyImport(() => import('../../features/dashboard/pages/dashboard.page')),
      },
      {
        path: ROUTES.ABOUT,
        lazy: () => lazyImport(() => import('../../features/about/AboutPage')),
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
