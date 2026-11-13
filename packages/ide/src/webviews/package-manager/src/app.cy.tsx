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

import App from './app';
import {resetStore, store} from './state/store';
import {fetchPackageList} from './state/slices/packages/packages.reducer';
import {
	getPackageListRequest,
	uninstallPackagesRequest
} from '@constants/messages/package-manager-messages';
import {
	entry,
	mockPackageManager
} from './test-utils/package-manager-mock';
import {mountPackageManager} from './test-utils/mount';

/** Two-package backend state used by most tests below. */
const basePackages = () => ({
	entries: [
		entry('test_pkg1', {versions: ['2.0.0', '1.0.0']}),
		entry('test_pkg2', {versions: ['1.2.0']})
	]
});

describe('Package manager - list and selection', () => {
	beforeEach(() => {
		// The webview is a full-height flex shell with a sticky header; the
		// default component viewport clips it.
		cy.viewport(1920, 1080);

		// The webview owns a module-level store that outlives a single mount,
		// so start every test from a fresh-load baseline.
		store.dispatch(resetStore());
	});

	describe('package list', () => {
		it('renders the packages the backend reports', () => {
			mockPackageManager(basePackages());

			mountPackageManager(<App />);

			cy.dataTest('package-card-test_pkg1').should('be.visible');
			cy.dataTest('package-card-test_pkg2').should('be.visible');
		});

		it('shows placeholders until the list arrives', () => {
			const pm = mockPackageManager(basePackages());
			pm.hold(getPackageListRequest.method);

			mountPackageManager(<App />);

			cy.dataTest('package-card-test_pkg1').should('not.exist');
			// Pagination and the action bar are hidden while the list loads.
			cy.dataTest('list-action-bar-primary').should('not.exist');

			cy.then(() => {
				pm.flush(getPackageListRequest.method);
			});

			cy.dataTest('package-card-test_pkg1').should('be.visible');
			cy.dataTest('list-action-bar-primary').should('be.visible');
		});

		it('surfaces a package list failure instead of an empty list', () => {
			const pm = mockPackageManager(basePackages());
			pm.fail(
				getPackageListRequest.method,
				'conan remote unreachable'
			);

			mountPackageManager(<App />);

			cy.contains('conan remote unreachable').should('be.visible');
			cy.dataTest('package-card-test_pkg1').should('not.exist');
		});

		it('offers the sign-in note when the backend returns nothing', () => {
			mockPackageManager({entries: []});

			mountPackageManager(<App />);

			// No packages and no filters applied: the empty state points at
			// signing in rather than at clearing a filter that is not set.
			cy.dataTest('empty-packages').should('be.visible');
			cy.dataTest('clear-filters').should('not.exist');
			cy.dataTest('available-count').should(
				'contain.text',
				'0 available'
			);
		});

		it('drops a stale package list response superseded by a newer one', () => {
			const pm = mockPackageManager(basePackages());

			mountPackageManager(<App />);

			cy.dataTest('package-card-test_pkg1').should('be.visible');

			let earlierFetch: Promise<unknown>;
			let newerFetch: Promise<unknown>;

			// Two fetches overlap, as a login or a remotes change would cause,
			// and each held request keeps the catalog it was served.
			cy.then(() => {
				pm.hold(getPackageListRequest.method);

				earlierFetch = store.dispatch(fetchPackageList());
				pm.state.entries = [entry('test_pkg_newer')];
				newerFetch = store.dispatch(fetchPackageList());
			});

			// One release per tick, each awaited — see `release`. The earlier
			// fetch answers last, so it can lose only by being seen as stale.
			cy.then(() => {
				pm.release(getPackageListRequest.method, 1);

				return newerFetch;
			});

			cy.then(() => {
				pm.release(getPackageListRequest.method, 0);

				return earlierFetch;
			});

			cy.dataTest('package-card-test_pkg_newer').should('be.visible');
			cy.dataTest('package-card-test_pkg1').should('not.exist');
		});
	});

	describe('selection', () => {
		it('refuses to continue with nothing selected', () => {
			mockPackageManager(basePackages());

			mountPackageManager(<App />);

			cy.dataTest('list-action-bar-primary').click();

			cy.dataTest('no-selection-error').should('be.visible');
			cy.contains('Review Summary').should('not.exist');
		});

		it('counts the selection and clears the error once one is made', () => {
			mockPackageManager(basePackages());

			mountPackageManager(<App />);

			cy.dataTest('list-action-bar-primary').click();
			cy.dataTest('no-selection-error').should('be.visible');

			cy.dataTest('package-checkbox-test_pkg1').click();

			cy.dataTest('no-selection-error').should('not.exist');
			cy.dataTest('selected-count').should(
				'contain.text',
				'1 item selected'
			);
		});

		it('selects and clears every package on the page at once', () => {
			mockPackageManager(basePackages());

			mountPackageManager(<App />);

			cy.dataTest('select-all').click();
			cy.dataTest('selected-count').should(
				'contain.text',
				'2 items selected'
			);

			cy.dataTest('select-all').click();
			cy.dataTest('selected-count').should('not.exist');
		});

		it('blocks continuing when the chosen version is already installed', () => {
			const installed = basePackages();
			installed.entries[0] = entry('test_pkg1', {
				versions: ['2.0.0', '1.0.0'],
				installedVersion: '2.0.0',
				cachedVersions: ['2.0.0'],
				state: 'installed'
			});
			mockPackageManager(installed);

			mountPackageManager(<App />);

			cy.dataTest('package-checkbox-test_pkg1').click();

			cy.dataTest('version-already-installed-test_pkg1').should(
				'be.visible'
			);
			cy.dataTest('already-installed-error').should('be.visible');
			cy.dataTest('list-action-bar-primary').should(
				'have.attr',
				'disabled'
			);
		});
	});

	describe('uninstall', () => {
		it('uninstalls an installed package once confirmed', () => {
			const installed = basePackages();
			installed.entries[0] = entry('test_pkg1', {
				versions: ['2.0.0'],
				installedVersion: '2.0.0',
				cachedVersions: ['2.0.0'],
				state: 'installed'
			});
			const pm = mockPackageManager(installed);

			mountPackageManager(<App />);

			cy.dataTest('package-card-test_pkg1')
				.find('[data-test="package-action-button"]')
				.click();

			cy.dataTest('uninstall-confirm').click();

			cy.then(() => {
				expect(
					pm.lastCall<{names: string[]}>(
						uninstallPackagesRequest.method
					)?.names
				).to.deep.equal(['test_pkg1']);
			});

			// The card falls back to not-installed once the cache refresh lands.
			cy.dataTest('package-card-test_pkg1')
				.find('[data-test="package-action-button"]')
				.should('not.exist');
		});
	});
});
