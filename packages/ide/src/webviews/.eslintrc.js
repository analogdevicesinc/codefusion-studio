const path = require('path');

module.exports = {
	root: true,
	reportUnusedDisableDirectives: true,
	overrides: [
		{
			files: [
				'./**/*.ts',
				'./**/*.tsx',
			],
			excludedFiles: ['./**/*.d.ts', './**/lib/**/*.js'],
			extends: [
				'xo',
				'xo-typescript',
				'xo-react',
				'plugin:react/jsx-runtime',
				'plugin:import/recommended',
				'prettier'
			],

			parser: '@typescript-eslint/parser',
			parserOptions: {
				project: [path.resolve(process.cwd(), 'src/webviews/tsconfig.json')],
				tsconfigRootDir: path.resolve(process.cwd(), 'src/webviews'),
			},
			plugins: ['unused-imports'],
			rules: {
				'unused-imports/no-unused-imports': 'error',
				'import/no-unresolved': 0,
				'n/file-extension-in-import': 0,
				'react/jsx-tag-spacing': [
					'error',
					{
						beforeSelfClosing: 'always'
					}
				],
				'comma-dangle': 0,
				indent: 0,
				'@typescript-eslint/indent': 0,
				'@typescript-eslint/comma-dangle': 0,
				'@typescript-eslint/triple-slash-reference': 0,
				'@typescript-eslint/no-unsafe-call': 0,
				'@typescript-eslint/no-unsafe-assignment': 0,
				'@typescript-eslint/no-unsafe-return': 0,
				'@typescript-eslint/naming-convention': [
					'error',
					{
						selector: 'variableLike',
						format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
						leadingUnderscore: 'allow',
						trailingUnderscore: 'allow'
					}
				],
				'padding-line-between-statements': [
					'error',
					{
						blankLine: 'always',
						prev: '*',
						next: 'return'
					},
					{
						blankLine: 'always',
						prev: 'multiline-block-like',
						next: '*'
					},
					{
						blankLine: 'always',
						prev: '*',
						next: 'multiline-block-like'
					}
				]
			}
		}
	],
	ignorePatterns: [
		'node_modules/**/*',
		'**/build/**/*',
		'**/__test__',
		'**/lib/**/*',
		'**/*.d.ts',
		'**/.eslintrc.js',
		'**/cypress/**/*'
	]
};
