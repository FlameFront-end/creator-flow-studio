import { Box, Loader } from '@mantine/core'
import { memo } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { ROUTES } from '../../shared/model/routes'
import { useAuthToken } from '../../shared/lib/auth'

export const AppRoutes = memo(() => {
  const location = useLocation()
  const token = useAuthToken()

  if (token === undefined) {
    return (
      <Box mih="100vh" style={{ display: 'grid', placeItems: 'center' }}>
        <Loader size="lg" />
      </Box>
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
