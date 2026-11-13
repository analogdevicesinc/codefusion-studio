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

import {getPackageListRequest} from '@constants/messages/package-manager-messages';
import App from '../../app';
import {resetStore, store} from '../../state/store';
import {
	entry,
	mockPackageManager,
	release
} from '../../test-utils/package-manager-mock';
import {mountPackageManager} from '../../test-utils/mount';

/** Opens a filter dropdown. It stays open until toggled again. */
const openFilter = (filter: string) => {
	cy.dataTest(filter).find('button').first().click();
};

/** Toggles one option of the currently open filter dropdown. */
const chooseOption = (value: string) => {
	cy.dataTest(`multiselect-option-${value}`).click();
};

/** Opens a filter dropdown and toggles one of its options. */
const pickFilter = (filter: string, value: string) => {
	openFilter(filter);
	chooseOption(value);
};

/**
 * Three packages that differ by SoC and type, so each metadata filter has
 * something to select on.
 */
const mixedPackages = () => ({
	entries: [
		entry('test_pkg1', {
			versions: ['2.0.0'],
			releases: {
				'2.0.0': release('test_pkg1', '2.0.0', {
					socs: ['plugin1Soc'],
					type: 'sdk'
				})
			}
		}),
		entry('test_pkg2', {
			versions: ['1.0.0'],
			releases: {
				'1.0.0': release('test_pkg2', '1.0.0', {
					socs: ['plugin1Soc'],
					type: 'data-model'
				})
			}
		}),
		entry('test_pkg3', {
			versions: ['1.0.0'],
			installedVersion: '1.0.0',
			cachedVersions: ['1.0.0'],
			state: 'installed',
			releases: {
				'1.0.0': release('test_pkg3', '1.0.0', {
					socs: ['plugin2Soc1'],
					type: 'toolchain'
				})
			}
		})
	],
	// The SoC catalog, which also lists a SoC no package supports.
	socs: [
		{id: 'otherSoc', name: 'otherSoc'},
		{id: 'plugin1Soc', name: 'plugin1Soc'},
		{id: 'plugin2Soc1', name: 'plugin2Soc1'}
	]
});

describe('PackageFilters', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		store.dispatch(resetStore());
	});

	describe('name search', () => {
		it('narrows the list as the user types', () => {
			mockPackageManager(mixedPackages());

			mountPackageManager(<App />);

			cy.dataTest('available-count').should(
				'contain.text',
				'3 available'
			);

			cy.dataTest('package-search').type('pkg2');

			cy.dataTest('package-card-test_pkg2').should('exist');
			cy.dataTest('package-card-test_pkg1').should('not.exist');
			cy.dataTest('package-card-test_pkg3').should('not.exist');
			cy.dataTest('available-count').should(
				'contain.text',
				'1 available'
			);
		});
	});

	describe('required-only chip', () => {
		it('shows only packages a workspace manifest requires', () => {
			mockPackageManager({
				entries: [
					entry('test_pkg1', {
						isRequired: true,
						requiredVersions: ['>=1.0.0']
					}),
					entry('test_pkg3')
				]
			});

			mountPackageManager(<App />);

			cy.dataTest('required-only-chip').click();

			cy.dataTest('package-card-test_pkg1').should('exist');
			cy.dataTest('package-card-test_pkg3').should('not.exist');

			cy.dataTest('required-only-chip').click();
			cy.dataTest('package-card-test_pkg3').should('exist');
		});
	});

	describe('status filter', () => {
		it('separates installed from not-installed packages', () => {
			mockPackageManager(mixedPackages());

			mountPackageManager(<App />);

			pickFilter('status-filter', 'installed');

			cy.dataTest('package-card-test_pkg3').should('exist');
			cy.dataTest('package-card-test_pkg1').should('not.exist');

			// The dropdown stays open, so the second status is a plain toggle.
			// Selecting it widens the result rather than replacing it.
			chooseOption('not-installed');
			cy.dataTest('package-card-test_pkg1').should('exist');
			cy.dataTest('package-card-test_pkg3').should('exist');
		});
	});

	describe('SoC filter', () => {
		it('filters by the SoCs the backend reports for each package', () => {
			mockPackageManager(mixedPackages());

			mountPackageManager(<App />);

			pickFilter('soc-filter', 'plugin2Soc1');

			cy.dataTest('package-card-test_pkg3').should('exist');
			cy.dataTest('package-card-test_pkg1').should('not.exist');
			cy.dataTest('package-card-test_pkg2').should('not.exist');
		});

		it('offers every SoC in the SoC catalog', () => {
			mockPackageManager(mixedPackages());

			mountPackageManager(<App />);

			openFilter('soc-filter');

			cy.dataTest('multiselect-option-plugin1Soc').should('exist');
			cy.dataTest('multiselect-option-plugin2Soc1').should('exist');
			// Offered even though no listed package supports it.
			cy.dataTest('multiselect-option-otherSoc').should('exist');
		});

		it('shows the empty state for a SoC no package supports', () => {
			mockPackageManager(mixedPackages());

			mountPackageManager(<App />);

			pickFilter('soc-filter', 'otherSoc');

			cy.dataTest('empty-packages').should('be.visible');
			cy.dataTest('clear-filters').should('exist');
		});

		it('matches when any version of a package does', () => {
			const pm = mockPackageManager({
				entries: [
					entry('test_pkg_other', {versions: ['1.0.0']}),
					entry('test_pkg1', {
						versions: ['2.0.0', '1.0.0'],
						releases: {
							'2.0.0': release('test_pkg1', '2.0.0', {
								socs: ['plugin2Soc1']
							}),
							'1.0.0': release('test_pkg1', '1.0.0', {
								socs: ['plugin3Soc']
							})
						}
					})
				],
				socs: [
					{id: 'plugin2Soc1', name: 'plugin2Soc1'},
					{id: 'plugin3Soc', name: 'plugin3Soc'}
				]
			});

			mountPackageManager(<App />);
			cy.dataTest('available-count').should(
				'contain.text',
				'2 available'
			);

			let listCalls = 0;
			cy.then(() => {
				listCalls = pm.callCount(getPackageListRequest.method);
			});

			// Only the older version supports plugin3Soc; the package still
			// matches because the filter looks at every version it lists.
			pickFilter('soc-filter', 'plugin3Soc');

			cy.dataTest('package-card-test_pkg1').should('exist');
			cy.dataTest('package-card-test_pkg_other').should('not.exist');
			cy.dataTest('available-count').should(
				'contain.text',
				'1 available'
			);

			cy.then(() => {
				expect(pm.callCount(getPackageListRequest.method)).to.equal(
					listCalls
				);
			});
		});
	});

	describe('type filter', () => {
		it('filters by package type', () => {
			mockPackageManager(mixedPackages());

			mountPackageManager(<App />);

			pickFilter('type-filter', 'toolchain');

			cy.dataTest('package-card-test_pkg3').should('exist');
			cy.dataTest('package-card-test_pkg1').should('not.exist');
		});
	});

	describe('clearing', () => {
		it('restores the full list from the empty state', () => {
			mockPackageManager(mixedPackages());

			mountPackageManager(<App />);

			cy.dataTest('package-search').type('no_such_pkg');

			cy.dataTest('empty-packages').should('be.visible');
			cy.dataTest('clear-filters').click();

			cy.dataTest('package-card-test_pkg1').should('exist');
			cy.dataTest('available-count').should(
				'contain.text',
				'3 available'
			);
		});
	});
});
