/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import {setClockNodeControlValue} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import {configurePreloadedStore} from '../../../state/store';
import {resetClockNodes} from '../../../utils/clock-nodes';
import {resetDfg} from '../../../utils/dfg';
import {resetCoreMemoryDictionary} from '../../../utils/memory';
import {resetPinDictionary} from '../../../utils/soc-pins';
import SystemPlannerConfigToolsList from './system-planner-config-tools-list';

import type {CfsConfig} from 'cfs-types';
const wlp = (await import('@socs/max32690-wlp.json'))
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
} as unknown as CfsConfig;

describe('System config tools', () => {
	beforeEach(() => {
		cy.viewport(1280, 720);
	});

	it('should render config tools cards', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			window.localStorage.setItem(
				'pluginControls:CM4-proj',
				JSON.stringify(controls)
			);

			const reduxStore = configurePreloadedStore(
				wlp,
				mockedConfigDict,
				controls
			);
			cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		});
		cy.get('[data-test="peripheral-card"]').should('be.visible');
		cy.get('[data-test="pinmux-card"]').should('be.visible');
		cy.get('[data-test="clock-card"]').should('be.visible');
		cy.get('[data-test="memory-card"]').should('be.visible');
		cy.get('[data-test="registers-card"]').should('be.visible');
		cy.get('[data-test="generate-card"]').should('be.visible');
	});

	it('should not render the conflict icon when there is no pin error', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			window.localStorage.setItem(
				'pluginControls:CM4-proj',
				JSON.stringify(controls)
			);

			const reduxStore = configurePreloadedStore(
				wlp as unknown as Soc,
				mockedConfigDict,
				controls
			);

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
	});

	it('should not render the conflict icon when there is no clock error', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			window.localStorage.setItem(
				'pluginControls:CM4-proj',
				JSON.stringify(controls)
			);

			const reduxStore = configurePreloadedStore(
				wlp as unknown as Soc,
				mockedConfigDict,
				controls
			);

			// Assign the external clock pin signal
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'F4',
					Peripheral: 'MISC',
					Name: 'CLKEXT'
				})
			);

			// Enable P0.23 path by selecting SYS_OSC Mux to CLKEXT
			reduxStore.dispatch(
				setClockNodeControlValue({
					name: 'SYS_OSC Mux',
					key: 'MUX',
					value: 'CLKEXT'
				})
			);

			// Set a valid frequency for P0.23 to avoid errors
			reduxStore.dispatch(
				setClockNodeControlValue({
					name: 'P0.23',
					key: 'P0_23_FREQ',
					value: '10000'
				})
			);

			cy.mount(<SystemPlannerConfigToolsList />, reduxStore).then(
				() => {
					cy.get('[data-test="clock-card"]').should('be.visible');
					cy.get('[data-test="clock-config-error"]').should(
						'not.exist'
					);
				}
			);
		});
	});

	it('should render the conflict icon when there is a clock error', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			window.localStorage.setItem(
				'pluginControls:CM4-proj',
				JSON.stringify(controls)
			);

			const reduxStore = configurePreloadedStore(
				wlp as unknown as Soc,
				mockedConfigDict,
				controls
			);

			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'F4',
					Peripheral: 'MISC',
					Name: 'CLKEXT'
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

	it('should not render the DFG card when the Gaskets are not available', () => {
		resetClockNodes();
		resetCoreMemoryDictionary();
		resetDfg();
		const reduxStore = configurePreloadedStore(wlp);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="dfg-card"]').should('not.exist');
	});

	it('should render the Clock Config card when the ClockNodes are available', () => {
		resetClockNodes();
		resetCoreMemoryDictionary();
		resetDfg();
		const reduxStore = configurePreloadedStore(wlp);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="clock-card"]').should('exist');
	});

	it('should render the Memory card when the Memory are available', () => {
		resetClockNodes();
		resetCoreMemoryDictionary();
		resetDfg();
		const reduxStore = configurePreloadedStore(wlp);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="memory-card"]').should('exist');
	});

	it('should render the Pinmux card when the pins are available', () => {
		resetClockNodes();
		resetPinDictionary();
		resetDfg();
		const reduxStore = configurePreloadedStore(wlp);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="pinmux-card"]').should('exist');
	});

	it('should render the MCU Boot Config card when SOC is AD71270 and Zephyr project exists', () => {
		const configWithZephyr = {
			...mockedConfigDict,
			Soc: 'AD71270',
			Projects: [
				{
					...mockedConfigDict.Projects[0],
					FirmwarePlatform: 'zephyr'
				}
			]
		} as unknown as CfsConfig;

		const socWithMcuboot = {...wlp, supportsMCUboot: true};
		const reduxStore = configurePreloadedStore(
			socWithMcuboot,
			configWithZephyr
		);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="mcuboot-card"]').should('exist');
	});

	it('should render the MCU Boot Config card when SOC is ADAU2042 and Zephyr project exists', () => {
		const configWithZephyr = {
			...mockedConfigDict,
			Soc: 'ADAU2042',
			Projects: [
				{
					...mockedConfigDict.Projects[0],
					FirmwarePlatform: 'zephyr'
				}
			]
		} as unknown as CfsConfig;

		const socWithMcuboot = {...wlp, supportsMCUboot: true};
		const reduxStore = configurePreloadedStore(
			socWithMcuboot,
			configWithZephyr
		);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="mcuboot-card"]').should('exist');
	});

	it('should not render the MCU Boot Config card when no Zephyr projects and unsupported SoC', () => {
		const configWithoutZephyr = {
			...mockedConfigDict,
			Soc: 'MAX32690',
			Projects: [
				{
					...mockedConfigDict.Projects[0],
					FirmwarePlatform: 'msdk'
				}
			]
		} as unknown as CfsConfig;

		const reduxStore = configurePreloadedStore(
			wlp,
			configWithoutZephyr
		);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="mcuboot-card"]').should('not.exist');
	});

	it('should not render the MCU Boot Config card when Zephyr project exists but supportsMCUboot is false', () => {
		const configWithZephyr = {
			...mockedConfigDict,
			Projects: [
				{
					...mockedConfigDict.Projects[0],
					FirmwarePlatform: 'zephyr'
				}
			]
		} as unknown as CfsConfig;

		const socWithoutMcuboot = {...wlp, supportsMCUboot: false};
		const reduxStore = configurePreloadedStore(
			socWithoutMcuboot,
			configWithZephyr
		);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="mcuboot-card"]').should('not.exist');
	});

	it('should not render the MCU Boot Config card when Zephyr project exists but supportsMCUboot is undefined', () => {
		const configWithZephyr = {
			...mockedConfigDict,
			Projects: [
				{
					...mockedConfigDict.Projects[0],
					FirmwarePlatform: 'zephyr'
				}
			]
		} as unknown as CfsConfig;

		const {supportsMCUboot: _, ...socWithoutMcubootProp} =
			wlp as typeof wlp & {supportsMCUboot?: boolean};
		const reduxStore = configurePreloadedStore(
			socWithoutMcubootProp as typeof wlp,
			configWithZephyr
		);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="mcuboot-card"]').should('not.exist');
	});
});
