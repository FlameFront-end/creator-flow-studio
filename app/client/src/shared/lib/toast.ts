import { toast } from 'sonner'
import { getErrorMessage } from './httpError'

export const showSuccessToast = (message: string, title = 'Успех') => {
  toast.success(title, {
    description: message,
  })
}

export const showErrorToast = (error: unknown, fallback: string, title = 'Ошибка') => {
  toast.error(title, {
    description: getErrorMessage(error, fallback),
  })
}

export const showValidationToast = (message: string, title = 'Проверьте форму') => {
  toast.warning(title, {
    description: message,
  })
}
