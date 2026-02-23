import { Button, Group, Modal, Stack, Text } from '@mantine/core'

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
    <Modal opened={opened} onClose={onClose} centered title={title} radius="md">
      <Stack gap="md">
        <Text>{message}</Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button color={confirmColor} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </Group>
      </Stack>
    </Modal>
  )
}

