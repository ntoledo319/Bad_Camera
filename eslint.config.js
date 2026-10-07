// ESLint flat config (Expo preset + project rules).
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'node_modules/*', 'android/*', 'ios/*', 'artifacts/*', 'public/*', 'content/regions/**/*.json'],
  },
  {
    rules: {
      'no-console': 'off',
      'import/no-unresolved': 'off',
      'react/display-name': 'off',
    },
  },
  {
    // zod idiom: `export const X = z.object(...)` paired with `export type X = z.infer<typeof X>`.
    files: ['src/domain/schemas.ts', 'src/domain/tiles.ts'],
    rules: { '@typescript-eslint/no-redeclare': 'off' },
  },
]);
