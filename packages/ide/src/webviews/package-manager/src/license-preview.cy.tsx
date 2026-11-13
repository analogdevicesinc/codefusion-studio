/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {fetchLicenseDataRequest} from '@constants/messages/package-manager-messages';
import App from './app';
import {resetStore, store} from './state/store';
import {
	mockPackageManager,
	referenceKey
} from './test-utils/package-manager-mock';
import {mountPackageManager} from './test-utils/mount';

/**
 * The extension opens the license preview as its own panel, passing the
 * package through a global rather than a message. The panel runs the same
 * bundle: `app.tsx` reads the global and renders `LicensePreviewPage` instead
 * of the package list, so the preview is reachable here without a second
 * webview — set the global before mounting.
 */
const openPreviewFor = (
	packageName: string,
	packageVersion: string,
	packageLicense: string
) => {
	(window as unknown as Record<string, unknown>).__command_args__ = {
		view: 'license-preview',
		packageName,
		packageVersion,
		packageLicense
	};
};

describe('License preview panel', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		store.dispatch(resetStore());
		(window as unknown as Record<string, unknown>).__command_args__ =
			undefined;
	});

	it('shows the license text the backend returns for the package', () => {
		mockPackageManager({
			licenses: {
				[referenceKey('test_pkg1', '2.0.0')]: {
					packageName: 'test_pkg1',
					version: '2.0.0',
					licenseId: 'BSD-3-Clause',
					licenseText: 'Redistribution and use in source form...'
				}
			}
		});
		openPreviewFor('test_pkg1', '2.0.0', 'BSD-3-Clause');

		mountPackageManager(<App />);

		cy.dataTest('license-name').should(
			'contain.text',
			'BSD-3-Clause'
		);
		cy.dataTest('license-target').should(
			'contain.text',
			'test_pkg1 2.0.0'
		);
		cy.dataTest('license-content').should(
			'contain.text',
			'Redistribution and use in source form'
		);

		// The preview replaces the package list; it is a panel of its own.
		cy.dataTest('package-search').should('not.exist');
	});

	it('falls back to a generic notice when the backend has no license text', () => {
		mockPackageManager({
			licenses: {
				[referenceKey('test_pkg1', '2.0.0')]: {
					packageName: 'test_pkg1',
					version: '2.0.0',
					licenseId: 'Apache-2.0'
				}
			}
		});
		openPreviewFor('test_pkg1', '2.0.0', 'Apache-2.0');

		mountPackageManager(<App />);

		cy.dataTest('license-content').should(
			'contain.text',
			'Apache-2.0'
		);
	});

	it('reports a license fetch failure instead of an empty page', () => {
		const pm = mockPackageManager();
		pm.fail(fetchLicenseDataRequest.method, 'license file missing');
		openPreviewFor('test_pkg1', '2.0.0', 'Apache-2.0');

		mountPackageManager(<App />);

		cy.contains('Failed to load license data.').should('be.visible');
		cy.dataTest('license-content').should('not.exist');
	});

	it('renders the package list when no preview was requested', () => {
		mockPackageManager();

		mountPackageManager(<App />);

		cy.dataTest('package-search').should('exist');
		cy.dataTest('license-content').should('not.exist');
	});
});
