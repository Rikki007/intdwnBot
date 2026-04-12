const js = require('@eslint/js');
const prettier = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    prettierConfig,

    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.es2022
            }
        },
        plugins: {
            prettier
        },
        rules: {
            'prettier/prettier': 'warn',
            'no-console': 'off',
            'no-unused-vars': ['warn', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            'no-undef': 'error',
            'quotes': ['warn', 'single'],
            'semi': ['warn', 'always'],
            'indent': ['warn', 4],

            'preserve-caught-error': 'off'
        }
    }
];