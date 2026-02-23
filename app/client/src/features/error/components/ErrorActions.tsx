import { Button, Group } from '@mantine/core'
import { IconCopy, IconRefresh } from '@tabler/icons-react'

type ErrorActionsProps = {
  isModuleLoadError: boolean
  copyState: 'idle' | 'ok' | 'error'
  onReload: () => void
  onClearCacheAndReload: () => void
  onToggleDetails: () => void
  onCopyDetails: () => void
  onGoHome: () => void
  showDetails: boolean
}

export const ErrorActions = ({
  isModuleLoadError,
  copyState,
  onReload,
  onClearCacheAndReload,
  onToggleDetails,
  onCopyDetails,
  onGoHome,
  showDetails,
}: ErrorActionsProps) => {
  return (
    <Group gap="sm" wrap="wrap">
      <Button leftSection={<IconRefresh size={16} />} onClick={isModuleLoadError ? onClearCacheAndReload : onReload}>
        {isModuleLoadError ? 'Очистить кеш и перезагрузить' : 'Перезагрузить'}
      </Button>
      <Button variant="default" onClick={onGoHome}>На главную</Button>
      <Button variant="subtle" onClick={onToggleDetails}>
        {showDetails ? 'Скрыть детали' : 'Показать детали'}
      </Button>
      <Button variant="subtle" leftSection={<IconCopy size={15} />} onClick={onCopyDetails}>
        {copyState === 'idle' ? 'Скопировать детали' : copyState === 'ok' ? 'Скопировано' : 'Ошибка копирования'}
      </Button>
    </Group>
  )
}

