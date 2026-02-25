import { ConfirmActionModal } from '../../../shared/components/ConfirmActionModal'
import type { IdeasLabController } from '../hooks/useIdeasLabController'

export const IdeasLabModals = ({ controller }: { controller: IdeasLabController }) => {
  return (
    <>
      <ConfirmActionModal
        opened={controller.clearIdeasModalOpen}
        title="Очистить список идей?"
        message="Будут удалены все идеи выбранного проекта вместе со сценариями, подписями и ассетами."
        confirmLabel="Очистить идеи"
        loading={controller.clearIdeasMutation.isPending}
        onClose={() => controller.setClearIdeasModalOpen(false)}
        onConfirm={() => controller.projectId && controller.clearIdeasMutation.mutate(controller.projectId)}
      />

      <ConfirmActionModal
        opened={controller.clearLogsModalOpen}
        title="Очистить AI-логи?"
        message="Будут удалены все AI-логи выбранного проекта."
        confirmLabel="Очистить логи"
        loading={controller.clearLogsMutation.isPending}
        onClose={() => controller.setClearLogsModalOpen(false)}
        onConfirm={() => controller.projectId && controller.clearLogsMutation.mutate(controller.projectId)}
      />

      <ConfirmActionModal
        opened={Boolean(controller.deleteIdeaId)}
        title="Удалить идею?"
        message="Идея, ее сценарии, подписи и ассеты будут удалены."
        confirmLabel="Удалить идею"
        loading={controller.removeIdeaMutation.isPending}
        onClose={() => controller.setDeleteIdeaId(null)}
        onConfirm={() => controller.deleteIdeaId && controller.removeIdeaMutation.mutate(controller.deleteIdeaId)}
      />
    </>
  )
}
