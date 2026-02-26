import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*', '@/features/*/*/*', '@/features/*/*/*/*'],
              message:
                'Импортируй из feature только через публичный API модуля (например, "@/features/<feature>").',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/*/*', '@/features/*/*/*', '@/features/*/*/*/*'],
              message:
                'Запрещены feature->feature импорты. Вынеси общее в shared или импортируй через app-слой.',
            },
            {
              group: ['../../features/*', '../../../features/*', '../../../../features/*'],
              message:
                'Запрещены feature->feature относительные импорты. Вынеси общее в shared.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                '@/app/*',
                '@/app/*/*',
                '@/features/*',
                '@/features/*/*',
                '@/features/*/*/*',
                '../../app/*',
                '../../../app/*',
                '../../features/*',
                '../../../features/*',
              ],
              message:
                'Слой shared не должен зависеть от app/features. Перенеси зависимость выше по слоям.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: [
      'src/features/ideas-lab/components/IdeasGenerationPanel.tsx',
      'src/features/ideas-lab/components/list/IdeasListPanel.tsx',
      'src/features/ideas-lab/components/results/PostDraftPanel.tsx',
      'src/features/ideas-lab/hooks/useIdeasLabController.ts',
      'src/features/projects/components/CreateProjectSection.tsx',
      'src/features/prompt-studio/components/AiProviderSettingsSection.tsx',
      'src/shared/components/TransientErrorAlert.tsx',
      'src/shared/lib/ui/motion.tsx',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/shared/lib/ui/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: ['src/shared/components/ui/**/*.{ts,tsx}', 'src/shared/lib/ui/theme.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
