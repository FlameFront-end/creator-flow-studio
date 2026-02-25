import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DashboardShell, type AdminView } from '../components/DashboardShell'

const resolveViewByPathname = (pathname: string): AdminView => {
  if (pathname.startsWith('/dashboard/projects')) return 'projects'
  if (pathname.startsWith('/dashboard/prompt-studio')) return 'prompt-studio'
  return 'ideas-lab'
}

const DashboardLayoutPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const view = resolveViewByPathname(location.pathname)

  return (
    <DashboardShell view={view} navigate={navigate}>
      <Outlet />
    </DashboardShell>
  )
}

export default DashboardLayoutPage
