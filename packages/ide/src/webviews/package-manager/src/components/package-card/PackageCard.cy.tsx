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

import {openLicensePreviewRequest} from '@constants/messages/package-manager-messages';
import PackageCard from './PackageCard';
import {resetStore, store} from '../../state/store';
import {
	entry,
	mockPackageManager,
	release
} from '../../test-utils/package-manager-mock';
import {mountPackageManagerComponent} from '../../test-utils/mount';

/** Opens the version dropdown and picks a version. */
const selectVersion = (packageName: string, version: string) => {
	cy.dataTest(`version-dropdown-${packageName}`).click();
	cy.dataTest(`version-option-${version}`).click();
};

describe('PackageCard', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		store.dispatch(resetStore());
	});

	describe('expansion and details', () => {
		it('reveals the package metadata rows once expanded', () => {
			mockPackageManager();

			mountPackageManagerComponent(
				<PackageCard
					entry={entry('test_pkg1', {
						versions: ['2.0.0'],
						releases: {
							'2.0.0': release('test_pkg1', '2.0.0', {
								description: 'Test package one',
								type: 'sdk',
								cfsVersionConstraint: '^1.4.0',
								license: 'Apache-2.0',
								socs: ['plugin1Soc', 'plugin2Soc1']
							})
						}
					})}
				/>
			);

			// Collapsed by default.
			cy.dataTest('package-details-test_pkg1').should('not.exist');

			cy.dataTest('expand-test_pkg1').click();

			cy.dataTest('package-details-test_pkg1').should('be.visible');
			cy.dataTest('detail-description').should(
				'contain.text',
				'Test package one'
			);
			cy.dataTest('detail-type').should('contain.text', 'sdk');
			cy.dataTest('detail-cfs-version').should(
				'contain.text',
				'^1.4.0'
			);
			cy.dataTest('detail-license').should(
				'contain.text',
				'Apache-2.0'
			);
			cy.dataTest('detail-socs').should(
				'contain.text',
				'plugin1Soc, plugin2Soc1'
			);

			cy.dataTest('expand-test_pkg1').click();
			cy.dataTest('package-details-test_pkg1').should('not.exist');
		});

		it('lists cached versions other than the installed one', () => {
			mockPackageManager();

			mountPackageManagerComponent(
				<PackageCard
					entry={entry('test_pkg1', {
						versions: ['2.0.0', '1.0.0'],
						cachedVersions: ['2.0.0', '1.0.0'],
						installedVersion: '1.0.0',
						state: 'installed'
					})}
				/>
			);

			cy.dataTest('expand-test_pkg1').click();

			// The installed version is reported by the status line, so the
			// cached row lists only what else is sitting in the conan cache.
			cy.dataTest('detail-cached-versions')
				.should('contain.text', 'v2.0.0')
				.and('not.contain.text', 'v1.0.0');
		});

		it('shows dashes for a version the catalog does not list', () => {
			mockPackageManager();

			// 1.0.0 is only in the local cache: the list knows the version but
			// the catalog has no metadata for it.
			mountPackageManagerComponent(
				<PackageCard
					entry={{
						...entry('test_pkg1', {versions: ['2.0.0']}),
						versions: ['2.0.0', '1.0.0'],
						cachedVersions: ['1.0.0']
					}}
				/>
			);

			cy.dataTest('expand-test_pkg1').click();
			selectVersion('test_pkg1', '1.0.0');

			cy.dataTest('detail-description').should('contain.text', '—');
			cy.dataTest('detail-license').should('contain.text', '—');
			cy.dataTest('details-error').should('not.exist');
		});
	});

	describe('version selection', () => {
		it('shows the selected version’s metadata', () => {
			const pm = mockPackageManager();

			mountPackageManagerComponent(
				<PackageCard
					entry={entry('test_pkg1', {
						versions: ['2.0.0', '1.0.0'],
						releases: {
							'2.0.0': release('test_pkg1', '2.0.0', {
								description: 'the newer one'
							}),
							'1.0.0': release('test_pkg1', '1.0.0', {
								description: 'the older one'
							})
						}
					})}
				/>
			);

			cy.dataTest('expand-test_pkg1').click();
			cy.dataTest('detail-description').should(
				'contain.text',
				'the newer one'
			);

			selectVersion('test_pkg1', '1.0.0');

			cy.dataTest('detail-description').should(
				'contain.text',
				'the older one'
			);

			// No backend request is made.
			cy.then(() => {
				expect(Object.keys(pm.calls)).to.deep.equal([]);
			});
		});

		it('warns when a required package is pinned outside its range', () => {
			mockPackageManager();

			mountPackageManagerComponent(
				<PackageCard
					entry={entry('test_pkg1', {
						versions: ['3.0.0', '2.0.0', '1.0.0'],
						isRequired: true,
						requiredVersions: ['>=2.0.0']
					})}
				/>
			);

			// Defaults to the latest satisfying version, so no warning yet.
			cy.dataTest('version-out-of-range-test_pkg1').should(
				'not.exist'
			);

			selectVersion('test_pkg1', '1.0.0');

			cy.dataTest('version-out-of-range-test_pkg1').should(
				'be.visible'
			);
		});

		it('shows the range the workspace requires', () => {
			mockPackageManager();

			mountPackageManagerComponent(
				<PackageCard
					entry={entry('test_pkg1', {
						versions: ['3.0.0', '2.0.0', '1.0.0'],
						isRequired: true,
						requiredVersions: ['>=2.0.0']
					})}
				/>
			);

			// Only 2.0.0 and 3.0.0 satisfy the constraint.
			cy.dataTest('required-version-range')
				.should('contain.text', 'v2.0.0')
				.and('contain.text', 'v3.0.0');
		});

		it('leaves an unrequired package unconstrained', () => {
			mockPackageManager();

			mountPackageManagerComponent(
				<PackageCard
					entry={entry('test_pkg1', {
						versions: ['3.0.0', '1.0.0']
					})}
				/>
			);

			cy.dataTest('required-version-range').should('not.exist');

			selectVersion('test_pkg1', '1.0.0');

			cy.dataTest('version-out-of-range-test_pkg1').should(
				'not.exist'
			);
		});
	});

	describe('license preview', () => {
		it('asks the extension to open the preview for the selected version', () => {
			const pm = mockPackageManager();

			mountPackageManagerComponent(
				<PackageCard
					entry={entry('test_pkg1', {
						versions: ['2.0.0'],
						releases: {
							'2.0.0': release('test_pkg1', '2.0.0', {
								license: 'BSD-3-Clause'
							})
						}
					})}
				/>
			);

			cy.dataTest('expand-test_pkg1').click();
			cy.dataTest('view-license').click();

			// The preview opens as a separate panel on the extension side, so
			// all the card can do — and all this asserts — is send the request.
			cy.then(() => {
				expect(
					pm.lastCall(openLicensePreviewRequest.method)
				).to.deep.equal({
					name: 'test_pkg1',
					version: '2.0.0',
					license: 'BSD-3-Clause'
				});
			});
		});
	});
});
