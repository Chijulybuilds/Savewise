import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Lint configuration.
 *
 * Type-aware linting is enabled for the source directories: rules like
 * `no-floating-promises` and `no-misused-promises` need the type checker, and
 * they catch a whole class of bug — an un-awaited database write, an async
 * function passed where a void callback is expected — that syntax-only linting
 * cannot see.
 *
 * `eslint-config-prettier` is last so formatting rules never fight the
 * formatter.
 */
export default tseslint.config(
  {
    ignores: ['node_modules/**', '**/dist/**', 'coverage/**', 'client/public/**', '**/*.config.js'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // `_`-prefixed arguments are a deliberate "unused on purpose" marker —
      // Express error middleware needs its fourth parameter to exist.
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // `any` disables the type system exactly where it is most needed.
      '@typescript-eslint/no-explicit-any': 'error',

      // Enforces `import type`, which keeps type-only imports out of the bundle.
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // The rule that matters most in an API: a forgotten `await` on a write
      // is a silent data-loss bug.
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],

      // `??` is the safer default, but `||` on a string or a boolean is almost
      // always a deliberate falsy check — `input.avatarUrl || null` exists
      // precisely to turn an empty string into a null.
      '@typescript-eslint/prefer-nullish-coalescing': [
        'error',
        { ignorePrimitives: { string: true, boolean: true } },
      ],

      // `as string` on a route parameter reads better than a bare `!` and is
      // the same assertion; both are already gated by `validateParams`.
      '@typescript-eslint/non-nullable-type-assertion-style': 'off',

      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'object-shorthand': 'error',
    },
  },

  /* ---------------------------------- Server -------------------------------- */
  {
    files: ['server/**/*.ts', 'shared/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  /* ---------------------------------- Client -------------------------------- */
  {
    files: ['client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Catches a conditionally-called hook, which React cannot recover from.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  /* ----------------------------------- Tests -------------------------------- */
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'server/tests/**/*.ts', 'client/src/test/**/*.ts'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      // Test fixtures legitimately poke at response bodies typed as `any`.
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },

  /* ------------------------- Root tooling config files ---------------------- */
  {
    // These sit outside every workspace `tsconfig`, so type-aware rules have no
    // program to consult. Linted for syntax only.
    files: ['vitest.config.ts', 'eslint.config.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: { projectService: false, project: false },
    },
  },

  prettier,
);
