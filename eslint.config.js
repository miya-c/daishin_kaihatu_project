import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import reactRefreshPlugin from 'eslint-plugin-react-refresh';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    ignores: [
      'dist/',
      'coverage/',
      'node_modules/',
      'vite.config.js',
    ],
  },

  js.configs.recommended,

  prettierConfig,

  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    settings: {
      react: {
        version: '18.3',
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      'react-refresh': reactRefreshPlugin,
    },
    rules: {
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      'react/prop-types': 'off',

      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },

  // Test files — allow vitest globals
  {
    files: ['**/__tests__/**/*.{js,jsx}', '**/*.test.{js,jsx}', '**/*.spec.{js,jsx}'],
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
      },
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  // Service worker and PWA utils — non-module, non-React
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
      'react-refresh/only-export-components': 'off',
      'no-undef': 'off',
    },
  },

  // Config files at root
  {
    files: ['vitest.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
  },
];
