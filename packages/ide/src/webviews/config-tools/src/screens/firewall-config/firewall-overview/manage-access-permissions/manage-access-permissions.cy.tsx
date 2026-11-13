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

import type {CfsConfig} from 'cfs-types';
import type {Soc} from '../../../../../../common/types/soc';
import {configurePreloadedStore} from '../../../../state/store';
import {LocalizationProvider} from '../../../../../../common/contexts/LocaleContext';
import {ManageAccessPermissions} from './manage-access-permissions';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			CoreNum: 1,
			Description: 'RISC-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'RV',
			ProjectId: 'RV-proj',
			Name: 'RISC-V (RV32)',
			PluginId: ''
		},
		{
			CoreNum: 2,
			Description: 'CM4 (ARM)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM4',
			ProjectId: 'CM4-proj',
			Name: 'ARM Cortex-M4',
			PluginId: ''
		}
	]
} as unknown as CfsConfig;

const emptyConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: []
} as unknown as CfsConfig;

function TestManageAccessPermissions() {
	return (
		<LocalizationProvider namespace='cfgtools'>
			<ManageAccessPermissions />
		</LocalizationProvider>
	);
}

describe('ManageAccessPermissions', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the manage access permissions view', () => {
		const reduxStore = configurePreloadedStore(soc, mockedConfigDict);

		cy.mount(<TestManageAccessPermissions />, reduxStore);

		cy.dataTest('manage-access-permissions').should('exist');
		cy.dataTest('manage-access-permissions:table').should('exist');
	});

	it('should display the project count badge matching the number of projects', () => {
		const reduxStore = configurePreloadedStore(soc, mockedConfigDict);

		cy.mount(<TestManageAccessPermissions />, reduxStore);

		cy.dataTest('manage-access-permissions:count').should(
			'contain.text',
			'2'
		);
	});

	it('should render a row for each core initiator project', () => {
		const reduxStore = configurePreloadedStore(soc, mockedConfigDict);

		cy.mount(<TestManageAccessPermissions />, reduxStore);

		cy.contains('RISC-V (RV32)').should('exist');
		cy.contains('ARM Cortex-M4').should('exist');
	});

	it('should render a zero count when there are no projects', () => {
		const reduxStore = configurePreloadedStore(soc, emptyConfigDict);

		cy.mount(<TestManageAccessPermissions />, reduxStore);

		cy.dataTest('manage-access-permissions').should('exist');
		cy.dataTest('manage-access-permissions:count').should(
			'contain.text',
			'0'
		);
	});
});
