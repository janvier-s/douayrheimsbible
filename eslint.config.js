import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

export default [
	js.configs.recommended,
	{
		files: ['**/*.ts'],
		plugins: { '@typescript-eslint': tsPlugin },
		languageOptions: {
			parser: tsParser,
			parserOptions: { sourceType: 'module', ecmaVersion: 2020 },
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			...tsPlugin.configs.recommended.rules
		}
	},
	{
		files: ['src/service-worker.ts'],
		plugins: { '@typescript-eslint': tsPlugin },
		languageOptions: {
			parser: tsParser,
			parserOptions: { sourceType: 'module', ecmaVersion: 2020 },
			globals: { ...globals.serviceworker }
		},
		rules: {
			...tsPlugin.configs.recommended.rules
		}
	},
	{
		files: ['**/*.svelte'],
		plugins: { svelte, '@typescript-eslint': tsPlugin },
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tsParser,
				sourceType: 'module',
				ecmaVersion: 2020
			},
			globals: { ...globals.browser }
		},
		rules: {
			...svelte.configs.recommended.rules,
			'no-undef': 'off',
			'no-unused-vars': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
			]
		}
	},
	{
		// Rune modules (`*.svelte.ts`) are plain TypeScript to the parser, but they
		// may use $state/$derived/$effect, which are compiler globals rather than
		// declared identifiers. Same `no-undef` exemption the .svelte block gets.
		files: ['**/*.svelte.ts', '**/*.svelte.js'],
		plugins: { '@typescript-eslint': tsPlugin },
		languageOptions: {
			parser: tsParser,
			parserOptions: { sourceType: 'module', ecmaVersion: 2020 },
			globals: { ...globals.browser, ...globals.node }
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			'no-undef': 'off'
		}
	},
	{
		ignores: ['.svelte-kit/', 'build/', 'node_modules/', '*.config.js', '*.config.ts']
	}
];
