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

import type {Soc} from '../../../../../common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import {
	addApplicationPackage,
	setActivePackageId
} from '../../../state/slices/application-packages/applicationPackages.reducer';
import {LocalizationProvider} from '../../../../../common/contexts/LocaleContext';
import type {ApplicationPackage} from '../../../types/application-packages';
import MCUBootConfigSidebar from './mcuboot-config-sidebar';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

function TestMCUBootConfigSidebar() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<MCUBootConfigSidebar />
		</LocalizationProvider>
	);
}

const mockPackage1: ApplicationPackage = {
	id: 'sidebar-pkg-1',
	name: 'App Pack 1',
	description: 'First package',
	enabled: true
};

const mockPackage2: ApplicationPackage = {
	id: 'sidebar-pkg-2',
	name: 'App Pack 2',
	description: 'Second package',
	enabled: true
};

const mockNewAppPack1: ApplicationPackage = {
	id: 'sidebar-pkg-new-1',
	name: 'New App Pack 1',
	description: 'Auto-generated package',
	enabled: true
};

const mockDisabledPackage: ApplicationPackage = {
	id: 'sidebar-pkg-disabled',
	name: 'Disabled Package',
	description: 'A disabled package',
	enabled: false
};

describe('MCUBootConfigSidebar', () => {
	it('should render the sidebar', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

		cy.dataTest('mcuboot-config:sidebar').should('exist');
	});

	it('should render the "Add App Pack" button', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

		cy.dataTest('mcuboot-config:sidebar:add-app-pack').should(
			'exist'
		);
	});

	describe('when no packages exist', () => {
		it('should display the empty sidebar state', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest('mcuboot-config:empty-sidebar').should('exist');
		});
	});

	describe('when packages exist', () => {
		it('should render list items for each application package', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockPackage1));
			reduxStore.dispatch(addApplicationPackage(mockPackage2));

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest(`sidebar:app-pack-item:${mockPackage1.id}`).should(
				'exist'
			);
			cy.dataTest(`sidebar:app-pack-item:${mockPackage2.id}`).should(
				'exist'
			);
		});

		it('should display the package name and description', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockPackage1));

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.contains(mockPackage1.name).should('exist');
			cy.contains(mockPackage1.description!).should('exist');
		});

		it('should show the disabled icon for disabled packages', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockDisabledPackage));

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest(
				`sidebar:app-pack-item:${mockDisabledPackage.id}`
			).within(() => {
				cy.get('svg').should('exist');
			});
		});

		it('should set the active package id when clicking a package item', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockPackage1));
			reduxStore.dispatch(addApplicationPackage(mockPackage2));
			reduxStore.dispatch(setActivePackageId(mockPackage2.id));

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest(`sidebar:app-pack-item:${mockPackage1.id}`).click();

			cy.then(() => {
				const state = reduxStore.getState();
				expect(
					state.applicationPackagesReducer.activePackageId
				).to.equal(mockPackage1.id);
			});
		});

		it('should activate a package item via keyboard Enter key', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockPackage1));
			reduxStore.dispatch(addApplicationPackage(mockPackage2));
			reduxStore.dispatch(setActivePackageId(mockPackage2.id));

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest(`sidebar:app-pack-item:${mockPackage1.id}`)
				.focus()
				.type('{enter}');

			cy.then(() => {
				const state = reduxStore.getState();
				expect(
					state.applicationPackagesReducer.activePackageId
				).to.equal(mockPackage1.id);
			});
		});
	});

	describe('adding a new package', () => {
		it('should add a new package when clicking the add button', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest('mcuboot-config:sidebar:add-app-pack')
				.should('exist')
				.click();

			cy.then(() => {
				const state = reduxStore.getState();
				expect(
					state.applicationPackagesReducer.applicationPackages
				).to.have.length(1);
				expect(
					state.applicationPackagesReducer.applicationPackages[0].name
				).to.equal('New App Pack 1');
			});
		});

		it('should increment the package name counter for subsequent additions', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockNewAppPack1));

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest('mcuboot-config:sidebar:add-app-pack')
				.should('exist')
				.click();

			cy.then(() => {
				const state = reduxStore.getState();
				expect(
					state.applicationPackagesReducer.applicationPackages
				).to.have.length(2);
				expect(
					state.applicationPackagesReducer.applicationPackages[1].name
				).to.equal('New App Pack 2');
			});
		});

		it('should reuse available name when a gap exists after deletion', () => {
			const reduxStore = configurePreloadedStore(soc);
			reduxStore.dispatch(addApplicationPackage(mockNewAppPack1));
			const mockNewAppPack3: ApplicationPackage = {
				id: 'sidebar-pkg-new-3',
				name: 'New App Pack 3',
				description: '',
				enabled: true
			};

			reduxStore.dispatch(addApplicationPackage(mockNewAppPack3));

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest('mcuboot-config:sidebar:add-app-pack')
				.should('exist')
				.click();

			cy.then(() => {
				const state = reduxStore.getState();
				expect(
					state.applicationPackagesReducer.applicationPackages
				).to.have.length(3);
				expect(
					state.applicationPackagesReducer.applicationPackages[2].name
				).to.equal('New App Pack 2');
			});
		});

		it('should set the newly added package as active', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest('mcuboot-config:sidebar:add-app-pack')
				.should('exist')
				.click();

			cy.then(() => {
				const state = reduxStore.getState();
				const newPkg =
					state.applicationPackagesReducer.applicationPackages[0];
				expect(
					state.applicationPackagesReducer.activePackageId
				).to.equal(newPkg.id);
			});
		});

		it('should hide empty state after adding a package', () => {
			const reduxStore = configurePreloadedStore(soc);

			cy.mount(<TestMCUBootConfigSidebar />, reduxStore);

			cy.dataTest('mcuboot-config:empty-sidebar').should('exist');

			cy.dataTest('mcuboot-config:sidebar:add-app-pack')
				.should('exist')
				.click();

			cy.dataTest('mcuboot-config:empty-sidebar').should('not.exist');
			cy.contains('New App Pack 1').should('exist');
		});
	});
});
