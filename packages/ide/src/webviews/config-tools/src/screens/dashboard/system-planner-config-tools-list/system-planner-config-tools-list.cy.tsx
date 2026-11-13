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

import {type ControlCfg, type Soc} from '@common/types/soc';
import {setClockNodeControlValue} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import {configurePreloadedStore} from '../../../state/store';
import {CONTROL_SCOPES} from '../../../constants/scopes';
import {resetClockNodes} from '../../../utils/clock-nodes';
import {resetDfg} from '../../../utils/dfg';
import {resetCoreMemoryDictionary} from '../../../utils/memory';
import {resetPinDictionary} from '../../../utils/soc-pins';
import {resetSocPeripherals} from '../../../utils/soc-peripherals';
import {withFirewallTestData} from '../../firewall-config/firewall-test-data';
import {
	addFirewallZone,
	setFirewallStatus
} from '../../../state/slices/firewall/firewall.reducer';
import type {FirewallZone} from '../../../types/firewall';
import SystemPlannerConfigToolsList from './system-planner-config-tools-list';

import type {CfsConfig} from 'cfs-types';
import {
	createScopeConflictDictionary,
	createScopeDictionaryFromUsages
} from '../../../test-utils/scope-conflict-test-utils';
const wlp = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

const socAdsp = await import('@socs/adsp-sc834w-bga_ed.json').then(
	module => module.default as unknown as Soc
);

const projectCm4Id = 'CM4-proj';
const projectRvId = 'RV-proj';

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
			ProjectId: projectCm4Id
		},
		{
			CoreNum: 1,
			Description: 'RISC-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			CoreId: 'RV',
			Name: 'RISC-V (RV32)',
			PluginId: '',
			ProjectId: projectRvId
		}
	]
} as unknown as CfsConfig;

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

