export const formatRuDateTime = (value: string | Date): string =>
  new Date(value).toLocaleString('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

export const formatRuNumber = (value: number): string => value.toLocaleString('ru-RU')

