import {
  IconBulb,
  IconChecklist,
  IconFileText,
  IconRocket,
  IconSettings,
  IconSparkles,
} from '@tabler/icons-react'

export const quickStartSteps = [
  {
    icon: IconRocket,
    title: '1. Создайте проект',
    description: 'Во вкладке «Проекты» добавьте проект с понятным названием и описанием.',
  },
  {
    icon: IconSettings,
    title: '2. Настройте промпты',
    description: 'Заполните персонажей, шаблоны и правила в «Промпт-студии».',
  },
  {
    icon: IconSparkles,
    title: '3. Запустите генерацию',
    description: 'Во вкладке «Идеи и сценарии» выберите проект и персонажа, затем запускайте идеи/сценарии/подписи.',
  },
]

export const statusItems = [
  {
    color: 'gray',
    title: 'В очереди',
    description: 'Задача принята и ожидает выполнения.',
  },
  {
    color: 'blue',
    title: 'Выполняется',
    description: 'AI сейчас обрабатывает запрос.',
  },
  {
    color: 'green',
    title: 'Успех',
    description: 'Результат получен и сохранен.',
  },
  {
    color: 'red',
    title: 'Ошибка',
    description: 'Откройте логи, чтобы увидеть причину и повторить запуск.',
  },
] as const

export const troubleshootingSteps = [
  'Проверьте заполнение обязательных полей проекта и промптов.',
  'Убедитесь, что запущены server, worker и redis.',
  'Проверьте переменные окружения (`OPENAI_API_KEY`, БД, Redis).',
  'Смотрите «Логи прогонов AI» в разделе идей: время, операция, статус и текст ошибки.',
]

export const aboutIcons = {
  quickStart: IconChecklist,
  statuses: IconFileText,
  troubleshooting: IconBulb,
}

