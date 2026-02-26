import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../../../shared/api/services/auth.api'
import { clearAuthSession, getRefreshToken } from '../../../shared/lib/auth'
import { ROUTES, type DashboardView } from '../../../shared/model/routes'
import { DashboardHero } from './DashboardHero'

const viewRouteMap: Record<DashboardView, string> = {
  projects: ROUTES.DASHBOARD_PROJECTS,
  'prompt-studio': ROUTES.DASHBOARD_PROMPT_STUDIO,
  'ideas-lab': ROUTES.DASHBOARD_IDEAS_LAB,
}

type DashboardShellProps = {
  view: DashboardView
  navigate: (to: string) => void
  children: ReactNode
}

export const DashboardShell = ({ view, navigate, children }: DashboardShellProps) => {
  const queryClient = useQueryClient()

  return (
    <section className="min-h-screen py-9">
      <div className="container app-page-container">
        <div className="flex flex-col gap-6">
          <DashboardHero
            view={view}
            onViewChange={(nextView) => navigate(viewRouteMap[nextView])}
            onLogout={() => {
              const refreshToken = getRefreshToken()
              if (refreshToken) {
                void authApi.logout({ refreshToken }).catch(() => undefined)
              }
              clearAuthSession()
              queryClient.clear()
            }}
          />
          {children}
        </div>
      </div>
    </section>
  )
}
