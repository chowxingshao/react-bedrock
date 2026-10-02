import js from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { createNodeResolver, importX } from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Spec Principle 2: each wrapped library may only be imported inside its home module.
 * Everything else goes through the wrapper.
 */
const WRAPPED = [
  { files: ['src/core/api/**'], paths: ['axios'], message: 'Use `http` from @/core/api.' },
  { files: ['src/core/notify/**'], paths: ['sonner'], message: 'Use `notify` from @/core/notify.' },
  {
    files: ['src/core/storage/**'],
    paths: ['js-cookie'],
    message: 'Use `cookies` from @/core/storage.',
  },
  {
    files: ['src/core/logger/**'],
    patterns: ['@sentry/*'],
    message: 'Use `logger` from @/core/logger.',
  },
  {
    files: ['src/lib/format.ts'],
    patterns: ['date-fns', 'date-fns/*'],
    message: 'Use the formatters in @/lib/format.',
  },
];

/**
 * Options for `no-restricted-imports`.
 * @param {{ allow?: number, insideCore?: boolean, featureInternals?: boolean }} [options] `allow` is the WRAPPED index whose home is being linted.
 * `featureInternals` lets the file read a feature's files, not only its index (mock handlers do).
 */
function restrictedImports({ allow = -1, insideCore = false, featureInternals = false } = {}) {
  const active = WRAPPED.filter((_, index) => index !== allow);
  return [
    'error',
    {
      paths: [
        { name: 'cn', message: 'Use `cn` from @/lib/cn.' },
        ...active.flatMap((w) => (w.paths ?? []).map((name) => ({ name, message: w.message }))),
      ],
      patterns: [
        ...(featureInternals
          ? []
          : [
              {
                group: ['@/features/*/*'],
                message: 'Import a feature only through its public index: @/features/<name>.',
              },
            ]),
        ...(insideCore
          ? []
          : [
              {
                group: ['@/core/*/*'],
                message: 'Import core modules through their index: @/core/<module>.',
              },
            ]),
        ...active.flatMap((w) => (w.patterns ? [{ group: w.patterns, message: w.message }] : [])),
      ],
    },
  ];
}

/** Layering rules (docs/architecture.md). */
const LAYER_ZONES = [
  {
    target: [
      './src/config',
      './src/lib',
      './src/core',
      './src/components',
      './src/hooks',
      './src/stores',
      './src/features',
      './src/mocks',
      './src/locales',
      './src/types',
    ],
    from: './src/app',
    message: 'Only src/main.tsx and src/test may import from src/app.',
  },
  {
    target: ['./src/config', './src/lib'],
    from: [
      './src/core',
      './src/components',
      './src/features',
      './src/hooks',
      './src/stores',
      './src/mocks',
    ],
    message: 'config/ and lib/ are leaf layers.',
  },
  {
    target: './src/core',
    from: ['./src/features', './src/components/layout'],
    message: 'core/ must stay extractable: no feature or layout imports.',
  },
  {
    target: './src/core/api',
    from: ['./src/components', './src/core/errors'],
    message:
      'core/api is imported by components (feedback) and core/errors: importing them back would create a cycle.',
  },
  {
    target: ['./src/components', './src/hooks', './src/stores'],
    from: './src/features',
    message: 'Shared code must not depend on features.',
  },
];

const STORAGE_HINT = 'Use `localStore` / `sessionStore` from @/core/storage.';
const ENV_HINT = 'Read configuration from `env` (@/config/env).';

export default defineConfig([
  globalIgnores([
    'dist',
    'coverage',
    '.vitest',
    'storybook-static',
    'playwright-report',
    'test-results',
    'src/api/generated',
    'public/mockServiceWorker.js',
    'plop/templates',
  ]),

  // Plain JS config files (Node) and the browser runtime-config stub.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  { files: ['public/**/*.js'], languageOptions: { globals: globals.browser } },

  // All TypeScript: type-aware rules + import hygiene.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      importX.flatConfigs.recommended,
      importX.flatConfigs.typescript,
    ],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ alwaysTryTypes: true }),
        createNodeResolver(),
      ],
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
      'import-x/no-unresolved': ['error', { ignore: ['\\?(raw|url)$'] }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  // Application source (browser, React).
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat['jsx-runtime'],
      reactHooks.configs.flat.recommended,
      jsxA11y.flatConfigs.recommended,
      reactRefresh.configs.vite,
      pluginQuery.configs['flat/recommended'],
    ],
    languageOptions: { globals: globals.browser },
    settings: { react: { version: 'detect' } },
    rules: {
      'react/prop-types': 'off',
      // We do not run the React Compiler, so compiler-compatibility warnings are noise.
      'react-hooks/incompatible-library': 'off',
      // Spec DoD: no hard-coded user-facing strings. Text goes through i18next.
      'react/jsx-no-literals': [
        'error',
        {
          allowedStrings: [
            '·',
            '—',
            '–',
            '…',
            '/',
            '|',
            '•',
            '*',
            ':',
            '%',
            '(',
            ')',
            '+',
            '-',
            '×',
          ],
        },
      ],
      'no-console': 'error',
      'no-restricted-imports': restrictedImports(),
      'no-restricted-globals': [
        'error',
        { name: 'localStorage', message: STORAGE_HINT },
        { name: 'sessionStorage', message: STORAGE_HINT },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'localStorage', message: STORAGE_HINT },
        { object: 'window', property: 'sessionStorage', message: STORAGE_HINT },
        { object: 'document', property: 'cookie', message: 'Use `cookies` from @/core/storage.' },
        { object: 'window', property: '__APP_CONFIG__', message: ENV_HINT },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.type='MetaProperty'][property.name='env']",
          message: ENV_HINT,
        },
      ],
      'import-x/no-restricted-paths': ['error', { zones: LAYER_ZONES }],
    },
  },

  // Wrapper homes: core may deep-import itself, and each home may import its own library.
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': restrictedImports({ insideCore: true }) },
  },
  ...WRAPPED.map((w, index) => ({
    files: w.files,
    rules: {
      'no-restricted-imports': restrictedImports({
        allow: index,
        insideCore: w.files[0].startsWith('src/core'),
      }),
    },
  })),
  // Mock handlers are the backend half of a feature's contract, so they read its schemas and types from
  // its files. The feature's index also exports its pages, and the test setup loads every handler: going
  // through the index would load the whole UI into every test file (+2 s each) and into mocked modules.
  {
    files: ['src/mocks/**/*.ts'],
    rules: { 'no-restricted-imports': restrictedImports({ featureInternals: true }) },
  },
  {
    files: ['src/config/env.ts'],
    rules: { 'no-restricted-syntax': 'off', 'no-restricted-properties': 'off' },
  },
  {
    files: ['src/core/storage/**'],
    rules: { 'no-restricted-globals': 'off', 'no-restricted-properties': 'off' },
  },
  { files: ['src/core/logger/**'], rules: { 'no-console': 'off' } },
  {
    files: ['src/components/ui/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },

  // Tests, stories and test infrastructure.
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', '**/*.stories.tsx', 'e2e/**'],
    rules: {
      'react/jsx-no-literals': 'off',
      'no-restricted-globals': 'off',
      'no-restricted-properties': 'off',
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  ...storybook.configs['flat/recommended'],
  eslintConfigPrettier,
]);
