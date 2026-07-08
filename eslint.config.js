import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import tsParser from '@typescript-eslint/parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const srcPath = path.resolve(__dirname, 'src');

/**
 * Module dependency rules (enforced by `no-restricted-paths`).
 *
 *   app        →  editor, panels, layout, systems, canvas
 *   editor     →  core, state, canvas, panels
 *   canvas     →  core, state
 *   panels     →  core, state, types
 *   layout     →  core, state, panels, types
 *   systems    →  core, state, editor, panels, types
 *   core       →  types, shared, utils
 *   state      →  core, types, shared, utils
 *   shared     →  types, utils
 *   utils      →  types, shared
 *   types      →  (no internal deps)
 *
 * In short: lower layers may not depend on upper layers.
 */
const restrictedPaths = {
  zones: [
    // core must not depend on editor/canvas/panels/state/layout/systems/app.
    // Schema and commands are the documented exceptions: the Document
    // service (in core/document/) operates on the editor schema shapes
    // and the CommandBus (in core/command/) is wired against the
    // concrete Commands. Both are domain types — not editor internals.
    {
      target: path.resolve(srcPath, 'core'),
      from: [
        path.resolve(srcPath, 'canvas'),
        path.resolve(srcPath, 'panels'),
        path.resolve(srcPath, 'state'),
        path.resolve(srcPath, 'layout'),
        path.resolve(srcPath, 'systems'),
        path.resolve(srcPath, 'app'),
        path.resolve(srcPath, 'editor/map/tools'),
        path.resolve(srcPath, 'editor/map/palette'),
        path.resolve(srcPath, 'editor/shared'),
      ],
    },
    // state must not depend on canvas/panels/layout/systems/app, nor on
    // editor implementation paths. Schema and palette are allowed.
    //
    // Lower layers (state, canvas, panels) may read from the shared
    // domain types in `editor/map/schema/` and the default palette in
    // `editor/map/palette/`. These are not editor implementation
    // details — they are the shape of the project's document data and
    // the placeholder tile colors, both of which every layer needs to
    // know about. The other `editor/` subpaths (tools, commands, ...)
    // remain forbidden.
    {
      target: path.resolve(srcPath, 'state'),
      from: [
        path.resolve(srcPath, 'canvas'),
        path.resolve(srcPath, 'panels'),
        path.resolve(srcPath, 'layout'),
        path.resolve(srcPath, 'systems'),
        path.resolve(srcPath, 'app'),
        path.resolve(srcPath, 'editor/map/tools'),
        path.resolve(srcPath, 'editor/map/commands'),
        path.resolve(srcPath, 'editor/shared'),
      ],
    },
    // canvas must not depend on panels/layout/systems/app, nor on
    // editor implementation paths. Schema and palette are allowed.
    {
      target: path.resolve(srcPath, 'canvas'),
      from: [
        path.resolve(srcPath, 'panels'),
        path.resolve(srcPath, 'layout'),
        path.resolve(srcPath, 'systems'),
        path.resolve(srcPath, 'app'),
        path.resolve(srcPath, 'editor/map/tools'),
        path.resolve(srcPath, 'editor/map/commands'),
        path.resolve(srcPath, 'editor/shared'),
      ],
    },
    // panels must not depend on canvas/layout/systems/app, nor on
    // editor implementation paths. Schema, palette, and commands are
    // allowed: panels dispatch Commands (the editor operations) via
    // the CommandBus, and read schema/palette types to construct
    // their handlers.
    {
      target: path.resolve(srcPath, 'panels'),
      from: [
        path.resolve(srcPath, 'canvas'),
        path.resolve(srcPath, 'layout'),
        path.resolve(srcPath, 'systems'),
        path.resolve(srcPath, 'app'),
        path.resolve(srcPath, 'editor/map/tools'),
        path.resolve(srcPath, 'editor/shared'),
      ],
    },
    // shared must not depend on any upper layer
    {
      target: path.resolve(srcPath, 'shared'),
      from: [
        path.resolve(srcPath, 'core'),
        path.resolve(srcPath, 'editor'),
        path.resolve(srcPath, 'canvas'),
        path.resolve(srcPath, 'panels'),
        path.resolve(srcPath, 'state'),
        path.resolve(srcPath, 'layout'),
        path.resolve(srcPath, 'systems'),
        path.resolve(srcPath, 'app'),
      ],
    },
    // utils must not depend on any upper layer
    {
      target: path.resolve(srcPath, 'utils'),
      from: [
        path.resolve(srcPath, 'core'),
        path.resolve(srcPath, 'editor'),
        path.resolve(srcPath, 'canvas'),
        path.resolve(srcPath, 'panels'),
        path.resolve(srcPath, 'state'),
        path.resolve(srcPath, 'layout'),
        path.resolve(srcPath, 'systems'),
        path.resolve(srcPath, 'shared'),
        path.resolve(srcPath, 'app'),
      ],
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      'dist',
      'dist-electron',
      'release',
      'node_modules',
      'coverage',
      '*.config.js',
      '*.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      'import/resolver': {
        typescript: {
          project: ['./tsconfig.app.json', './tsconfig.node.json'],
        },
        node: true,
      },
    },
    plugins: {
      import: importPlugin,
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      // React
      'react/jsx-uses-react': 'off',
      'react/react-in-jsx-scope': 'off',
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // TypeScript
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',

      // Module boundaries
      'import/no-restricted-paths': ['error', restrictedPaths],
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-self-import': 'error',
      'import/no-cycle': ['error', { maxDepth: 5 }],

      // General
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
    },
  },
  {
    files: ['**/*.tsx'],
    rules: {
      'react/prop-types': 'off',
    },
  },
  {
    // DocumentService (core/document) is the documented exception:
    // it bridges Commands (core) to the Zustand mirror (state). The
    // single state import is isolated to this directory.
    files: ['src/core/document/**/*.ts'],
    rules: {
      'import/no-restricted-paths': 'off',
    },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },
);
