import { Alert, Code, Divider, Paper, Stack } from '@ui/core'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '../../shared/model/routes'
import { ErrorActions } from './components/ErrorActions'
import { ErrorHeader } from './components/ErrorHeader'
import { ErrorMeta } from './components/ErrorMeta'
import { useErrorPageController } from './hooks/useErrorPageController'

export default function ErrorPage() {
  const navigate = useNavigate()
  const controller = useErrorPageController()

  return (
    <Paper className="panel-surface error-page-shell" radius={24} p="xl" maw={980} mx="auto" mt={40}>
      <Stack gap="lg">
        <ErrorHeader message={controller.message} isModuleLoadError={controller.isModuleLoadError} />

        <ErrorMeta pathname={controller.location.pathname} error={controller.error} />

        {controller.isModuleLoadError ? (
          <Alert color="orange" variant="light" title="Рекомендация">
            Похоже на ошибку chunk/module. Обычно помогает очистка кеша и перезагрузка.
          </Alert>
        ) : null}

        <ErrorActions
          isModuleLoadError={controller.isModuleLoadError}
          copyState={controller.copyState}
          onReload={controller.reload}
          onClearCacheAndReload={controller.clearCacheAndReload}
          onToggleDetails={() => controller.setShowDetails((prev) => !prev)}
          onCopyDetails={controller.copyDetails}
          onGoHome={() => navigate(ROUTES.HOME, { replace: true })}
          showDetails={controller.showDetails}
        />

        <Divider opacity={0.4} />

        {controller.showDetails ? (
          <Paper className="inner-surface error-details" radius="md" p="sm">
            <Code block>{controller.detailsString}</Code>
          </Paper>
        ) : null}
      </Stack>
    </Paper>
  )
}


