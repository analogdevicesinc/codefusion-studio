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
import {
	By,
	CustomEditor,
	EditorView,
	VSBrowser,
	WebDriver,
	WebView
} from 'vscode-extension-tester';

describe('Elf file custom editor', () => {
	let browser: VSBrowser;
	let driver: WebDriver;
	let view: WebView;

	before(async function () {
		this.timeout(60000);

		browser = VSBrowser.instance;
		driver = browser.driver;

		await browser.waitForWorkbench();
	});

	after(async function () {
		this.timeout(60000);
		view.switchBack();
		await new EditorView().closeAllEditors();
	});

	it('Should open the elf viewer panel when opening a file with *.elf extension', async () => {
		await browser.openResources(
			path.join(
				'src',
				'tests',
				'ui-test-config-tools',
				'fixtures',
				'hello_world.elf'
			)
		);

		const editor = new CustomEditor();

		view = editor.getWebView();

		await view.switchToFrame();

		await view.findWebElement(
			By.xpath('//*[@id="root"]/div/article/h1')
		);
	}).timeout(60000);
});
