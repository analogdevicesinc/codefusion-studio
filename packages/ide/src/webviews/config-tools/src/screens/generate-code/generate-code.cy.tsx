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
import type {CfsConfig} from 'cfs-plugins-api';
import {configurePreloadedStore} from '../../state/store';
import GenerateCode from './GenerateCode';
import {setAppliedSignal} from '../../state/slices/pins/pins.reducer';
import {
	setClockNodeControlValue,
	setDiagramData
} from '../../state/slices/clock-nodes/clockNodes.reducer';
import {setSignalGroupAssignment} from '../../state/slices/peripherals/peripherals.reducer';

const wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const projectRvId = 'RV-proj';
const projectCm4Id = 'CM4-proj';

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'CM4',
			ProjectId: projectCm4Id,
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: 'zephyr'
		},
		{
			Description: 'RISC-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: 'msdk',
			CoreId: 'RV',
			ProjectId: projectRvId,
			Name: 'RISC-V (RV32)',
			PluginId: 'msdk'
		}
	]
} as unknown as CfsConfig;

const externallyManagedConfigDict = {
	...mockedConfigDict,
	Projects: [
		{...mockedConfigDict.Projects[0]},
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
} as unknown as CfsConfig;

describe('Generate Screen', () => {
	context('MAX32690-WLP', () => {
		beforeEach(() => {
			cy.viewport(1920, 1080);
			cy.window().then(win => {
				cy.fixture('clock-config-plugin-controls.json').then(
					controls => {
						win.localStorage.setItem(
							'pluginControls:CM4-proj',
							JSON.stringify(controls)
						);
					}
				);

				win.localStorage.setItem(
					'pluginControls:RV-proj',
					JSON.stringify({
						I2C0: [
							{
								Description: 'Bus Error SCL Timeout Period',
								Id: 'SCL_TIMEOUT',
								MaximumValue: 65535,
								MinimumValue: 0,
								Type: 'integer'
							}
						]
					})
				);
			});
		});

		it('Should display core list with no errors', () => {
			const reduxStore = configurePreloadedStore(
				wlp,
				mockedConfigDict
			);

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

		it('Should display an error message of type "clock nodes", in both cards', () => {
			const reduxStore = configurePreloadedStore(
				wlp,
				mockedConfigDict
			);

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
				[projectCm4Id, projectRvId].forEach(projectId => {
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
			const reduxStore = configurePreloadedStore(
				wlp,
				mockedConfigDict
			);

			// Allocate SPI0 to CM4
			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'SPI0',
					projectId: projectCm4Id,
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
				cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
					'exist'
				);
				cy.dataTest(`generate-code:core:${projectRvId}`).should(
					'exist'
				);

				// Core CM4
				cy.dataTest(
					`generate-code:core:${projectCm4Id}:endSlot:icon`
				).click();
				// Core card should be in error state
				cy.dataTest(
					`cfsSelectionCard:${projectCm4Id}:content:errors-container`
				).should('exist');
				cy.dataTest(
					`valid-status:${projectCm4Id}:error-state`
				).should('contain.text', '3 Issues');
				cy.dataTest(
					`cfsSelectionCard:${projectCm4Id}:content:errors-container`
				).should(
					'contain.text',
					'3 errors in Peripheral Allocation.'
				);
				// The card should be inactive
				cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
					'have.attr',
					'data-active',
					'false'
				);
				// And the checkbox should be unchecked
				cy.dataTest(
					`generate-code:core:${projectCm4Id}:checkbox`
				).should('have.attr', 'current-value', 'false');

				// Core RV card should not be in error state
				cy.dataTest(`generate-code:core:${projectRvId}`).within(
					() => {
						cy.dataTest(
							`valid-status:${projectRvId}:ready-state`
						).should('have.text', 'Ready');
					}
				);
				// The card should be active
				cy.dataTest(`generate-code:core:${projectRvId}`).should(
					'have.attr',
					'data-active',
					'true'
				);
				// And the checkbox and "Generate" button should be checked
				cy.dataTest(
					`generate-code:core:${projectRvId}:checkbox`
				).should('have.attr', 'current-value', 'true');

				cy.dataTest('generate-code:generate-btn')
					.should('exist')
					.should('not.have.attr', 'disabled', 'disabled');
			});
		});

		it('Should disable the "Generate" button if the project is deselected', () => {
			const reduxStore = configurePreloadedStore(wlp);

			// Allocate SPI0 to CM4
			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'SPI0',
					projectId: projectCm4Id,
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
				cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
					'exist'
				);
				cy.dataTest(`generate-code:core:${projectRvId}`).should(
					'exist'
				);

				// Core RV card should not be in error state
				cy.dataTest(`generate-code:core:${projectRvId}`).within(
					() => {
						cy.dataTest(
							`valid-status:${projectRvId}:ready-state`
						).should('have.text', 'Ready');
					}
				);
				// The card should be active
				cy.dataTest(`generate-code:core:${projectRvId}`).should(
					'have.attr',
					'data-active',
					'true'
				);
				// And the checkbox and "Generate" button should be checked
				cy.dataTest(
					`generate-code:core:${projectRvId}:checkbox`
				).should('have.attr', 'current-value', 'true');

				// Click to deselected the project
				cy.dataTest('generate-code:core:RV-proj').click();

				// "Generate" button should be disabled
				cy.dataTest('generate-code:generate-btn')
					.should('exist')
					.should('have.attr', 'disabled', 'disabled');
			});
		});

		it('Should display an error message of type "peripheral allocation", for invalid form', () => {
			const reduxStore = configurePreloadedStore(wlp);

			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'I2C0',
					projectId: projectRvId,
					config: {SCL_TIMEOUT: '10000000000'}
				})
			);

			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'F6',
					Peripheral: 'I2C0',
					Name: 'SCL',
					PinCfg: {
						PS: 'DIS',
						PWR: 'VDDIO'
					}
				})
			);

			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'G6',
					Peripheral: 'I2C0',
					Name: 'SDA',
					PinCfg: {
						PS: 'DIS',
						PWR: 'VDDIO'
					}
				})
			);

			cy.mount(<GenerateCode />, reduxStore).then(() => {
				cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
					'exist'
				);
				cy.dataTest(`generate-code:core:${projectRvId}`).should(
					'exist'
				);

				// Project RV-proj
				cy.dataTest(
					`generate-code:core:${projectRvId}:endSlot:icon`
				).click();
				// Card should be in error state
				cy.dataTest(
					`cfsSelectionCard:${projectRvId}:content:errors-container`
				).should('exist');
				cy.dataTest(`valid-status:${projectRvId}:error-state`).should(
					'contain.text',
					'1 Issues'
				);
				// Should display 1 error in Peripheral Allocation, which is generated due to invalid SCL_TIMEOUT value
				cy.dataTest(
					`cfsSelectionCard:${projectRvId}:content:errors-container`
				).should(
					'contain.text',
					'1 errors in Peripheral Allocation.'
				);

				cy.dataTest('generate-code:generate-btn')
					.should('exist')
					.should('not.have.attr', 'disabled', 'disabled');
			});
		});

		it('Should have at least 1 project valid and selected to enable the "Generate" button', () => {
			const reduxStore = configurePreloadedStore(wlp);

			// Allocate SPI0 to CM4
			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'SPI0',
					projectId: projectCm4Id,
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
				// CM4 project should be in error state
				cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
					'exist'
				);
				// RV project should be valid
				cy.dataTest(`generate-code:core:${projectRvId}`).should(
					'exist'
				);

				cy.dataTest(
					`valid-status:${projectCm4Id}:error-state`
				).should('contain.text', '3 Issues');

				cy.dataTest(`generate-code:core:${projectRvId}`).within(
					() => {
						cy.dataTest(
							`valid-status:${projectRvId}:ready-state`
						).should('have.text', 'Ready');
					}
				);

				cy.dataTest('generate-code:generate-btn')
					.should('exist')
					.should('not.have.attr', 'disabled', 'disabled');
			});
		});

		it('Should disable the "Generate" button if both project are in error state', () => {
			const reduxStore = configurePreloadedStore(wlp);

			// Allocate SPI0 to CM4
			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'SPI0',
					projectId: projectCm4Id,
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

			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'I2C0',
					projectId: projectRvId,
					config: {SCL_TIMEOUT: '10000000000'}
				})
			);

			cy.mount(<GenerateCode />, reduxStore).then(() => {
				// CM4 project should be in error state
				cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
					'exist'
				);
				// RV project should be valid
				cy.dataTest(`generate-code:core:${projectRvId}`).should(
					'exist'
				);

				cy.dataTest(
					`valid-status:${projectCm4Id}:error-state`
				).should('contain.text', '3 Issues');

				cy.dataTest(`valid-status:${projectRvId}:error-state`).should(
					'contain.text',
					'3 Issues'
				);

				cy.dataTest('generate-code:generate-btn')
					.should('exist')
					.should('have.attr', 'disabled', 'disabled');
			});
		});

		it('Should display all 3 types of error messages: Peripheral, Pin Config, Clock Config', () => {
			const reduxStore = configurePreloadedStore(wlp);

			// Create a pin conflict
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'A2',
					Peripheral: 'GPIO1',
					Name: 'P1.8'
				})
			);
			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'A2',
					Peripheral: 'I2C2',
					Name: 'SCL'
				})
			);

			// Create a Peripheral allocation error
			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'SPI0',
					projectId: projectCm4Id,
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

			// Create a Clock node error
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
					name: 'P0.23',
					key: 'P0_23_FREQ',
					value: '100000000',
					error: 'INVALID_MAX_VAL'
				})
			);

			cy.mount(<GenerateCode />, reduxStore).then(() => {
				cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
					'exist'
				);
				cy.dataTest(`generate-code:core:${projectRvId}`).should(
					'exist'
				);

				cy.dataTest(
					`generate-code:core:${projectCm4Id}:endSlot:icon`
				).click();
				cy.dataTest(
					`cfsSelectionCard:${projectCm4Id}:content:errors-container`
				).should('exist');
				cy.dataTest(
					`cfsSelectionCard:${projectCm4Id}:content:errors-container`
				).should(
					'contain.text',
					'3 errors in Peripheral Allocation.'
				);
				cy.dataTest(
					`cfsSelectionCard:${projectCm4Id}:content:errors-container`
				).should('contain.text', '1 errors in Pin Config.');
				cy.dataTest(
					`cfsSelectionCard:${projectCm4Id}:content:errors-container`
				).should('contain.text', '1 errors in Clock Config.');
			});
		});

		it('Should auto select valid projects', () => {
			const reduxStore = configurePreloadedStore(wlp);

			// Allocate SPI0 to CM4
			reduxStore.dispatch(
				setSignalGroupAssignment({
					peripheral: 'SPI0',
					projectId: projectCm4Id,
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
				// CM4 project should NOT be checked
				cy.dataTest(
					`generate-code:core:${projectCm4Id}:checkbox`
				).should('have.attr', 'aria-checked', 'false');

				// RV project should be checked
				cy.dataTest(
					`generate-code:core:${projectRvId}:checkbox`
				).should('have.attr', 'aria-checked', 'true');
			});
		});
	});

	context('Externally managed project', () => {
		beforeEach(() => {
			cy.viewport(1280, 720);
		});

		it('Should not allow selection of externally managed project', () => {
			const reduxStore = configurePreloadedStore(
				wlp,
				externallyManagedConfigDict
			);

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
