import js from '@eslint/js';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    ignores: [
      'dist/',
      'coverage/',
      'node_modules/',
      'backend/',
      'vite.config.js',
      'vitest.config.js',
      'vitest-setup.js',
      '**/*.svelte.ts',
    ],
  },

  js.configs.recommended,

  ...svelte.configs['flat/recommended'],

  prettierConfig,

  {
    files: ['**/*.{js,svelte}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Svelte files with TypeScript
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tsParser,
      },
    },
    rules: {
      // Type annotations in interfaces may have unused param names
      'no-unused-vars': 'off',
      'svelte/no-unused-vars': 'off',
    },
  },

  // Test files — allow vitest globals and Svelte runes
  {
    files: ['**/__tests__/**/*.js', '**/*.test.js', '**/*.spec.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        $effect: 'readonly',
        $state: 'readonly',
        $derived: 'readonly',
        $props: 'readonly',
      },
    },
  },

  // Service worker and PWA utils — non-module
  {
    files: ['src/sw/service-worker.js', 'src/pwa-utils.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        self: 'readonly',
        module: 'readonly',
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },
];
