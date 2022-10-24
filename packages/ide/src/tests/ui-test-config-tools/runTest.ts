/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
import * as path from 'path';
import { ExTester } from 'vscode-extension-tester';
import * as fs from 'fs';

const EXTENSIONS_DIR = path.resolve(
	process.cwd(),
	'src',
	'tests',
	'ui-test-config-tools',
	'.vscode'
);

async function main() {
	const settingsPath =
		process.env.SETTINGS_PATH ??
		path.join(EXTENSIONS_DIR, 'settings.json');

	const isWin = process.platform === 'win32';

	try {
		// Create settings file to set the path to cfsutil
		await fs.promises.writeFile(settingsPath, '{}', 'utf-8');

		console.log(
			'Settings file successfully created at',
			settingsPath
		);

		let cfsutilPath = path.resolve(
			process.cwd(),
			'..',
			'cli', // update this path when moving
			'bin',
			`run${isWin ? '.cmd' : '.js'}`
		);

		if (isWin) {
			cfsutilPath = cfsutilPath.replace(/\\/g, '\\\\');
		}

		await fs.promises.writeFile(
			settingsPath,
			`{"cfgtools.cfsutil.path": "${cfsutilPath}"}`,
			'utf-8'
		);

		console.log('Generated path to cfsutil:', cfsutilPath);

		const tester = new ExTester(undefined, undefined, EXTENSIONS_DIR);

		await tester.setupAndRunTests(
			path.resolve(__dirname, 'suite/*.test.js'),
			'max',
			{
				useYarn: true,
			},
			{
				config: path.resolve(process.cwd(), '.mocharc.json'),
				resources: [],
				settings: settingsPath,
				cleanup: true,
				logLevel: 'debug' as any
			}
		);
	} catch (err) {
		console.error('Failed to run tests', err);
		process.exit(1);
	} finally {
		await fs.promises.unlink(settingsPath);
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
