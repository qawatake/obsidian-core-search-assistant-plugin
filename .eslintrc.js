module.exports = {
	env: {
		browser: true,
		es2021: true,
	},
	extends: [
		'eslint:recommended',
		'plugin:react/recommended',
		'plugin:@typescript-eslint/recommended',
		'prettier',
	],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaFeatures: {
			jsx: true,
		},
		ecmaVersion: 13,
		sourceType: 'module',
	},
	plugins: ['react', '@typescript-eslint', 'svelte3'],
	overrides: [
		{
			files: ['*.svelte'],
			processor: 'svelte3/svelte3',
		},
	],
	rules: {
		'no-console': process.env.NODE_ENV === 'production' ? 2 : 0,
		'@typescript-eslint/explicit-module-boundary-types': 0,
		'no-unused-vars': 'off',
		'@typescript-eslint/no-unused-vars': [
			'error',
			{ argsIgnorePattern: '^_' },
		],
	},
	settings: {
		react: {
			version: 'detect',
		},
		'svelte3/typescript': true,
	},
};
