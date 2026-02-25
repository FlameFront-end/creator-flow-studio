import type { PromptTemplate, PromptTemplateKey } from '../../../shared/api/services/promptTemplates.api'
import { TEMPLATE_KEYS, TEMPLATE_KEY_LABEL } from './promptStudio.constants'

export type TemplateFilterKey = PromptTemplateKey | 'all'

export const extractTemplateVariables = (value: string): string[] =>
  Array.from(
    new Set(
      Array.from(value.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)).map(([, variable]) => variable),
    ),
  )

export const filterTemplates = (
  templates: PromptTemplate[],
  search: string,
  filterKey: TemplateFilterKey,
) => {
  const normalizedSearch = search.trim().toLowerCase()

  return templates.filter((item) => {
    if (filterKey !== 'all' && item.key !== filterKey) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return (
      TEMPLATE_KEY_LABEL[item.key].toLowerCase().includes(normalizedSearch) ||
      item.template.toLowerCase().includes(normalizedSearch)
    )
  })
}

export const getTemplateTypeOptions = () => [
  { value: 'all', label: 'Все типы' },
  ...TEMPLATE_KEYS.map((item) => ({ value: item, label: TEMPLATE_KEY_LABEL[item] })),
]
