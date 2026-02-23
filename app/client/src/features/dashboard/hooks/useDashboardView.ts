import { useEffect, useState } from 'react'

export type AdminView = 'projects' | 'prompt-studio' | 'ideas-lab'

const DASHBOARD_VIEW_STORAGE_KEY = 'dashboard_admin_view'

const isAdminView = (value: string | null): value is AdminView =>
  value === 'projects' || value === 'prompt-studio' || value === 'ideas-lab'

export const useDashboardView = () => {
  const [view, setView] = useState<AdminView>(() => {
    if (typeof window === 'undefined') return 'projects'
    const saved = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY)
    return isAdminView(saved) ? saved : 'projects'
  })

  useEffect(() => {
    window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, view)
  }, [view])

  return { view, setView, isAdminView }
}

