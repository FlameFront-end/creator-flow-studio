import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { clearAuthToken } from '../../../shared/lib/auth'
import { ROUTES } from '../../../shared/model/routes'
import { DashboardHero } from './DashboardHero'

export type AdminView = 'projects' | 'prompt-studio' | 'ideas-lab'

const viewRouteMap: Record<AdminView, string> = {
  projects: ROUTES.DASHBOARD_PROJECTS,
  'prompt-studio': ROUTES.DASHBOARD_PROMPT_STUDIO,
  'ideas-lab': ROUTES.DASHBOARD_IDEAS_LAB,
}

type DashboardShellProps = {
  view: AdminView
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
              clearAuthToken()
              queryClient.clear()
            }}
          />
          {children}
        </div>
      </div>
    </section>
  )
}
