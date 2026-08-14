// Root ESLint flat config. The quality pipeline must FAIL on `any` and `console.*`
// (MISSION-000 Gherkin: "Quality pipeline blocks bad code").
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/.astro/**',
      '**/.turbo/**',
      '**/node_modules/**',
      'numinia-digital-goods/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/src/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
      // Named exports only (constitution §Code standards). Config files are exempt below.
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports (constitution: no default exports).',
        },
      ],
    },
  },
  {
    // Tooling configs legitimately use default exports.
    files: ['**/*.config.{ts,mjs,js}', '**/vitest.config.ts', '**/astro.config.mjs'],
    rules: {
      'no-restricted-syntax': 'off',
    },
  },
);
