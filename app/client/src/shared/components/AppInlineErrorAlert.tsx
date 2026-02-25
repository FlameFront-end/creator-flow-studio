import { Alert } from '@ui/core'
import { IconAlertCircle } from '@tabler/icons-react'
import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

type AppInlineErrorAlertProps = {
  children: ReactNode
  title?: ReactNode
  className?: string
}

export const AppInlineErrorAlert = ({
  children,
  title = 'Ошибка',
  className,
}: AppInlineErrorAlertProps) => (
  <Alert
    color="red"
    variant="light"
    title={title}
    icon={<IconAlertCircle size={16} />}
    className={cn('app-inline-error-alert', className)}
  >
    {children}
  </Alert>
)


