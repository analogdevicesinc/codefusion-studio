const path = require('path');

const projectOverrideDescriptors = [
	{ pattern: 'config-tools', tsconfig: 'config-tools.tsconfig.json', extraExcludes: ['lib/**/*.js'] },
	{ pattern: 'workspace-creation', tsconfig: 'workspace.tsconfig.json' },
	{ pattern: 'model-workspace-creation', tsconfig: 'model-workspace.tsconfig.json' },
	{ pattern: 'ai-hardware-profiling', tsconfig: 'ai-hardware-profiling.tsconfig.json' },
	{ pattern: 'memory-viewer', tsconfig: 'memory-viewer.tsconfig.json' },
	{ pattern: 'trace-side-panel', tsconfig: 'trace-side-panel.tsconfig.json' },
	{ pattern: 'trace-configuration', tsconfig: 'trace-configuration.tsconfig.json' },
	{ pattern: 'report-viewer', tsconfig: 'report-viewer.tsconfig.json' },
	{ pattern: 'elf-explorer', tsconfig: 'elf.tsconfig.json' },
	{ pattern: 'home-page', tsconfig: 'home.tsconfig.json', extraExcludes: ['lib/**/*.js'] },
	{ pattern: 'sigma-studio-plus-project', tsconfig: 'sigma-studio-plus-project.tsconfig.json', extraExcludes: ['lib/**/*.js'] },
	{ pattern: 'system-event-viewer', tsconfig: 'system-event-viewer.tsconfig.json' },
	{ pattern: 'system-event-viewer-treeview', tsconfig: 'system-event-viewer-treeview.tsconfig.json' },
	{ pattern: 'common', tsconfig: 'common/tsconfig.json', extraExcludes: ['lib/**/*.js'] }
];

const projectOverrides = projectOverrideDescriptors.map(({ pattern, tsconfig, extraExcludes = [] }) => ({
	files: [`${pattern}/**/*.ts`, `${pattern}/**/*.tsx`],
	excludedFiles: [`${pattern}/**/*.d.ts`, ...extraExcludes.map(exclude => `${pattern}/${exclude}`)],
	parserOptions: {
		project: [path.resolve(__dirname, tsconfig)],
		tsconfigRootDir: __dirname
	}
}));

module.exports = {
	root: true, // Ensure this config is treated as root and does not inherit ignore patterns
	reportUnusedDisableDirectives: true,
	overrides: [
		// 1. Directory-specific TypeScript projects wire ESLint to the correct tsconfig
		...projectOverrides,
		{
			files: ['./*.ts', './*.tsx'],
			excludedFiles: ['./*.d.ts', './lib/**/*.js'],
			parserOptions: {
				project: [path.resolve(__dirname, 'tsconfig.json')],
				tsconfigRootDir: __dirname,
			},
		},
		// 2. Shared React/TypeScript rules for everything in the webviews bundle
		{
			files: ['**/*.ts', '**/*.tsx'],
			excludedFiles: ['**/*.d.ts', '**/lib/**/*.js'],
			extends: [
				'xo',
				'xo-typescript',
				'xo-react',
				'plugin:react/jsx-runtime',
				'plugin:import/recommended',
				'prettier',
				'plugin:cypress/recommended'
			],
			parser: '@typescript-eslint/parser',
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
				"@typescript-eslint/prefer-regexp-exec": 0,
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
		},
		// 3. Cypress rules overrides last so specs can use more lenient rules.
		{
			files: ['./**/*.cy.ts', './**/*.cy.tsx'],
			rules: {
				'@typescript-eslint/no-unsafe-argument': 'off',
				'cypress/no-assigning-return-values': 'off',
				'cypress/unsafe-to-chain-command': 'off',
				'cypress/no-unnecessary-waiting': 'off'
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
		'**/cypress/**/*',
		'./**/*.json',
		'./**/*.html'
	]
};
