import { useColorScheme } from '@ui/core'
import { Tooltip } from '@ui/core'
import { IconBook2, IconLogout2, IconMoonStars, IconSun } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppButton } from '../../../shared/components/AppButton'
import { AppTabs } from '../../../shared/components/AppTabs'
import { ROUTES, type DashboardView } from '../../../shared/model/routes'
import {
  AI_MODELS_BY_PROVIDER_UPDATED_EVENT,
  readPersistedModelsByProvider,
} from '../../prompt-studio/model/aiProviderSettings.storage'

type DashboardHeroProps = {
  view: DashboardView
  onViewChange: (nextView: DashboardView) => void
  onLogout: () => void
}

export const DashboardHero = ({ view, onViewChange, onLogout }: DashboardHeroProps) => {
  const navigate = useNavigate()
  const { colorScheme, setColorScheme } = useColorScheme()
  const isDark = colorScheme === 'dark'
  const [hasSavedModels, setHasSavedModels] = useState(() => {
    const models = readPersistedModelsByProvider()
    return (
      (models.openai?.length ?? 0) > 0 ||
      (models.openrouter?.length ?? 0) > 0 ||
      (models['openai-compatible']?.length ?? 0) > 0
    )
  })

  useEffect(() => {
    const syncSavedModels = () => {
      const models = readPersistedModelsByProvider()
      setHasSavedModels(
        (models.openai?.length ?? 0) > 0 ||
          (models.openrouter?.length ?? 0) > 0 ||
          (models['openai-compatible']?.length ?? 0) > 0,
      )
    }

    window.addEventListener(AI_MODELS_BY_PROVIDER_UPDATED_EVENT, syncSavedModels)
    window.addEventListener('storage', syncSavedModels)
    return () => {
      window.removeEventListener(AI_MODELS_BY_PROVIDER_UPDATED_EVENT, syncSavedModels)
      window.removeEventListener('storage', syncSavedModels)
    }
  }, [])

  return (
    <div className="hero-surface p-6 md:p-8">
      <div className="dashboard-hero flex flex-col gap-6">
        <div className="dashboard-hero-top flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="dashboard-hero-copy flex-1 space-y-2">
            <h1 className="dashboard-hero-title text-2xl font-semibold tracking-tight md:text-3xl">
              Панель управления контентом
            </h1>
            <p className="dashboard-hero-subtitle text-sm text-muted-foreground md:text-base">
              Проекты и генерация контента в едином потоке. Настройка ИИ вынесена отдельно.
            </p>
          </div>

          <div className="dashboard-hero-actions flex flex-wrap items-center justify-end gap-2">
            <AppButton
              variant="subtle"
              buttonVariant="text"
              aria-label={isDark ? 'Переключить на светлую' : 'Переключить на тёмную'}
              title={isDark ? 'Переключить на светлую' : 'Переключить на тёмную'}
              onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
              className="theme-toggle-btn h-10 w-10 rounded-full p-0"
              data-theme={colorScheme}
            >
              <span className="theme-toggle-icon theme-toggle-icon-sun" aria-hidden>
                <IconSun size={18} />
              </span>
              <span className="theme-toggle-icon theme-toggle-icon-moon" aria-hidden>
                <IconMoonStars size={18} />
              </span>
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
              onViewChange(value as DashboardView)
            }}
            items={[
              { label: 'Проекты', value: 'projects' },
              { label: 'Настройка ИИ', value: 'prompt-studio' },
              {
                label: 'Модели AI',
                value: 'ai-providers',
                rightSection: !hasSavedModels ? (
                  <Tooltip
                    label="Нет сохранённых моделей"
                    withArrow
                    side="top"
                    sideOffset={10}
                  >
                    <span
                      className="dashboard-tab-alert-dot"
                      aria-label="Нет сохранённых моделей"
                    />
                  </Tooltip>
                ) : undefined,
              },
              { label: 'Идеи и сценарии', value: 'ideas-lab' },
            ]}
          />
        </div>
      </div>
    </div>
  )
}
