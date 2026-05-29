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

import type {Soc} from '../../../../common/types/soc';
import {configurePreloadedStore} from '../../state/store';
import {addApplicationPackage} from '../../state/slices/application-packages/applicationPackages.reducer';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';
import MCUBootConfig from './mcuboot-config';
import type {ApplicationPackage} from '../../types/application-packages';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

function TestMCUBootConfig() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<MCUBootConfig />
		</LocalizationProvider>
	);
}

const mockPackage: ApplicationPackage = {
	id: 'test-pkg-1',
	name: 'Test Package 1',
	description: 'Test package description',
	enabled: true,
	coreId: ''
};

describe('MCUBootConfig', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});
	it('should render the MCUBootConfig component', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestMCUBootConfig />, reduxStore);

		cy.dataTest('mcuboot-config:container').should('exist');
	});

	it('should render the sidebar', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestMCUBootConfig />, reduxStore);

		cy.dataTest('mcuboot-config:sidebar').should('exist');
	});

	it('should render the main content panel', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addApplicationPackage(mockPackage));

		cy.mount(<TestMCUBootConfig />, reduxStore);

		cy.dataTest('mcuboot-config:application-package-summary').should(
			'exist'
		);
	});

	it('should render the empty state in the sidebar and main panel when no application packages exist', () => {
		const reduxStore = configurePreloadedStore(soc);

		cy.mount(<TestMCUBootConfig />, reduxStore);

		cy.dataTest('mcuboot-config:sidebar').should('exist');
		cy.dataTest('mcuboot-config:empty-sidebar').should('exist');
		cy.dataTest('mcuboot-config:application-package-summary').should(
			'exist'
		);
		cy.dataTest('app-pack-summary:empty-application-packages').should(
			'exist'
		);
	});

	it('should render application package list items in sidebar when packages exist', () => {
		const reduxStore = configurePreloadedStore(soc);
		reduxStore.dispatch(addApplicationPackage(mockPackage));

		cy.mount(<TestMCUBootConfig />, reduxStore);

		cy.dataTest(`sidebar:app-pack-item:${mockPackage.id}`).should(
			'exist'
		);
		cy.contains(mockPackage.name).should('exist');
	});

	it('should display multiple packages in the sidebar', () => {
		const reduxStore = configurePreloadedStore(soc);
		const secondPackage: ApplicationPackage = {
			id: 'test-pkg-2',
			name: 'Test Package 2',
			enabled: true,
			coreId: ''
		};

		reduxStore.dispatch(addApplicationPackage(mockPackage));
		reduxStore.dispatch(addApplicationPackage(secondPackage));

		cy.mount(<TestMCUBootConfig />, reduxStore);

		cy.dataTest(`sidebar:app-pack-item:${mockPackage.id}`).should(
			'exist'
		);
		cy.dataTest(`sidebar:app-pack-item:${secondPackage.id}`).should(
			'exist'
		);
	});
});
