/* eslint-disable max-nested-callbacks */
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
import {configurePreloadedStore} from '../../state/store';
import GenerateCode from './GenerateCode';
import {setAppliedSignal} from '../../state/slices/pins/pins.reducer';
import {
	setClockNodeControlValue,
	setDiagramData
} from '../../state/slices/clock-nodes/clockNodes.reducer';
import {resetSocPeripherals} from '../../utils/soc-peripherals';
import {resetPinDictionary} from '../../utils/soc-pins';
import {setSignalGroupAssignment} from '../../state/slices/peripherals/peripherals.reducer';
import {resetConfigDict} from '../../utils/config';

const wlp = (await import(
	'../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default)) as Soc;

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	projects: [
		{
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM4',
			ProjectId: 'CM4-proj',
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: 'zephyr'
		},
		{
			Description: 'RISC-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: 'msdk',
			CoreId: 'RV',
			ProjectId: 'RV-proj',
			Name: 'RISC-V (RV32)',
			PluginId: 'msdk'
		}
	]
};

const externallyManagedConfigDict = {
	...mockedConfigDict,
	projects: [
		{...mockedConfigDict.projects[0]},
		{
			Description: 'Externally Managed Core',
			ExternallyManaged: true,
			FirmwarePlatform: 'externally-managed',
			CoreId: 'RV',
			ProjectId: 'RV',
			Name: 'Risc-V (RV32)',
			PluginId: 'abc',
			PluginVersion: '1.0.0'
		}
	]
};

describe('Generate Screen', () => {
	afterEach(() => {
		cy.clearLocalStorage();
		resetPinDictionary();
		resetSocPeripherals();
		resetConfigDict();
	});

	context('MAX32690-WLP', () => {
		beforeEach(() => {
			cy.viewport(1920, 1080);
			cy.window().then(win => {
				win.localStorage.setItem(
					'configDict',
					JSON.stringify(mockedConfigDict)
				);

				win.localStorage.setItem(
					'Package',
					JSON.stringify(wlp.Packages[0])
				);

				cy.fixture('clock-config-plugin-controls.json').then(
					controls => {
						win.localStorage.setItem(
							'pluginControls:CM4-proj',
							JSON.stringify(controls)
						);
					}
				);

				win.localStorage.setItem(
					'ClockNodes',
					JSON.stringify(wlp.ClockNodes)
				);

				win.localStorage.setItem('Cores', JSON.stringify(wlp.Cores));

				win.localStorage.setItem(
					'Peripherals',
					JSON.stringify(wlp.Peripherals)
				);
			});
		});

		it('Should display core list with no errors', () => {
			const reduxStore = configurePreloadedStore(wlp);

			cy.mount(<GenerateCode />, reduxStore).then(() => {
				cy.dataTest('generate-code:container').should('exist');
				cy.dataTest('generate-code:container')
					.children()
					.should('have.length', 2);

				cy.dataTest('generate-code:core:CM4-proj')
					.should('have.attr', 'data-active')
					.and('equal', 'true');
				cy.dataTest('generate-code:core:RV-proj')
					.should('have.attr', 'data-active')
					.and('equal', 'true');

				cy.dataTest(
					'generate-code:core:CM4-proj:endSlot:icon'
				).click();
				cy.dataTest(
					'cfsSelectionCard:CM4-proj:content:errors-container'
				).should('not.exist');
			});
		});

		it('Should display an error message in all core card, if clock nodes are in error state', () => {
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

			cy.mount(<GenerateCode />, reduxStore).then(() => {
				['CM4-proj', 'RV-proj'].forEach(projectId => {
					cy.dataTest(
						`generate-code:core:${projectId}:endSlot:icon`
					).click();
					cy.dataTest(
						`cfsSelectionCard:${projectId}:content:errors-container`
					).should('exist');

					cy.dataTest(
						`cfsSelectionCard:${projectId}:content:errors-container`
					).should('contain.text', '1 errors in Clock Config.');

					cy.dataTest(`valid-status:${projectId}:error-state`).should(
						'contain.text',
						'1 Issues'
					);
				});
			});
		});

		it('Displays peripheral allocations errors for CM4', () => {
			const reduxStore = configurePreloadedStore(wlp);

			// Allocate SPI0 to CM4
			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'SPI0',
					projectId: 'CM4-proj',
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

			cy.mount(<GenerateCode />, reduxStore).then(() => {
				cy.dataTest('generate-code:core:CM4-proj').should('exist');
				cy.dataTest('generate-code:core:RV-proj').should('exist');

				// Core CM4
				cy.dataTest(
					`generate-code:core:CM4-proj:endSlot:icon`
				).click();
				// Core card should be in error state
				cy.dataTest(
					'cfsSelectionCard:CM4-proj:content:errors-container'
				).should('exist');
				cy.dataTest(`valid-status:CM4-proj:error-state`).should(
					'contain.text',
					'3 Issues'
				);
				cy.dataTest(
					`cfsSelectionCard:CM4-proj:content:errors-container`
				).should(
					'contain.text',
					'3 errors in Peripheral Allocation.'
				);
				// The card should be inactive
				cy.dataTest('generate-code:core:CM4-proj').should(
					'have.attr',
					'data-active',
					'false'
				);
				// And the checkbox should be unchecked
				cy.dataTest('generate-code:core:CM4-proj:checkbox').should(
					'have.attr',
					'current-value',
					'false'
				);

				// Core RV card should not be in error state
				cy.dataTest('generate-code:core:RV-proj').within(() => {
					cy.dataTest(`valid-status:RV-proj:ready-state`).should(
						'have.text',
						'Ready'
					);
				});
				// The card should be active
				cy.dataTest('generate-code:core:RV-proj').should(
					'have.attr',
					'data-active',
					'true'
				);
				// And the checkbox should be checked
				cy.dataTest('generate-code:core:RV-proj:checkbox').should(
					'have.attr',
					'current-value',
					'true'
				);
			});
		});
	});

	context('Externally managed project', () => {
		beforeEach(() => {
			cy.viewport(1280, 720);

			cy.window().then(window => {
				window.localStorage.setItem(
					'configDict',
					JSON.stringify(externallyManagedConfigDict)
				);

				window.localStorage.setItem(
					'Cores',
					JSON.stringify(wlp.Cores)
				);
			});
		});

		it('Should not allow selection of externally managed project', () => {
			const reduxStore = configurePreloadedStore(wlp);

			cy.mount(<GenerateCode />, reduxStore).then(() => {
				cy.dataTest('generate-code:core:RV:checkbox')
					.should('have.attr', 'current-checked', 'false')
					.should('have.attr', 'disabled', 'disabled');

				cy.dataTest('generate-code:core:RV').within(() => {
					cy.dataTest('project-item:externally-managed-badge').should(
						'exist'
					);
				});
			});
		});
	});
});
