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
import {
	By,
	VSBrowser,
	WebView,
	Workbench
} from 'vscode-extension-tester';
import { expect } from 'chai';
import * as path from 'path';

describe('Pin Selection', () => {
	let browser: VSBrowser;
	let view: WebView;

	before(async function () {
		this.timeout(60000);
		browser = VSBrowser.instance;
		await browser.waitForWorkbench();
	});

	after(async function () {
		this.timeout(60000);
		await view.switchBack();

		const wb = new Workbench();

		await wb.wait();

		await wb.executeCommand('workbench.action.closeAllEditors');
	});

	it('Displays the pin details sidebar when a pin is clicked', async () => {
		await browser.openResources(
			path.join(
				'src',
				'tests',
				'ui-test-config-tools',
				'fixtures',
				'max32690-tqfn.cfsconfig'
			)
		);

		view = new WebView();

		await view.wait();

		await view.switchToFrame();

		const pin = await view.findWebElement(
			By.css(
				'#pin-rows-container > div:nth-child(1) > div:nth-child(2)'
			)
		);

		expect(await pin.getText()).to.contain('P2.26');

		await pin.click().then(async () => {
			expect(await view.findWebElement(By.css('#details-container')))
				.to.exist;

			const title = await view.findWebElement(
				By.css('#pin-details-title > h3')
			);

			expect(await title.getText()).to.contain('P2.26');

			// assert backdrop exists
			expect(
				await view.findWebElement(By.css('#focused-pin-backdrop'))
			).to.exist;
		});
	}).timeout(60000);
});
