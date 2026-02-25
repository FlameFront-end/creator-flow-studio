import { Group } from '@ui/core'

import { AppButton } from '../../../shared/components/AppButton'
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
      <AppButton leftSection={<IconRefresh size={16} />} onClick={isModuleLoadError ? onClearCacheAndReload : onReload}>
        {isModuleLoadError ? 'Очистить кеш и перезагрузить' : 'Перезагрузить'}
      </AppButton>
      <AppButton variant="default" onClick={onGoHome}>На главную</AppButton>
      <AppButton variant="subtle" onClick={onToggleDetails}>
        {showDetails ? 'Скрыть детали' : 'Показать детали'}
      </AppButton>
      <AppButton variant="subtle" leftSection={<IconCopy size={15} />} onClick={onCopyDetails}>
        {copyState === 'idle' ? 'Скопировать детали' : copyState === 'ok' ? 'Скопировано' : 'Ошибка копирования'}
      </AppButton>
    </Group>
  )
}





