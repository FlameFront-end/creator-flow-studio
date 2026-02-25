import { AppButton } from './AppButton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'

type ConfirmActionModalProps = {
  opened: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: string
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmActionModal({
  opened,
  title,
  message,
  confirmLabel = 'Удалить',
  cancelLabel = 'Отмена',
  confirmColor = 'red',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmActionModalProps) {
  return (
    <AlertDialog
      open={opened}
      onOpenChange={(nextState) => {
        if (!nextState) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{message}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <AppButton variant="default" onClick={onClose} disabled={loading}>
              {cancelLabel}
            </AppButton>
          </AlertDialogCancel>

          <AlertDialogAction asChild>
            <AppButton color={confirmColor} onClick={onConfirm} loading={loading}>
              {confirmLabel}
            </AppButton>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