const configWithPeripheralScopeConflict = {
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

const dfgConfigDict = {
	BoardName: '',
	Package: 'DFG',
	Soc: 'DFGTEST',
	Projects: [
		{
			Description: 'DFG Project',
			FirmwarePlatform: 'zephyr',
			Name: 'DFG Project',
			PluginId: '',
			ProjectId: 'DFG-proj'
		},
		{
			Description: 'DSS Project',
			FirmwarePlatform: 'zephyr',
			Name: 'DSS Project',
			PluginId: '',
			ProjectId: 'DSS-HiFi5s'
		}
	]
} as unknown as CfsConfig;

const dfgScopeConflictEntry = {
	groupId: 'ASS',
	controlId: 'ALIAS',
	value: 'fish',
	controlScope: CONTROL_SCOPES.DFG,
	projectId: 'DFG-proj',
	coreId: 'CMxx',
	scope: 'DFG-proj zephyr phandles',
	scopeKey: 'DFG-proj zephyr phandles',
	itemId: 'ASS[0]',
	configPath: 'DFG.Streams.1.Endpoints.ASS.0.Config.ALIAS'
};

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

	it('should render the conflict icon when there is a memory scope conflict', () => {
		const reduxStore = configurePreloadedStore(
			wlp,
			mockedConfigDict,
			undefined,
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

		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.dataTest('memory-allocation-error').should('exist');
	});

	it('should render the conflict icon when there is a pin scope conflict', () => {
		const reduxStore = configurePreloadedStore(
			wlp,
			mockedConfigDict,
			undefined,
			createScopeConflictDictionary({
				scopeKey: `${projectCm4Id} zephyr dtnames IN`,
				value: 'shared_gpio',
				controlScope: CONTROL_SCOPES.PIN_CONFIG,
				controlId: 'DT_NAME',
				projectId: projectCm4Id,
				coreId: 'CM4',
				groupId: 'PinConfig',
				itemIds: ['P0.9', 'P0.10']
			})
		);

		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.dataTest('pinmux-error').should('exist');
	});

	it('should render the conflict icon when there is a peripheral scope conflict', () => {
		localStorage.setItem(
			`pluginControls:${projectRvId}`,
			JSON.stringify(i2sControls)
		);

		const reduxStore = configurePreloadedStore(
			wlp,
			configWithPeripheralScopeConflict,
			undefined,
			peripheralScopeConflicts
		);

		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.dataTest('peripheral-allocation-error')
			.should('exist')
			.then(() => {
				localStorage.removeItem(`pluginControls:${projectRvId}`);
			});
	});

	it('should render the conflict icon when there is a DFG scope conflict', () => {
		cy.fixture('dfgtest-dfg.json').then(soc => {
			const dfgScopeConflictConfig = {
				...mockedConfigDict,
				Soc: 'DFGTEST',
				Projects: [
					{
						...mockedConfigDict.Projects[0],
						ProjectId: 'Proj_ID1',
						CoreId: 'CMxx',
						Name: 'ARM Cortex-Mxx'
					}
				]
			} as unknown as CfsConfig;

			const reduxStore = configurePreloadedStore(
				soc,
				dfgScopeConflictConfig,
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

			cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
			cy.dataTest('dfg-error').should('exist');
		});
	});

	it('should not render the DFG card when the Gaskets are not available', () => {
		resetClockNodes();
		resetCoreMemoryDictionary();
		resetDfg();
		const reduxStore = configurePreloadedStore(wlp);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="dfg-card"]').should('not.exist');
	});

	it('should not render the DFG conflict icon for the same config path emitted for multiple projects', () => {
		cy.fixture('dfgtest-dfg.json').then((soc: Soc) => {
			const reduxStore = configurePreloadedStore(
				soc,
				dfgConfigDict,
				undefined,
				{
					'DFG-proj zephyr phandles': {
						fish: [
							dfgScopeConflictEntry,
							{
								...dfgScopeConflictEntry,
								projectId: 'DSS-HiFi5s'
							}
						]
					}
				}
			);

			cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
			cy.get('[data-test="dfg-card"]').should('be.visible');
			cy.get('[data-test="dfg-error"]').should('not.exist');
		});
	});

	it('should render the DFG conflict icon for entries from different config paths', () => {
		cy.fixture('dfgtest-dfg.json').then((soc: Soc) => {
			const reduxStore = configurePreloadedStore(
				soc,
				dfgConfigDict,
				undefined,
				{
					'DFG-proj zephyr phandles': {
						fish: [
							dfgScopeConflictEntry,
							{
								...dfgScopeConflictEntry,
								groupId: 'BSS',
								itemId: 'BSS[0]',
								configPath:
									'DFG.Streams.1.Endpoints.BSS.0.Config.ALIAS'
							}
						]
					}
				}
			);

			cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
			cy.get('[data-test="dfg-card"]').should('be.visible');
			cy.get('[data-test="dfg-error"]').should('exist');
		});
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

	it('should render the Firewall Config card when the SoC supports it', () => {
		const configWithFirewall = {
			...mockedConfigDict,
			Soc: 'ADAU2042'
		} as unknown as CfsConfig;

		const reduxStore = configurePreloadedStore(
			withFirewallTestData(wlp),
			configWithFirewall
		);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="firewall-card"]').should('exist');
	});

	it("should not render the Firewall Config card when the SoC doesn't support it", () => {
		const configWithoutFirewall = {
			...mockedConfigDict,
			Soc: 'MAX32690'
		} as unknown as CfsConfig;

		const reduxStore = configurePreloadedStore(
			wlp,
			configWithoutFirewall
		);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="firewall-card"]').should('not.exist');
	});

	describe('Firewall Config card errors', () => {
		const sharedEntries = [
			'initiators::Initiators::dma_dde_0',
			'responders::M55_Itcm::m55_itcm_0'
		];

		const zone = (id: string, secureOnly: boolean): FirewallZone => ({
			id,
			name: `Zone ${id}`,
			description: '',
			accessMode: secureOnly ? 'restricted' : 'open',
			accessModes: {
				nonSecureNonPrivileged: !secureOnly,
				nonSecurePrivileged: !secureOnly,
				secureNonPrivileged: true,
				securePrivileged: true
			},
			selectedFirewalls: sharedEntries
		});

		const storeWithConflicts = () => {
			const reduxStore = configurePreloadedStore(
				withFirewallTestData(wlp),
				{...mockedConfigDict, Soc: 'ADAU2042'} as unknown as CfsConfig
			);

			reduxStore.dispatch(addFirewallZone(zone('a', false)));
			reduxStore.dispatch(addFirewallZone(zone('b', true)));

			return reduxStore;
		};

		it('should show the conflict icon when the firewall is enabled and has conflicts', () => {
			const reduxStore = storeWithConflicts();
			reduxStore.dispatch(setFirewallStatus('enabled'));

			cy.mount(<SystemPlannerConfigToolsList />, reduxStore);

			cy.get('[data-test="firewall-error"]')
				.should('exist')
				.and('have.attr', 'role', 'img')
				.and('have.attr', 'aria-label', 'Has conflicts');
		});

		it('should not show the conflict icon when the firewall is overridden', () => {
			const reduxStore = storeWithConflicts();
			reduxStore.dispatch(setFirewallStatus('overrideAllOpen'));

			cy.mount(<SystemPlannerConfigToolsList />, reduxStore);

			cy.get('[data-test="firewall-card"]').should('exist');
			cy.get('[data-test="firewall-error"]').should('not.exist');
		});

		it('should not show the conflict icon when there are no conflicts', () => {
			const reduxStore = configurePreloadedStore(
				withFirewallTestData(wlp),
				{...mockedConfigDict, Soc: 'ADAU2042'} as unknown as CfsConfig
			);
			reduxStore.dispatch(addFirewallZone(zone('a', false)));

			cy.mount(<SystemPlannerConfigToolsList />, reduxStore);

			cy.get('[data-test="firewall-card"]').should('exist');
			cy.get('[data-test="firewall-error"]').should('not.exist');
		});
	});

	it('should render the Signal Routing Unit card when the SoC peripherals contain SRU', () => {
		resetSocPeripherals();
		const configWithSharcFxCore = {
			Soc: 'ADSP-SC834W',
			Projects: [
				{
					Description: 'SHARC-FX',
					ExternallyManaged: false,
					FirmwarePlatform: 'msdk',
					CoreId: 'FX',
					Name: 'SHARC-FX',
					PluginId: '',
					ProjectId: 'FX-proj'
				}
			]
		} as unknown as CfsConfig;

		const reduxStore = configurePreloadedStore(
			socAdsp,
			configWithSharcFxCore
		);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="signal-routing-unit-card"]').should('exist');
	});

	it('should not render the Signal Routing Unit card when the SoC has no SRU peripherals', () => {
		resetSocPeripherals();
		const reduxStore = configurePreloadedStore(wlp, mockedConfigDict);
		cy.mount(<SystemPlannerConfigToolsList />, reduxStore);
		cy.get('[data-test="signal-routing-unit-card"]').should(
			'not.exist'
		);
	});
});
