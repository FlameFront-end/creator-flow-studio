import { memo } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Spinner } from '../../shared/components/ui/spinner'
import { ROUTES } from '../../shared/model/routes'
import { useAuthToken } from '../../shared/lib/auth'

export const AppRoutes = memo(() => {
  const location = useLocation()
  const token = useAuthToken()

  if (token === undefined) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Spinner className="h-8 w-8 text-muted-foreground" />
      </div>
    )
  }

  const authenticated = Boolean(token)

  if (!authenticated && !location.pathname.startsWith('/auth/')) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />
  }

  if (authenticated && location.pathname.startsWith('/auth/')) {
    return <Navigate to={ROUTES.HOME} replace />
  }

  return <Outlet />
})
