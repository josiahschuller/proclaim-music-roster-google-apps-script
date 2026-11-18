const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
    },
    rules: {
      ...js.configs.recommended.rules,
      // Apps Script exposes functions across project files and invokes entry points by name.
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      globals: globals.node,
    },
    rules: js.configs.recommended.rules,
  },
];
