/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import CoreSelector from './CoreSelector';
import type {CfsConfig} from 'cfs-plugins-api';
import type {ProjectInfo} from '../../../utils/config';

const max32690Wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			CoreNum: 0,
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: '',
			Secure: true,
			ProjectId: 'CM4-proj',
			CoreId: 'CM4',
			PluginVersion: '1.0.0',
			PlatformConfig: {}
		},
		{
			CoreNum: 1,
			Description: 'Risc-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'RISC-V (RV32)',
			PluginId: '',
			Secure: false,
			ProjectId: 'RV-proj',
			CoreId: 'RV',
			PluginVersion: '1.0.0',
			PlatformConfig: {}
		},
		{
			CoreNum: 2,
			Description: 'ARM Cortex-M4 (Undefined Secure)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'ARM Cortex-M4 (Undefined Secure)',
			PluginId: '',
			Secure: undefined,
			ProjectId: 'CM4-undefined',
			CoreId: 'CM4',
			PluginVersion: '1.0.0',
			PlatformConfig: {},
			Partitions: [],
			Peripherals: []
		}
	]
} as unknown as CfsConfig;

const reduxStore = configurePreloadedStore(
	max32690Wlp,
	mockedConfigDict
);

describe('Core selector', () => {
	it('should show available cores and back button. Selecting a core or clicking cancel should trigger the correct action.', () => {
		const onSelect = cy.stub();
		const onCancel = cy.stub();
		const {Projects} = mockedConfigDict;

		cy.mount(
			<CoreSelector
				title='PERIPHERAL_NAME'
				projectConfig={Projects as unknown as ProjectInfo[]}
				projects={Projects as unknown as ProjectInfo[]}
				peripheralSecurity={'Any'}
				onSelect={onSelect}
				onCancel={onCancel}
			/>,
			reduxStore
		);

		cy.dataTest('allocate-PERIPHERAL_NAME-title').should('exist');

		cy.dataTest('allocate-PERIPHERAL_NAME-title').should(
			'contain.text',
			'Allocate PERIPHERAL_NAME  to: '
		);

		cy.dataTest('core-CM4-proj-container').should('exist');

		cy.dataTest('core-RV-proj-container').should('exist');

		Projects.forEach(project => {
			cy.dataTest(`core-${project.ProjectId}-container`)
				.should('exist')
				.click();
			cy.wrap(onSelect).should(
				'have.been.calledWith',
				project.ProjectId
			);
		});
		cy.dataTest(`core-selector-cancel-btn`).should('exist').click();
		cy.wrap(onCancel).should('have.been.called');
	});

	it('should mark project.Secure=FALSE disabled for peripheralSecurity=Secure', () => {
		const {Projects} = mockedConfigDict;
		const reduxStoreCustom = configurePreloadedStore(
			max32690Wlp,
			mockedConfigDict
		);

		cy.mount(
			<CoreSelector
				title='PERIPHERAL_Secure'
				projectConfig={Projects as unknown as ProjectInfo[]}
				projects={Projects as unknown as ProjectInfo[]}
				peripheralSecurity='Secure'
				onSelect={cy.stub()}
				onCancel={cy.stub()}
			/>,
			reduxStoreCustom
		);

		Projects.forEach(project => {
			const selector = `core-${project.ProjectId}-container`;
			const disabledSelector = `${selector}-disabled`;

			if (project.Secure === false) {
				cy.dataTest(disabledSelector).should('exist');
				cy.dataTest(selector).should('not.exist');
			} else {
				cy.dataTest(selector).should('exist');
				cy.dataTest(disabledSelector).should('not.exist');
			}
		});
	});

	it('should mark project.Secure=TRUE and project.Secure=undefined disabled for peripheralSecurity=Non-Secure', () => {
		const {Projects} = mockedConfigDict;
		const reduxStoreCustom = configurePreloadedStore(
			max32690Wlp,
			mockedConfigDict
		);

		cy.mount(
			<CoreSelector
				title='PERIPHERAL_NonSecure'
				projectConfig={Projects as unknown as ProjectInfo[]}
				projects={Projects as unknown as ProjectInfo[]}
				peripheralSecurity='Non-Secure'
				onSelect={cy.stub()}
				onCancel={cy.stub()}
			/>,
			reduxStoreCustom
		);

		Projects.forEach(project => {
			const selector = `core-${project.ProjectId}-container`;
			const disabledSelector = `${selector}-disabled`;

			if (project.Secure === true || project.Secure === undefined) {
				cy.dataTest(disabledSelector).should('exist');
				cy.dataTest(selector).should('not.exist');
			} else {
				cy.dataTest(selector).should('exist');
				cy.dataTest(disabledSelector).should('not.exist');
			}
		});
	});

	it('should mark all projects enabled for peripheralSecurity=Any', () => {
		const {Projects} = mockedConfigDict;
		const reduxStoreCustom = configurePreloadedStore(
			max32690Wlp,
			mockedConfigDict
		);

		cy.mount(
			<CoreSelector
				title='PERIPHERAL_Any'
				projectConfig={Projects as unknown as ProjectInfo[]}
				projects={Projects as unknown as ProjectInfo[]}
				peripheralSecurity='Any'
				onSelect={cy.stub()}
				onCancel={cy.stub()}
			/>,
			reduxStoreCustom
		);

		Projects.forEach(project => {
			const selector = `core-${project.ProjectId}-container`;
			const disabledSelector = `${selector}-disabled`;

			cy.dataTest(selector).should('exist');
			cy.dataTest(disabledSelector).should('not.exist');
		});
	});
});
