import globals from 'globals';
import pluginJs from '@eslint/js';

export default [
  { ignores: ['node_modules/', 'dist/', 'build/', '*.min.js'] },
  pluginJs.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      'no-undef': 'off',
      'no-dupe-keys': 'warn',
      'no-useless-assignment': 'warn',
    },
  },
];
