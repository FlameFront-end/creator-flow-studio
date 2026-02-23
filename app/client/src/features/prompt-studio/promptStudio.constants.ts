import type { PromptTemplateKey } from '../../shared/api/services/promptTemplates.api'

export type PreviewVariableType = 'string' | 'number' | 'boolean'

export const TEMPLATE_KEYS: PromptTemplateKey[] = ['ideas', 'script', 'caption', 'image_prompt']

export const TEMPLATE_KEY_LABEL: Record<PromptTemplateKey, string> = {
  ideas: 'Идеи',
  script: 'Сценарий',
  caption: 'Подпись',
  image_prompt: 'Промпт изображения',
}
