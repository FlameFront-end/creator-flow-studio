import { notifications } from '@mantine/notifications'
import { getErrorMessage } from './httpError'

export const showSuccessToast = (message: string, title = 'Успех') => {
  notifications.show({
    color: 'green',
    title,
    message,
  })
}

export const showErrorToast = (error: unknown, fallback: string, title = 'Ошибка') => {
  notifications.show({
    color: 'red',
    title,
    message: getErrorMessage(error, fallback),
  })
}

export const showValidationToast = (message: string, title = 'Проверьте форму') => {
  notifications.show({
    color: 'orange',
    title,
    message,
  })
}

