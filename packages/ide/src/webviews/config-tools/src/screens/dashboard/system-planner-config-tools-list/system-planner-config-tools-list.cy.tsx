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
import {
	setClockNodeControlValue,
	setDiagramData
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import {configurePreloadedStore} from '../../../state/store';
import SystemPlannerConfigToolsList from './system-planner-config-tools-list';

const wlp = (await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default)) as Soc;

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	projects: [
		{
			CoreNum: 0,
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM4',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		},
		{
			CoreNum: 1,
			Description: 'RISC-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'RV',
			Name: 'RISC-V (RV32)',
			PluginId: '',
			ProjectId: 'RV-proj'
		}
	]
};

describe('System config tools', () => {
	beforeEach(() => {
		cy.viewport(1280, 720);

		window.localStorage.setItem(
			'configDict',
			JSON.stringify(mockedConfigDict)
		);

		window.localStorage.setItem(
			'Package',
			JSON.stringify(wlp.Packages[0])
		);

		window.localStorage.setItem('Cores', JSON.stringify(wlp.Cores));

		window.localStorage.setItem(
			'Peripherals',
			JSON.stringify(wlp.Peripherals)
		);

		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			window.localStorage.setItem(
				'pluginControls:CM4-proj',
				JSON.stringify(controls)
			);
		});
	});

	it('should render config tools cards', () => {
		const reduxStore = configurePreloadedStore(wlp);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="peripheral-card"]').should('be.visible');
		cy.get('[data-test="pinmux-card"]').should('be.visible');
		cy.get('[data-test="clock-card"]').should('be.visible');
		cy.get('[data-test="memory-card"]').should('be.visible');
		cy.get('[data-test="registers-card"]').should('be.visible');
		cy.get('[data-test="generate-card"]').should('be.visible');
	});

	it('should not render the conflict icon when there is no pin errors', () => {
		const reduxStore = configurePreloadedStore(wlp);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F2',
				Peripheral: 'GPIO0',
				Name: 'P0.11'
			})
		);

		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="pinmux-card"]').should('be.visible');
		cy.get('[data-test="pinmux-error"]').should('not.exist');
	});

	it('should render the conflict icon when there is a clock error', () => {
		const reduxStore = configurePreloadedStore(wlp);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F4',
				Peripheral: 'MISC',
				Name: 'CLKEXT'
			})
		);

		reduxStore.dispatch(
			setDiagramData({
				'P0.23': {
					enabled: true,
					error: true
				}
			})
		);

		reduxStore.dispatch(
			setClockNodeControlValue({
				name: 'SYS_OSC Mux',
				key: 'MUX',
				value: 'CLKEXT'
			})
		);

		reduxStore.dispatch(
			setClockNodeControlValue({
				name: 'P0.23',
				key: 'P0_23_FREQ',
				value: '100000000',
				error: 'INVALID_MAX_VAL'
			})
		);

		cy.mount(<SystemPlannerConfigToolsList />, reduxStore).then(
			() => {
				cy.get('[data-test="clock-card"]').should('be.visible');
				cy.get('[data-test="clock-config-error"]').should('exist');
			}
		);
	});

	it('should render the conflict icon when there is a pin error', () => {
		const reduxStore = configurePreloadedStore(wlp);

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

		cy.mount(<SystemPlannerConfigToolsList />, reduxStore).then(
			() => {
				cy.get('[data-test="pinmux-card"]').should('be.visible');
				cy.get('[data-test="pinmux-error"]').should('exist');
			}
		);
	});

	it('should render the conflict icon when there is a peripheral error', () => {
		const reduxStore = configurePreloadedStore(wlp);

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

		cy.mount(<SystemPlannerConfigToolsList />, reduxStore).then(
			() => {
				cy.get('[data-test="peripheral-card"]').should('be.visible');
				cy.get('[data-test="peripheral-allocation-error"]').should(
					'exist'
				);
			}
		);
	});
});
