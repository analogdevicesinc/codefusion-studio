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
	setSignalAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {MemoryFiltering} from '../../memory-allocation/memory-filtering/memory-filtering';
import CoreSummaryFilters from '../../peripheral-config/core-summary/CoreSummaryFilters';
import {fn} from '@storybook/test';

const mock = (await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default)) as Soc;

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	projects: [
		{
			CoreNum: 1,
			Description: 'RISC-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'RV',
			ProjectId: 'RV-proj',
			Name: 'RISC-V (RV32)',
			PluginId: ''
		}
	]
};

describe('Workspace Projects Table', () => {
	beforeEach(() => {
		localStorage.setItem('Package', JSON.stringify(mock.Packages[0]));

		localStorage.setItem(
			'Peripherals',
			JSON.stringify(mock.Peripherals)
		);

		window.localStorage.setItem(
			'configDict',
			JSON.stringify(mockedConfigDict)
		);

		localStorage.setItem('Cores', JSON.stringify(mock.Cores));

		cy.viewport(1920, 1080);
	});

	it('should render the workspace table', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
		);
		cy.mount(<WorksProjectsTable />, reduxStore);

		cy.get('[data-test="workspace-table"]').should('be.visible');
	});

	it('should not render the conflict icon when there is no pin errors', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
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
	});

	it('should render the conflict icon when there is a pin error', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
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

	it('should filter memory allocation by core when assigned memory is clicked', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
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
			cy.get('[data-test="assigned-memory-button"]').click();

			cy.mount(<MemoryFiltering />, reduxStore).then(() => {
				expect(
					reduxStore.getState().appContextReducer.coresFilter
				).to.deep.equal(['RISC-V (RV32)']);
			});

			cy.get('[data-test="core-filter"]').should('include.text', '1');
		});

		cy.mount(<WorksProjectsTable />, reduxStore);

		expect(
			reduxStore.getState().appContextReducer.coresFilter
		).to.deep.equal([]);
	});

	it('should filter peripherals by core when assigned peripheral is clicked', () => {
		const reduxStore = configurePreloadedStore(
			mock as unknown as Soc
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
			cy.get('[data-test="assigned-peripherals-button"]').click();

			const core = {
				Name: 'RISC_V',
				Description: 'RISC_V',
				Id: 'RV',
				CoreNum: 0,
				IsPrimary: true,
				Memory: []
			};

			cy.mount(
				<CoreSummaryFilters
					cores={[core]}
					activeCore={core}
					onFilterCores={fn()}
				/>,
				reduxStore
			).then(() => {
				expect(
					reduxStore.getState().appContextReducer.coresFilter
				).to.deep.equal(['RISC-V (RV32)']);
			});
		});

		cy.mount(<WorksProjectsTable />, reduxStore);

		expect(
			reduxStore.getState().appContextReducer.coresFilter
		).to.deep.equal([]);
	});
});
