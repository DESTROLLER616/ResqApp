import pluginVue from 'eslint-plugin-vue'
import { withVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import eslintConfigPrettier from 'eslint-config-prettier'

export default withVueTs(
  {
    ignores: ['dist/**', 'src-tauri/**', 'node_modules/**', 'src/vite-env.d.ts'],
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      'no-bitwise': 'error',
      'no-empty': 'error'
    },
  },
  eslintConfigPrettier,
)
