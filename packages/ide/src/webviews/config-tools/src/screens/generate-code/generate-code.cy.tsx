/* eslint-disable max-nested-callbacks */
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

import type {ControlCfg, Soc} from '@common/types/soc';
import type {CfsConfig} from 'cfs-types';
import {configurePreloadedStore} from '../../state/store';
import {setupMessengerMock} from '../../../../common/test-utils/messenger-mock';
import {LocalizationProvider} from '../../../../common/contexts/LocaleContext';
import GenerateCode from './GenerateCode';
import {setAppliedSignal} from '../../state/slices/pins/pins.reducer';
import {setClockNodeControlValue} from '../../state/slices/clock-nodes/clockNodes.reducer';
import {
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../state/slices/peripherals/peripherals.reducer';
import {addNewStream} from '../../state/slices/gaskets/gasket.reducer';
import {toggleProfilingEnabled} from '../../state/slices/profiling/profiling.reducer';
import {setMcubootEnableState} from '../../state/slices/app-context/appContext.reducer';
import {addApplicationPackage} from '../../state/slices/application-packages/applicationPackages.reducer';
import {
	addFirewallZone,
	setFirewallStatus
} from '../../state/slices/firewall/firewall.reducer';
import type {FirewallZone} from '../../types/firewall';
import {withFirewallTestData} from '../firewall-config/firewall-test-data';
import {CONTROL_SCOPES} from '../../constants/scopes';
import {
	createScopeConflictDictionary,
	createScopeDictionaryFromUsages
} from '../../test-utils/scope-conflict-test-utils';

const wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const l10n =
	await import('../../../../../../l10n/bundle.l10n.en.json').then(
		module => module.default
	);

(window as any).__webview_localization_resources__ = l10n;

const projectRvId = 'RV-proj';
const projectCm4Id = 'CM4-proj';
const peripheralScopeValue = 'shared_i2s_buffer';
const peripheralScopeKey = `${projectRvId} C identifiers`;
const peripheralScopeTemplate = `\${ProjectId} \${String: C identifiers} +`;
const i2sControls: Record<string, ControlCfg[]> = {
	I2S0: [
		{
			Id: 'RAW_DATA_BUFFER_NAME',
			Description: 'Raw Data Buffer Name',
			Type: 'text',
			Pattern: '[_a-zA-Z][_a-zA-Z0-9]*',
			Scope: peripheralScopeTemplate,
			PluginOption: true
		},
		{
			Id: 'TX_BUFFER_NAME',
			Description: 'Transmit Buffer Name',
			Type: 'text',
			Pattern: '[_a-zA-Z][_a-zA-Z0-9]*',
			Scope: peripheralScopeTemplate,
			PluginOption: true
		}
	]
};

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: 'zephyr',
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

const mockedConfigDictWithPeripheralScopeConflict = {
	...mockedConfigDict,
	Projects: mockedConfigDict.Projects.map(project =>
		project.ProjectId === projectRvId
			? {
					...project,
					Peripherals: [
						{
							Name: 'I2S0',
							Signals: [],
							Config: {
								RAW_DATA_BUFFER_NAME: peripheralScopeValue,
								TX_BUFFER_NAME: peripheralScopeValue
							}
						}
					]
				}
			: project
	)
} as unknown as CfsConfig;
const peripheralScopeConflicts = createScopeDictionaryFromUsages([
	{
		groupId: 'I2S0',
		controlId: 'RAW_DATA_BUFFER_NAME',
		value: peripheralScopeValue,
		controlScope: CONTROL_SCOPES.PERIPHERAL,
		projectId: projectRvId,
		coreId: 'RV',
		scope: peripheralScopeTemplate,
		scopeKey: peripheralScopeKey,
		itemId: 'I2S0'
	},
	{
		groupId: 'I2S0',
		controlId: 'TX_BUFFER_NAME',
		value: peripheralScopeValue,
		controlScope: CONTROL_SCOPES.PERIPHERAL,
		projectId: projectRvId,
		coreId: 'RV',
		scope: peripheralScopeTemplate,
		scopeKey: peripheralScopeKey,
		itemId: 'I2S0'
	}
]);

const mockedConfigDictDfg = {
	BoardName: 'DfbBoardName',
	Package: 'WLP',
	Soc: 'DfgSoc',
	Projects: [
		{
			ExternallyManaged: false,
			FirmwarePlatform: 'zephyr',
			CoreId: 'CMxx',
			ProjectId: 'Proj_ID1',
			IsPrimary: true,
			Name: 'ARM Cortex-Mxx',
			PluginId: 'zephyr'
		},
		{
			ExternallyManaged: false,
			FirmwarePlatform: 'zephyr',
			CoreId: 'AUXCORE',
			IsPrimary: false,
			ProjectId: 'Proj_ID2',
			Name: 'AUXCORE',
			PluginId: 'zephyr'
		}
	]
} as unknown as CfsConfig;

const mockedConfigDictBothZephyr = {
	...mockedConfigDict,
	Projects: mockedConfigDict.Projects.map(project =>
		project.ProjectId === projectRvId
			? {...project, FirmwarePlatform: 'zephyr'}
			: project
	)
} as unknown as CfsConfig;

const mockedConfigDictPreloadedProfilingError = {
	...mockedConfigDictBothZephyr,
	Projects: mockedConfigDictBothZephyr.Projects.map(project =>
		project.ProjectId === projectCm4Id
			? {
					...project,
					Profiling: {
						Zephelin: {
							Enabled: true,
							Interface: {Type: 'USB'},
							ProfilingCpuLoadEnabled: true,
							ProfilingCpuLoadInterval: 1
						}
					}
				}
			: project
	)
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
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
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
				}
			);
		});

		it('Should display memory allocation errors for memory scope conflicts', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls,
						createScopeConflictDictionary({
							scopeKey: `${projectCm4Id} memory regions`,
							value: 'shared_memory_region',
							controlScope: CONTROL_SCOPES.MEMORY,
							controlId: 'NAME_OVERRIDE',
							projectId: projectCm4Id,
							coreId: 'CM4',
							groupId: 'memory',
							itemIds: ['m4_flash', 'm4_storage']
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(
							`valid-status:${projectCm4Id}:error-state`
						).should('contain.text', '1 Issue');
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should(
							'contain.text',
							'1 errors in Memory Allocation.'
						);
						cy.dataTest(
							`generate-code:core:${projectRvId}:checkbox`
						).should('have.attr', 'aria-checked', 'true');
						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should display pin config errors for pin scope conflicts', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls,
						createScopeConflictDictionary({
							scopeKey: `${projectCm4Id} zephyr dtnames IN`,
							value: 'shared_gpio',
							controlScope: CONTROL_SCOPES.PIN_CONFIG,
							controlId: 'DT_NAME',
							projectId: projectCm4Id,
							coreId: 'CM4',
							groupId: 'PinConfig',
							itemIds: ['P0.7', 'P0.8']
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(
							`valid-status:${projectCm4Id}:error-state`
						).should('contain.text', '1 Issue');
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('contain.text', '1 errors in Pin Config.');
						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should display peripheral allocation errors for peripheral scope conflicts', () => {
			localStorage.setItem(
				`pluginControls:${projectRvId}`,
				JSON.stringify(i2sControls)
			);

			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDictWithPeripheralScopeConflict,
						controls,
						peripheralScopeConflicts
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(
							`valid-status:${projectRvId}:error-state`
						).should('contain.text', '2 Issues');
						cy.dataTest(
							`generate-code:core:${projectRvId}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectRvId}:content:errors-container`
						).should(
							'contain.text',
							'2 errors in Peripheral Allocation.'
						);
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:checkbox`
						).should('have.attr', 'aria-checked', 'true');
						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should display clock configuration errors only on the primary project', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
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

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						// Primary project should contain the clock error.
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();

						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						)
							.should('exist')
							.and('contain.text', 'Clock Config');

						// Non-primary project should not contain the clock error.
						cy.dataTest(
							`generate-code:core:${projectRvId}:endSlot:icon`
						).click();

						cy.dataTest(
							`cfsSelectionCard:${projectRvId}:content:errors-container`
						).should('not.exist');

						cy.dataTest(`generate-code:core:${projectRvId}`).within(
							() => {
								cy.dataTest(
									`valid-status:${projectRvId}:ready-state`
								).should('have.text', 'Ready');
							}
						);
					});
				}
			);
		});

		it('Displays peripheral allocations errors for CM4', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
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

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
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
				}
			);
		});

		it('Should disable the "Generate" button if the project is deselected', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
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

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
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
				}
			);
		});

		it('Should display an error message of type "peripheral allocation", for invalid form', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

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

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
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
						cy.dataTest(
							`valid-status:${projectRvId}:error-state`
						).should('contain.text', '1 Issue');
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
				}
			);
		});

		it('Should have at least 1 project valid and selected to enable the "Generate" button', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
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

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
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
				}
			);
		});

		it('Should disable the "Generate" button if both project are in error state', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
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

					reduxStore.dispatch(
						setSignalGroupAssignment({
							peripheral: 'I2C0',
							projectId: projectRvId,
							config: {SCL_TIMEOUT: '10000000000'}
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
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

						cy.dataTest(
							`valid-status:${projectRvId}:error-state`
						).should('contain.text', '3 Issues');

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should display all 3 types of error messages: Peripheral, Pin Config, Clock Config', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

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

					// Create Clock node errors, (Both P0.23 input and P0.23 Mux will error if computed value is too high)
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

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
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
						).should('contain.text', '2 errors in Clock Config.');
					});
				}
			);
		});

		it('Should auto select valid projects', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
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

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						// CM4 project should NOT be checked
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:checkbox`
						).should('have.attr', 'aria-checked', 'false');

						// RV project should be checked
						cy.dataTest(
							`generate-code:core:${projectRvId}:checkbox`
						).should('have.attr', 'aria-checked', 'true');
					});
				}
			);
		});

		it('Should display peripheral error when a required pin is missing', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					reduxStore.dispatch(
						setSignalAssignment({
							peripheral: 'GPIO0',
							signalName: 'P0.9',
							projectId: projectRvId
						})
					);
					reduxStore.dispatch(
						setSignalAssignment({
							peripheral: 'GPIO0',
							signalName: 'P0.7',
							projectId: projectCm4Id
						})
					);
					reduxStore.dispatch(
						setAppliedSignal({
							Pin: 'G2',
							Peripheral: 'GPIO0',
							Name: 'P0.7'
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						// RV project should show peripheral error
						cy.dataTest(
							`generate-code:core:${projectRvId}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectRvId}:content:errors-container`
						).should('exist');
						cy.dataTest(
							`cfsSelectionCard:${projectRvId}:content:errors-container`
						).should(
							'contain.text',
							'1 errors in Peripheral Allocation.'
						);

						// M4 project should NOT show peripheral error
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('not.exist');
					});
				}
			);
		});

		it('Should display two errors when both projects have missing required pins', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					reduxStore.dispatch(
						setSignalAssignment({
							peripheral: 'GPIO0',
							signalName: 'P0.9',
							projectId: projectRvId
						})
					);
					reduxStore.dispatch(
						setSignalAssignment({
							peripheral: 'GPIO0',
							signalName: 'P0.4',
							projectId: projectCm4Id
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						// RV project should show peripheral error
						cy.dataTest(
							`generate-code:core:${projectRvId}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectRvId}:content:errors-container`
						).should('exist');
						cy.dataTest(
							`cfsSelectionCard:${projectRvId}:content:errors-container`
						).should(
							'contain.text',
							'1 errors in Peripheral Allocation.'
						);

						// M4 project should show peripheral error
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
							'1 errors in Peripheral Allocation.'
						);
					});
				}
			);
		});
	});

	context('DFG', () => {
		beforeEach(() => {
			cy.viewport(1280, 720);
		});

		it('Should not disable the "Generate" button when only DFG scope conflicts are present', () => {
			cy.fixture('dfgtest-dfg.json').then(soc => {
				localStorage.setItem(
					'pluginControls:Proj_ID1',
					JSON.stringify({})
				);
				localStorage.setItem(
					'pluginControls:Proj_ID2',
					JSON.stringify({})
				);

				const reduxStore = configurePreloadedStore(
					soc,
					mockedConfigDictDfg,
					undefined,
					createScopeConflictDictionary({
						scopeKey: 'Proj_ID1 zephyr phandles',
						value: 'shared_endpoint',
						controlScope: CONTROL_SCOPES.DFG,
						controlId: 'ALIAS',
						projectId: 'Proj_ID1',
						coreId: 'CMxx',
						groupId: 'ASS',
						itemIds: ['ASS[0]', 'BSS[0]']
					})
				);

				cy.mount(
					<LocalizationProvider namespace='cfgtools'>
						<GenerateCode />
					</LocalizationProvider>,
					reduxStore
				).then(() => {
					cy.dataTest(
						`valid-status:${mockedConfigDictDfg.Projects[0].ProjectId}:ready-state`
					).should('have.text', 'Ready');
					cy.dataTest(
						`valid-status:${mockedConfigDictDfg.Projects[1].ProjectId}:ready-state`
					).should('have.text', 'Ready');
					cy.dataTest('generate-code:generate-btn')
						.should('exist')
						.should('not.have.attr', 'disabled', 'disabled');
				});
				cy.then(() => {
					localStorage.removeItem('pluginControls:Proj_ID1');
					localStorage.removeItem('pluginControls:Proj_ID2');
				});
			});
		});

		it('Should disable the "Generate" button when DFG errors are present', () => {
			cy.fixture('dfgtest-dfg.json').then(soc => {
				const reduxStore = configurePreloadedStore(
					soc,
					mockedConfigDictDfg
				);

				reduxStore.dispatch(
					addNewStream({
						StreamId: 1,
						Source: {
							Gasket: 'ASS',
							Index: 0,
							BufferAddress: 0,
							Config: {},
							BufferSize: 1024
						},
						Destinations: [
							{
								Gasket: 'BSS',
								Index: 0,
								BufferAddress: 0,
								Config: {},
								BufferSize: 1024
							}
						],
						Group: '',
						Uuid: `${Math.random()}-${Math.random()}`,
						Description: ''
					})
				);

				reduxStore.dispatch(
					addNewStream({
						StreamId: 2,
						Source: {
							Gasket: 'ASS',
							Index: 1,
							BufferAddress: 1024,
							Config: {},
							BufferSize: 1024
						},
						Destinations: [
							{
								Gasket: 'BSS',
								Index: 1,
								BufferAddress: 1024,
								Config: {},
								BufferSize: 512
							}
						],
						Group: '',
						Uuid: `${Math.random()}-${Math.random()}`,
						Description: ''
					})
				);

				cy.mount(
					<LocalizationProvider namespace='cfgtools'>
						<GenerateCode />
					</LocalizationProvider>,
					reduxStore
				).then(() => {
					// Primary Project should be in error state
					cy.dataTest(
						`generate-code:core:${mockedConfigDictDfg.Projects[0].ProjectId}`
					).should('exist');
					// Non-Primary project should be in error state as well
					cy.dataTest(
						`generate-code:core:${mockedConfigDictDfg.Projects[1].ProjectId}`
					).should('exist');

					cy.dataTest(
						`valid-status:${mockedConfigDictDfg.Projects[0].ProjectId}:error-state`
					).should('contain.text', '1 Issue');

					cy.dataTest(
						`valid-status:${mockedConfigDictDfg.Projects[1].ProjectId}:error-state`
					).should('contain.text', '1 Issue');

					cy.dataTest('generate-code:generate-btn')
						.should('exist')
						.should('have.attr', 'disabled', 'disabled');
				});
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

			cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<GenerateCode />
				</LocalizationProvider>,
				reduxStore
			).then(() => {
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

		it('Should not assign primary project clock errors to an externally managed project', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						externallyManagedConfigDict,
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

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						// Clock errors belong to the primary project.
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();

						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						)
							.should('exist')
							.and('contain.text', 'Clock Config');

						// The externally managed project must not inherit them.
						cy.dataTest('generate-code:core:RV').within(() => {
							cy.dataTest(
								'project-item:externally-managed-badge'
							).should('exist');

							cy.dataTest('valid-status:RV:ready-state').should(
								'have.text',
								'Ready'
							);
						});

						cy.dataTest('generate-code:core:RV:checkbox')
							.should('have.attr', 'current-checked', 'false')
							.should('have.attr', 'disabled', 'disabled');
					});
				}
			);
		});
	});

	context('MCUboot errors', () => {
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

		it('Should display MCUboot Config error on all projects when MCUboot is enabled and app package has validation errors', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					reduxStore.dispatch(setMcubootEnableState('enabled'));
					reduxStore.dispatch(
						addApplicationPackage({
							id: 'test-pkg-1',
							name: 'Test Package',
							enabled: true,
							coreId: '',
							images: [
								{
									id: 'img-1',
									name: '',
									locationType: 'hexAddress',
									locationAddress: '',
									slotSize: 0,
									padHeader: false,
									path: '',
									headerSize: 0,
									swapAlignment: '4',
									imageVersion: '1.0.0',
									bootable: false
								}
							]
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						[projectCm4Id, projectRvId].forEach(projectId => {
							cy.dataTest(
								`generate-code:core:${projectId}:endSlot:icon`
							).click();
							cy.dataTest(
								`cfsSelectionCard:${projectId}:content:errors-container`
							).should('exist');
							cy.dataTest(
								`cfsSelectionCard:${projectId}:content:errors-container`
							).should('contain.text', 'MCUboot Config.');
						});

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should NOT show MCUboot errors when MCUboot is disabled', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					reduxStore.dispatch(setMcubootEnableState('disabled'));
					reduxStore.dispatch(
						addApplicationPackage({
							id: 'test-pkg-2',
							name: 'Test Package',
							enabled: true,
							coreId: '',
							images: [
								{
									id: 'img-2',
									name: '',
									locationType: 'hexAddress',
									locationAddress: '',
									slotSize: 0,
									padHeader: false,
									path: '',
									headerSize: 0,
									swapAlignment: '4',
									imageVersion: '1.0.0',
									bootable: false
								}
							]
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
							'exist'
						);

						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('not.exist');

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should NOT show MCUboot errors when MCUboot is default', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					reduxStore.dispatch(setMcubootEnableState('default'));
					reduxStore.dispatch(
						addApplicationPackage({
							id: 'test-pkg-3',
							name: 'Test Package',
							enabled: true,
							coreId: '',
							images: [
								{
									id: 'img-3',
									name: '',
									locationType: 'hexAddress',
									locationAddress: '',
									slotSize: 0,
									padHeader: false,
									path: '',
									headerSize: 0,
									swapAlignment: '4',
									imageVersion: '1.0.0',
									bootable: false
								}
							]
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
							'exist'
						);

						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('not.exist');

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should NOT count errors from disabled application packages', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					reduxStore.dispatch(setMcubootEnableState('enabled'));
					reduxStore.dispatch(
						addApplicationPackage({
							id: 'test-pkg-4',
							name: 'Disabled Package',
							enabled: false,
							coreId: '',
							images: [
								{
									id: 'img-4',
									name: '',
									locationType: 'hexAddress',
									locationAddress: '',
									slotSize: 0,
									padHeader: false,
									path: '',
									headerSize: 0,
									swapAlignment: '4',
									imageVersion: '1.0.0',
									bootable: false
								}
							]
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
							'exist'
						);

						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('not.exist');

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should allow code generation when MCUboot is enabled and app packages have no errors', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					reduxStore.dispatch(setMcubootEnableState('enabled'));
					reduxStore.dispatch(
						addApplicationPackage({
							id: 'test-pkg-5',
							name: 'Valid Package',
							enabled: true,
							coreId: 'CM4',
							version: '1.0.0',
							images: [
								{
									id: 'img-5',
									name: 'ValidImage',
									locationType: 'hexAddress',
									locationAddress: '10000',
									slotSize: 8192,
									padHeader: false,
									path: '/path/to/image.bin',
									headerSize: 512,
									bootable: true,
									swapAlignment: '4',
									imageVersion: '1.0.0'
								}
							]
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
							'exist'
						);

						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('not.exist');

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});
	});

	context('Firewall errors', () => {
		const sharedEntries = [
			'initiators::Initiators::dma_dde_0',
			'responders::M55_Itcm::m55_itcm_0'
		];

		const conflictingZones: FirewallZone[] = [
			{
				id: 'zone-a',
				name: 'Zone A',
				description: '',
				accessMode: 'open',
				accessModes: {
					nonSecureNonPrivileged: true,
					nonSecurePrivileged: true,
					secureNonPrivileged: true,
					securePrivileged: true
				},
				selectedFirewalls: sharedEntries
			},
			{
				id: 'zone-b',
				name: 'Zone B',
				description: '',
				accessMode: 'restricted',
				accessModes: {
					nonSecureNonPrivileged: false,
					nonSecurePrivileged: false,
					secureNonPrivileged: true,
					securePrivileged: true
				},
				selectedFirewalls: sharedEntries
			}
		];

		const mountWithConflictingZones = (
			controls: Record<string, ControlCfg[]>,
			configure: (
				reduxStore: ReturnType<typeof configurePreloadedStore>
			) => void = () => undefined,
			soc: Soc = withFirewallTestData(wlp)
		) => {
			const reduxStore = configurePreloadedStore(
				soc,
				mockedConfigDict,
				controls
			);

			conflictingZones.forEach(zone => {
				reduxStore.dispatch(addFirewallZone(zone));
			});
			configure(reduxStore);

			return cy.mount(
				<LocalizationProvider namespace='cfgtools'>
					<GenerateCode />
				</LocalizationProvider>,
				reduxStore
			);
		};

		const assertGenerationAllowed = () => {
			cy.dataTest(
				`generate-code:core:${projectCm4Id}:endSlot:icon`
			).click();
			cy.dataTest(
				`cfsSelectionCard:${projectCm4Id}:content:errors-container`
			).should('not.exist');

			cy.dataTest('generate-code:generate-btn')
				.should('exist')
				.should('not.have.attr', 'disabled', 'disabled');
		};

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

		it('Should block code generation on all projects when the firewall is enabled and has conflicts', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					mountWithConflictingZones(controls, reduxStore => {
						reduxStore.dispatch(setFirewallStatus('enabled'));
					}).then(() => {
						[projectCm4Id, projectRvId].forEach(projectId => {
							cy.dataTest(
								`generate-code:core:${projectId}:endSlot:icon`
							).click();
							cy.dataTest(
								`cfsSelectionCard:${projectId}:content:errors-container`
							).should('exist');
						});

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should NOT block code generation when the firewall is overridden to all open', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					mountWithConflictingZones(controls, reduxStore => {
						reduxStore.dispatch(setFirewallStatus('overrideAllOpen'));
					}).then(assertGenerationAllowed);
				}
			);
		});

		it('Should NOT block code generation when the firewall is overridden to all blocked', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					mountWithConflictingZones(controls, reduxStore => {
						reduxStore.dispatch(
							setFirewallStatus('overrideAllBlocked')
						);
					}).then(assertGenerationAllowed);
				}
			);
		});

		it('Should NOT block code generation when the SoC has no firewall support', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					mountWithConflictingZones(
						controls,
						reduxStore => {
							reduxStore.dispatch(setFirewallStatus('enabled'));
						},
						wlp
					).then(assertGenerationAllowed);
				}
			);
		});

		it('Should allow code generation when the firewall is enabled and has no conflicts', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						withFirewallTestData(wlp),
						mockedConfigDict,
						controls
					);

					reduxStore.dispatch(setFirewallStatus('enabled'));
					reduxStore.dispatch(addFirewallZone(conflictingZones[0]));

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(assertGenerationAllowed);
				}
			);
		});
	});

	context('Profiling errors', () => {
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

		it('Should display Profiling error and disable the Generate button when the Zephelin baud rate is undefined for all projects', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDictBothZephyr,
						controls
					);

					reduxStore.dispatch(
						toggleProfilingEnabled({
							projectId: projectCm4Id,
							enabled: true
						})
					);
					reduxStore.dispatch(
						toggleProfilingEnabled({
							projectId: projectRvId,
							enabled: true
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						[projectCm4Id, projectRvId].forEach(projectId => {
							cy.dataTest(
								`generate-code:core:${projectId}:endSlot:icon`
							).click();
							cy.dataTest(
								`cfsSelectionCard:${projectId}:content:errors-container`
							).should('contain.text', '1 errors in Profiling.');
						});

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should display a Profiling error for a preloaded config with an out-of-range interval, without any profiling action being dispatched', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDictPreloadedProfilingError,
						controls
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('contain.text', '1 errors in Profiling.');

						cy.dataTest(
							`generate-code:core:${projectCm4Id}:checkbox`
						).should('have.attr', 'aria-checked', 'false');
					});
				}
			);
		});

		it('Should not disable the Generate button when only one project has an undefined Zephelin baud rate', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDictBothZephyr,
						controls
					);

					reduxStore.dispatch(
						toggleProfilingEnabled({
							projectId: projectCm4Id,
							enabled: true
						})
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('contain.text', '1 errors in Profiling.');

						cy.dataTest(
							`generate-code:core:${projectRvId}:checkbox`
						).should('have.attr', 'aria-checked', 'true');

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});

		it('Should not show Profiling errors when Zephelin profiling is disabled', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDictBothZephyr,
						controls
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest(`generate-code:core:${projectCm4Id}`).should(
							'exist'
						);

						cy.dataTest(
							`generate-code:core:${projectCm4Id}:endSlot:icon`
						).click();
						cy.dataTest(
							`cfsSelectionCard:${projectCm4Id}:content:errors-container`
						).should('not.exist');

						cy.dataTest('generate-code:generate-btn')
							.should('exist')
							.should('not.have.attr', 'disabled', 'disabled');
					});
				}
			);
		});
	});

	context('Code generation flow', () => {
		beforeEach(() => {
			cy.viewport(1920, 1080);
			setupMessengerMock({'cfgtools/getGenerateCodeWarning': false});
			localStorage.setItem(
				'generatedFiles',
				JSON.stringify(['CM4-proj/main.c', 'RV-proj/main.c'])
			);
		});

		afterEach(() => {
			localStorage.removeItem('generatedFiles');
		});

		it('Should show a loading state, then the generated files, after clicking Generate', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest('generate-code:generate-btn').click();

						cy.dataTest('generated-files:loading').should('exist');
						cy.dataTest('generate-code:back-btn').should(
							'have.text',
							'Cancel'
						);

						cy.dataTest('generated-files:list-container')
							.should('exist')
							.and('contain.text', 'main.c');
						cy.dataTest('generate-code:back-btn').should(
							'have.text',
							'Back'
						);
					});
				}
			);
		});

		it('Should reset to the project list when Back is clicked after generation completes', () => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					const reduxStore = configurePreloadedStore(
						wlp,
						mockedConfigDict,
						controls
					);

					cy.mount(
						<LocalizationProvider namespace='cfgtools'>
							<GenerateCode />
						</LocalizationProvider>,
						reduxStore
					).then(() => {
						cy.dataTest('generate-code:generate-btn').click();

						cy.dataTest('generated-files:list-container').should(
							'exist'
						);

						cy.dataTest('generate-code:back-btn').click();

						cy.dataTest('generate-code:container').should('exist');
						cy.dataTest('generate-code:generate-btn').should('exist');
					});
				}
			);
		});
	});
});
