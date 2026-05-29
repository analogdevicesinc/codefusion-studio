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

import {type Soc} from '../../../../../common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import WorksProjectsTable from './workspace-projects-table';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import {
	setActivePeripheral,
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {MemoryFiltering} from '../../memory-allocation/memory-filtering/memory-filtering';

const mock = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

import type {CfsConfig} from 'cfs-types';
import CoreSummary from '../../peripheral-config/core-summary/CoreSummary';
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

describe('Workspace Projects Table', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
	});

	it('should render the workspace table', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);
		cy.mount(<WorksProjectsTable />, reduxStore);

		cy.get('[data-test="workspace-table"]').should('be.visible');
	});

	it('should not render the conflict icon when there are no errors', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F2',
				Peripheral: 'GPIO0',
				Name: 'P0.11'
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.11',
				projectId: 'RV-proj'
			})
		);

		reduxStore.dispatch(setActivePeripheral('GPIO0'));

		cy.mount(<WorksProjectsTable />, reduxStore);

		cy.get('[data-test="workspace-table"]').should('be.visible');
		cy.get('[data-test="pin-error-RV"]').should('not.exist');
		cy.get('[data-test="pin-error-CM4"]').should('not.exist');
		cy.get('[data-test="peripheral-error-RV-proj"]').should(
			'not.exist'
		);
		cy.get('[data-test="peripheral-error-M4-proj"]').should(
			'not.exist'
		);
	});

	it('should render the conflict icon when there is a pin error', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F2',
				Peripheral: 'GPIO0',
				Name: 'P0.9'
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F2',
				Peripheral: 'ACD',
				Name: 'CLK_EXT'
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.9',
				projectId: 'RV-proj'
			})
		);

		cy.mount(<WorksProjectsTable />, reduxStore).then(() => {
			cy.get('[data-test="workspace-table"]').should('be.visible');
			cy.get('[data-test="pin-error-RV-proj"]').should('exist');
		});
	});

	it('should render one conflict icon when there is a peripheral config error', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		reduxStore.dispatch(
			setSignalGroupAssignment({
				peripheral: 'SPI0',
				projectId: 'RV-proj',
				config: {
					MODE: 'FOUR_WIRE',
					DIRECTION: 'TARGET',
					WORD_SIZE: '16',
					PHASE_POL_MODE: '0',
					CS0_POLARITY: 'ACTIVE_LOW',
					CS1_POLARITY: 'ACTIVE_LOW',
					CS2_POLARITY: 'ACTIVE_LOW',
					RECEIVE_DMA_ENABLE: 'TRUE',
					TRANSMIT_DMA_ENABLE: 'FALSE',
					FREQ: '15000000'
				}
			})
		);

		cy.mount(<WorksProjectsTable />, reduxStore).then(() => {
			cy.get('[data-test="workspace-table"]').should('be.visible');
			cy.get('[data-test="peripheral-error-RV-proj"]').should(
				'exist'
			);
			cy.get('[data-test="peripheral-error-M4-proj"]').should(
				'not.exist'
			);
		});
	});

	it('should render one conflict icon when a GPIO pin is unassigned in one project', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.7',
				projectId: 'CM4-proj'
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'G2',
				Peripheral: 'GPIO0',
				Name: 'P0.7'
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.4',
				projectId: 'RV-proj'
			})
		);

		cy.mount(<WorksProjectsTable />, reduxStore).then(() => {
			cy.get('[data-test="workspace-table"]').should('be.visible');
			cy.get('[data-test="peripheral-error-CM4-proj"]').should(
				'not.exist'
			);
			cy.get('[data-test="peripheral-error-RV-proj"]').should(
				'exist'
			);
		});
	});

	it('should render two conflict icons when GPIO pins are unassigned in both projects', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.7',
				projectId: 'CM4-proj'
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.4',
				projectId: 'RV-proj'
			})
		);

		cy.mount(<WorksProjectsTable />, reduxStore).then(() => {
			cy.get('[data-test="workspace-table"]').should('be.visible');
			cy.get('[data-test="peripheral-error-CM4-proj"]').should(
				'exist'
			);
			cy.get('[data-test="peripheral-error-RV-proj"]').should(
				'exist'
			);
		});
	});

	it('should filter memory allocation by core when assigned memory is clicked', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F2',
				Peripheral: 'GPIO0',
				Name: 'P0.9'
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.9',
				projectId: 'RV-proj'
			})
		);

		cy.mount(<WorksProjectsTable />, reduxStore).then(() => {
			cy.get('[data-test="assigned-memory-button"]').first().click();

			cy.mount(<MemoryFiltering />, reduxStore).then(() => {
				expect(
					reduxStore.getState().appContextReducer.projectFilter
				).to.deep.equal([mockedConfigDict.Projects[0].ProjectId]);
			});

			cy.get('[data-test="project-filter"]').should(
				'include.text',
				'1'
			);
		});

		cy.mount(<WorksProjectsTable />, reduxStore);

		expect(
			reduxStore.getState().appContextReducer.projectFilter
		).to.deep.equal([]);
	});

	it('should expand core project card when assigned peripheral is clicked', () => {
		const reduxStore = configurePreloadedStore(
			mock,
			mockedConfigDict
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F2',
				Peripheral: 'GPIO0',
				Name: 'P0.9'
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.9',
				projectId: 'RV-proj'
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F3',
				Peripheral: 'GPIO1',
				Name: 'P0.11'
			})
		);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO1',
				signalName: 'P0.11',
				projectId: 'CM4-proj'
			})
		);

		cy.mount(<WorksProjectsTable />, reduxStore).then(() => {
			cy.get('[data-test="assigned-peripherals-button"]')
				.first()
				.click();

			cy.mount(<CoreSummary />, reduxStore);

			// Check if expected project card is expanded
			cy.dataTest('accordion:GPIO0').should('exist');

			// Check if other project card is collapsed
			cy.dataTest('accordion:GPIO1').should('not.exist');
		});
	});
});
