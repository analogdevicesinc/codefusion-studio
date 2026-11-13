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

import type {CfsPackageReference} from 'cfs-package-manager';
import {
	customRemoteIndexingType,
	getPackageDependenciesBatchRequest,
	getInstallPlanRequest,
	installPackagesRequest
} from '@constants/messages/package-manager-messages';
import {sendMockMessage} from '../../common/test-utils/messenger-mock';
import App from './app';
import {resetStore, store} from './state/store';
import {remoteIndexingChanged} from './state/slices/remotes/remotes.reducer';
import {
	entry,
	mockPackageManager,
	referenceKey
} from './test-utils/package-manager-mock';
import {mountPackageManager} from './test-utils/mount';

/** Package names of a reference list, for order-sensitive assertions. */
const names = (references: CfsPackageReference[] = []): string[] =>
	references.map(reference => reference.name);

/** Two-package backend state used by most tests below. */
const basePackages = () => ({
	entries: [
		entry('test_pkg1', {versions: ['2.0.0', '1.0.0']}),
		entry('test_pkg2', {versions: ['1.2.0']})
	]
});

describe('Package manager - review and install', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		store.dispatch(resetStore());
	});

	describe('review step', () => {
		it('lists the dependencies the backend resolved for the selection', () => {
			mockPackageManager({
				...basePackages(),
				dependencies: {
					[referenceKey('test_pkg1', '2.0.0')]: [
						{name: 'test_pkg_dep1', version: '5.9.0'}
					]
				}
			});

			mountPackageManager(<App />);

			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();

			cy.contains('Review Summary').should('be.visible');
			cy.contains('test_pkg_dep1').should('be.visible');
		});

		it('reports a version conflict and blocks the install', () => {
			// Conan names the requirements that clashed; the notice names the
			// selections that pulled them in, read from the per-package
			// closures the sequential fallback resolved.
			const conflictingRequirements: CfsPackageReference[] = [
				{name: 'test_pkg_dep1', version: '1.0.0'},
				{name: 'test_pkg_dep1', version: '2.0.0'}
			];

			mockPackageManager({
				...basePackages(),
				dependencies: {
					[referenceKey('test_pkg1', '2.0.0')]: [
						{name: 'test_pkg_dep1', version: '1.0.0'}
					],
					[referenceKey('test_pkg2', '1.2.0')]: [
						{name: 'test_pkg_dep1', version: '2.0.0'}
					]
				},
				conflict: {
					packageName: 'test_pkg_dep1',
					conflictingRequirements
				}
			});

			mountPackageManager(<App />);

			cy.dataTest('select-all').click();
			cy.dataTest('list-action-bar-primary').click();

			cy.dataTest('conflict-notice')
				.should('be.visible')
				.and('contain.text', 'cannot be installed together')
				.and('contain.text', 'test_pkg1/2.0.0')
				.and('contain.text', 'test_pkg2/1.2.0');

			// The conflict is a settled answer, so Continue stays blocked.
			cy.dataTest('review-action-bar-primary').should(
				'have.attr',
				'disabled'
			);
		});

		it('reports a non-conflict resolution failure without blaming the selection', () => {
			mockPackageManager({
				...basePackages(),
				resolutionFailure: 'conan graph command failed'
			});

			mountPackageManager(<App />);

			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();

			cy.dataTest('resolution-failure')
				.should('be.visible')
				.and('contain.text', 'conan graph command failed');
			cy.dataTest('conflict-notice').should('not.exist');
		});

		it('reports the message of a rejected resolution request', () => {
			// The messenger rejects with a plain `{message, data}` object, so
			// reading it as an Error would show "[object Object]".
			const pm = mockPackageManager(basePackages());
			pm.fail(
				getPackageDependenciesBatchRequest.method,
				'conan graph command failed'
			);

			mountPackageManager(<App />);

			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();

			cy.dataTest('resolution-failure')
				.should('be.visible')
				.and('contain.text', 'conan graph command failed')
				.and('not.contain.text', '[object Object]');
		});

		it('goes back to the list with the selection intact', () => {
			mockPackageManager(basePackages());

			mountPackageManager(<App />);

			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();
			cy.contains('Review Summary').should('be.visible');

			cy.dataTest('review-action-bar-secondary').click();

			cy.contains('Review Summary').should('not.exist');
			cy.dataTest('selected-count').should(
				'contain.text',
				'1 item selected'
			);
		});
	});

	describe('install', () => {
		it('installs the selection and leaves its dependencies to the backend', () => {
			const pm = mockPackageManager({
				...basePackages(),
				dependencies: {
					[referenceKey('test_pkg1', '2.0.0')]: [
						{name: 'test_pkg_dep1', version: '5.9.0'}
					]
				}
			});

			mountPackageManager(<App />);

			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();
			cy.dataTest('review-action-bar-primary').click();

			// The selection is not cached, so its license is still waiting to
			// be accepted and the install goes via the license page.
			cy.contains('Review Licenses').should('be.visible');
			cy.dataTest('license-action-bar-primary').click();

			cy.dataTest('install-status-test_pkg1').should(
				'contain.text',
				'OK'
			);

			cy.then(() => {
				// The plan covers only what was asked for — test_pkg_dep1 is
				// shown in the review but resolved by the backend at install
				// time, so it is not part of the request.
				const params = pm.lastCall<{
					packages: CfsPackageReference[];
					options: {acceptLicense?: boolean};
				}>(installPackagesRequest.method);

				expect(params?.options.acceptLicense).to.equal(true);
				expect(names(params?.packages)).to.deep.equal(['test_pkg1']);
			});
		});

		it('installs a plan without licenses once when it arrives late', () => {
			// Cached, so the plan needs no license acceptance
			const packages = basePackages();
			packages.entries[0] = entry('test_pkg1', {
				versions: ['2.0.0'],
				cachedVersions: ['2.0.0']
			});
			const pm = mockPackageManager(packages);
			pm.hold(getInstallPlanRequest.method);
			mountPackageManager(<App />);
			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();
			// The plan is still loading, so this goes to the license page
			cy.dataTest('review-action-bar-primary').click();

			cy.then(() => {
				pm.flush(getInstallPlanRequest.method);
			});
			cy.dataTest('install-status-test_pkg1').should('exist');
			cy.then(() => {
				expect(pm.callCount(installPackagesRequest.method)).to.equal(
					1
				);
			});
		});

		it('flags a failed install instead of reporting success', () => {
			mockPackageManager({...basePackages(), installFails: true});

			mountPackageManager(<App />);

			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();
			cy.dataTest('review-action-bar-primary').click();
			cy.contains('Review Licenses').should('be.visible');
			cy.dataTest('license-action-bar-primary').click();

			cy.dataTest('install-status-test_pkg1').should(
				'contain.text',
				'Failed'
			);
		});

		it('keeps the package installed when the backend skipped it as a no-op', () => {
			const pm = mockPackageManager(basePackages());

			mountPackageManager(<App />);

			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();
			cy.dataTest('review-action-bar-primary').click();
			cy.contains('Review Licenses').should('be.visible');

			// The backend's pre-install plan finds it already present at the
			// requested version, so it reports it as skipped, not installed.
			cy.then(() => {
				pm.state.entries[0].installedVersion = '2.0.0';
			});

			cy.dataTest('license-action-bar-primary').click();

			cy.dataTest('install-status-test_pkg1').should(
				'contain.text',
				'Already Installed'
			);
		});
	});

	describe('while custom remotes are indexed', () => {
		afterEach(() => {
			// Indexing state survives store resets, like the real extension's
			store.dispatch(remoteIndexingChanged({remotes: []}));
		});

		it('disables Continue until indexing ends', () => {
			mockPackageManager({
				...basePackages(),
				indexingRemotes: ['granite']
			});
			mountPackageManager(<App />);
			cy.dataTest('package-checkbox-test_pkg1').click();

			cy.dataTest('list-action-bar-primary').should(
				'have.attr',
				'disabled'
			);

			cy.then(() => {
				sendMockMessage(customRemoteIndexingType.method, {
					remotes: []
				});
			});
			cy.dataTest('list-action-bar-primary').should(
				'not.have.attr',
				'disabled'
			);
		});

		it('disables uninstalling', () => {
			const packages = basePackages();
			packages.entries[0] = entry('test_pkg1', {
				versions: ['2.0.0'],
				installedVersion: '2.0.0',
				cachedVersions: ['2.0.0'],
				state: 'installed'
			});
			mockPackageManager({...packages, indexingRemotes: ['granite']});
			mountPackageManager(<App />);

			cy.dataTest('package-card-test_pkg1')
				.find('[data-test="package-action-button"]')
				.should('have.attr', 'disabled');
		});

		const startIndexing = () => {
			cy.then(() => {
				sendMockMessage(customRemoteIndexingType.method, {
					remotes: ['granite']
				});
			});
		};

		it('disables Continue on the review step once indexing starts', () => {
			mockPackageManager(basePackages());
			mountPackageManager(<App />);
			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();
			cy.dataTest('review-action-bar-primary').should(
				'not.have.attr',
				'disabled'
			);

			startIndexing();
			cy.dataTest('review-action-bar-primary').should(
				'have.attr',
				'disabled'
			);
		});

		it('disables installing on the license step once indexing starts', () => {
			mockPackageManager(basePackages());
			mountPackageManager(<App />);
			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();
			cy.dataTest('review-action-bar-primary').click();
			cy.dataTest('license-action-bar-primary').should(
				'not.have.attr',
				'disabled'
			);

			startIndexing();
			cy.dataTest('license-action-bar-primary').should(
				'have.attr',
				'disabled'
			);
		});

		it('waits for indexing before installing a plan without licenses', () => {
			// Cached, so the plan needs no license acceptance
			const packages = basePackages();
			packages.entries[0] = entry('test_pkg1', {
				versions: ['2.0.0'],
				cachedVersions: ['2.0.0']
			});
			const pm = mockPackageManager(packages);
			pm.hold(getInstallPlanRequest.method);
			mountPackageManager(<App />);
			cy.dataTest('package-checkbox-test_pkg1').click();
			cy.dataTest('list-action-bar-primary').click();
			// The plan is still loading, so this goes to the license page
			cy.dataTest('review-action-bar-primary').click();

			startIndexing();
			cy.then(() => {
				pm.flush(getInstallPlanRequest.method);
			});
			cy.dataTest('license-action-bar-primary').should(
				'have.attr',
				'disabled'
			);
			cy.then(() => {
				expect(pm.callCount(installPackagesRequest.method)).to.equal(
					0
				);
			});

			cy.then(() => {
				sendMockMessage(customRemoteIndexingType.method, {
					remotes: []
				});
			});
			cy.dataTest('install-status-test_pkg1').should('exist');
			cy.then(() => {
				expect(pm.callCount(installPackagesRequest.method)).to.equal(
					1
				);
			});
		});

		it('disables confirming an uninstall once indexing starts', () => {
			const packages = basePackages();
			packages.entries[0] = entry('test_pkg1', {
				versions: ['2.0.0'],
				installedVersion: '2.0.0',
				cachedVersions: ['2.0.0'],
				state: 'installed'
			});
			mockPackageManager(packages);
			mountPackageManager(<App />);
			cy.dataTest('package-card-test_pkg1')
				.find('[data-test="package-action-button"]')
				.click();
			cy.dataTest('uninstall-confirm').should(
				'not.have.attr',
				'disabled'
			);

			startIndexing();
			cy.dataTest('uninstall-confirm').should(
				'have.attr',
				'disabled'
			);
		});
	});
});
