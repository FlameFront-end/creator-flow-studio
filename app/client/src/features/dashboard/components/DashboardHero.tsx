import { useColorScheme } from '@ui/core'
import { IconBook2, IconLogout2, IconMoonStars, IconSun } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { AppButton } from '../../../shared/components/AppButton'
import { AppTabs } from '../../../shared/components/AppTabs'
import { ROUTES, type AdminView } from '../../../shared/model/routes'

type DashboardHeroProps = {
  view: AdminView
  onViewChange: (nextView: AdminView) => void
  onLogout: () => void
}

export const DashboardHero = ({ view, onViewChange, onLogout }: DashboardHeroProps) => {
  const navigate = useNavigate()
  const { colorScheme, setColorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'

  return (
    <div className="hero-surface p-6 md:p-8">
      <div className="dashboard-hero flex flex-col gap-6">
        <div className="dashboard-hero-top flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="dashboard-hero-copy flex-1 space-y-2">
            <h1 className="dashboard-hero-title text-2xl font-semibold tracking-tight md:text-3xl">
              Панель управления контентом
            </h1>
            <p className="dashboard-hero-subtitle text-sm text-muted-foreground md:text-base">
              Проекты и генерация контента в едином потоке. Системные настройки ИИ вынесены отдельно.
            </p>
          </div>

          <div className="dashboard-hero-actions flex flex-wrap items-center justify-end gap-2">
            <AppButton
              variant="subtle"
              buttonVariant="text"
              aria-label={isDark ? 'Переключить на светлую' : 'Переключить на тёмную'}
              title={isDark ? 'Переключить на светлую' : 'Переключить на тёмную'}
              onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
              className="h-10 w-10 rounded-full p-0"
            >
              {isDark ? <IconSun size={18} /> : <IconMoonStars size={18} />}
            </AppButton>

            <AppButton
              leftSection={<IconBook2 size={16} />}
              variant="default"
              onClick={() => navigate(ROUTES.ABOUT)}
            >
              Инструкция
            </AppButton>

            <AppButton
              leftSection={<IconLogout2 size={16} />}
              variant="light"
              color="red"
              onClick={onLogout}
            >
              Выйти
            </AppButton>
          </div>
        </div>

        <div className="dashboard-hero-switch-wrap w-full overflow-x-auto">
          <AppTabs
            className="dashboard-hero-switch dashboard-hero-tabs"
            value={view}
            onChange={(value) => {
              if (!value) return
              onViewChange(value as AdminView)
            }}
            items={[
              { label: 'Проекты', value: 'projects' },
              { label: 'Настройки ИИ', value: 'prompt-studio' },
              { label: 'Идеи и сценарии', value: 'ideas-lab' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
