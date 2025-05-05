/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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

/* eslint-disable max-nested-callbacks */
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import {resetSocPeripherals} from '../../../utils/soc-peripherals';
import CoreSummary from './CoreSummary';

import {
	setSignalAssignment,
	setSignalGroupAssignment,
	setPeripheralAssignment,
	setPeripheralConfig,
	removeSignalAssignment,
	removePeripheralAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import {resetPinDictionary} from '../../../utils/soc-pins';
import type {CfsConfig} from 'cfs-plugins-api';

/* Disable 78002 tests while that part isn't supported.
const max78002csbga = await import(
	'../../../../../../../../cli/src/socs/max78002-csbga.json'
).then(module => module.default);
*/

const max32690wlp = (await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default)) as Soc;

const m4ProjectId = 'CM4-proj';
const rvProjectId = 'RV-proj';

const cm4Project = {
	Description: 'ARM Cortex-M4',
	ExternallyManaged: false,
	PluginId: 'com.analog.project.zephyr40.plugin',
	PluginVersion: '1.0.0',
	FirmwarePlatform: 'Zephyr 4.1',
	IsPrimary: true,
	Name: 'ARM Cortex-M4',
	CoreId: 'CM4',
	ProjectId: m4ProjectId
};

const rvProject = {
	Description: 'Risc-V (RV32)',
	ExternallyManaged: false,
	PluginId: 'com.analog.project.msdk.plugin',
	PluginVersion: '1.0.0',
	FirmwarePlatform: 'msdk',
	IsPrimary: true,
	Name: 'RISC-V (RV32)',
	CoreId: 'RV',
	ProjectId: rvProjectId
};

const cm4PreassignedPeripheral = [
	{
		Name: 'CM4 SysTick',
		Signals: [],
		Config: {
			ENABLE: 'FALSE'
		}
	}
];

const rvPreassignedPeripheral = [
	{
		Name: 'RV mtime',
		Signals: [],
		Config: {
			ENABLE: 'FALSE'
		}
	}
];

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	projects: [
		{
			...cm4Project
		},
		{
			...rvProject
		}
	]
};

const mockCfsConfigWithPreassignments = {
	Projects: [
		{
			...cm4Project,
			Peripherals: cm4PreassignedPeripheral,
			Partitions: [],
			PlatformConfig: {}
		},
		{
			...rvProject,
			Peripherals: rvPreassignedPeripheral,

			Partitions: [],
			PlatformConfig: {}
		}
	]
} as unknown as CfsConfig;

describe(
	'Peripheral Allocation - Core Summary',
	{viewportHeight: 822, viewportWidth: 688},
	() => {
		context('MAX32690-WLP', () => {
			beforeEach(() => {
				localStorage.setItem(
					'Cores',
					JSON.stringify(max32690wlp.Cores)
				);

				localStorage.setItem(
					'Peripherals',
					JSON.stringify(max32690wlp.Peripherals)
				);

				localStorage.setItem(
					'Package',
					JSON.stringify(max32690wlp.Packages[0])
				);

				localStorage.setItem(
					'Controls',
					JSON.stringify(max32690wlp.Controls)
				);

				localStorage.setItem(
					'configDict',
					JSON.stringify(mockedConfigDict)
				);

				cy.fixture(
					'max32690-wlp-zephyr-peripheral-controls.json'
				).then(controls => {
					localStorage.setItem(
						`pluginControls:${m4ProjectId}`,
						JSON.stringify(controls)
					);
				});

				cy.fixture('max32690-wlp-msdk-peripheral-controls.json').then(
					controls => {
						localStorage.setItem(
							`pluginControls:${rvProjectId}`,
							JSON.stringify(controls)
						);
					}
				);
			});

			afterEach(() => {
				cy.clearLocalStorage();
				resetPinDictionary();
				resetSocPeripherals();
			});

			it('Should display preallocated peripherals for a given core when available', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp,
					mockCfsConfigWithPreassignments
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj:allocation:CM4 SysTick')
					.should('exist')
					.within(() => {
						cy.dataTest('peripheral-assignment:name').should(
							'have.text',
							'CM4 SysTick'
						);

						cy.dataTest('peripheral-assignment:counter').should(
							'not.exist'
						);
					});

				cy.dataTest('core:CM4-proj:allocation:lock-icon').should(
					'exist'
				);

				cy.dataTest('core:RV-proj:allocation:RV mtime')
					.should('exist')
					.within(() => {
						cy.dataTest('peripheral-assignment:name').should(
							'have.text',
							'RV mtime'
						);

						cy.dataTest('peripheral-assignment:counter').should(
							'not.exist'
						);
					});

				cy.dataTest('core:RV-proj:allocation:lock-icon').should(
					'exist'
				);
			});

			it('Displays signal group assignments if available', () => {
				const reduxStore = configurePreloadedStore(max32690wlp);

				reduxStore.dispatch(
					setSignalGroupAssignment({
						peripheral: 'UART0',
						projectId: 'CM4-proj',
						config: {
							PARITY: 'DISABLED',
							CHAR_SIZE: '5',
							STOP_BITS: '1',
							HW_FLOW_CTRL: 'DISABLED',
							CHOSEN: '',
							BAUD: '115200'
						}
					})
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj').within(() => {
					cy.dataTest('core:CM4-proj:allocation:UART0')
						.should('exist')
						.within(() => {
							cy.dataTest('peripheral-assignment:name').should(
								'have.text',
								'UART0'
							);

							cy.dataTest('peripheral-assignment:counter').should(
								'have.text',
								'0/4'
							);

							cy.dataTest(
								'core:CM4-proj:allocation:UART0:chevron'
							).click();

							const expectedSignals = ['CTS', 'RTS', 'RX', 'TX'];

							expectedSignals.forEach(signal => {
								cy.dataTest(`signal-assignment:${signal}`)
									.should('exist')
									.within(() => {
										cy.dataTest('signal-assignment:name').should(
											'have.text',
											signal
										);
									});
							});
						});
				});
			});

			it('Displays individual signal assignments if available', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp as unknown as Soc
				);

				reduxStore.dispatch(
					setSignalAssignment({
						peripheral: 'GPIO0',
						signalName: 'P0.1',
						projectId: 'RV-proj'
					})
				);

				reduxStore.dispatch(
					setSignalAssignment({
						peripheral: 'GPIO0',
						signalName: 'P0.2',
						projectId: 'CM4-proj'
					})
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:RV-proj').within(() => {
					cy.dataTest('core:RV-proj:allocation:GPIO0')
						.should('exist')
						.within(() => {
							cy.dataTest(
								'core:RV-proj:allocation:GPIO0:chevron'
							).click();

							cy.dataTest('signal-assignment:P0.1')
								.should('exist')
								.within(() => {
									cy.dataTest('signal-assignment:name').should(
										'have.text',
										'P0.1'
									);
								});
						});
				});

				cy.dataTest('core:CM4-proj').within(() => {
					cy.dataTest(
						'core:CM4-proj:allocation:GPIO0:chevron'
					).click();

					cy.dataTest('core:CM4-proj:allocation:GPIO0')
						.should('exist')
						.within(() => {
							cy.dataTest('signal-assignment:P0.2')
								.should('exist')
								.within(() => {
									cy.dataTest('signal-assignment:name').should(
										'have.text',
										'P0.2'
									);
								});
						});
				});
			});

			it('Displays peripheral assignments for peripherals with no signals', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp as unknown as Soc
				);

				reduxStore.dispatch(
					setPeripheralAssignment({
						peripheral: 'DMA',
						projectId: 'CM4-proj',
						config: {}
					})
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj').within(() => {
					cy.dataTest('core:CM4-proj:allocation:DMA')
						.should('exist')
						.within(() => {
							cy.dataTest('peripheral-assignment:name').should(
								'have.text',
								'DMA'
							);

							cy.dataTest('peripheral-assignment:counter').should(
								'not.exist'
							);
						});
				});
			});

			it('Should display the pin assignment information for each signal', () => {
				const reduxStore = configurePreloadedStore(max32690wlp);

				const coreId = 'RV';
				const peripheral = 'GPIO0';
				const signalName = 'P0.1';
				const signalWithoutPin = 'P0.2';
				const signalAssignedToDifferentCore = 'P0.3';
				const pinId = 'J2';

				reduxStore.dispatch(
					setSignalAssignment({
						peripheral,
						signalName,
						projectId: 'RV-proj'
					})
				);

				reduxStore.dispatch(
					setAppliedSignal({
						Pin: pinId,
						Peripheral: peripheral,
						Name: signalName
					})
				);

				reduxStore.dispatch(
					setSignalAssignment({
						peripheral,
						signalName: signalWithoutPin,
						projectId: 'RV-proj'
					})
				);

				reduxStore.dispatch(
					setSignalAssignment({
						peripheral,
						signalName: signalAssignedToDifferentCore,
						projectId: 'CM4-proj'
					})
				);

				cy.mount(<CoreSummary />, reduxStore).then(() => {
					cy.dataTest(`core:${coreId}-proj`).within(() => {
						cy.dataTest(
							`core:${coreId}-proj:allocation:${peripheral}`
						).within(() => {
							cy.dataTest(
								`core:${coreId}-proj:allocation:${peripheral}:chevron`
							).click();

							// Counter should reflect the number of signals with pin assignments
							cy.dataTest('peripheral-assignment:counter').should(
								'have.text',
								'1/2'
							);

							// Signal with pin assignment should display the pin assignment information
							cy.dataTest(`signal-assignment:${signalName}`).within(
								() => {
									cy.dataTest('signal-assignment:name').should(
										'contain',
										signalName
									);

									cy.dataTest('pin-assignment-info').should(
										'contain',
										`${signalName} (${pinId})`
									);
								}
							);

							// Signal without pin assignment should display '--'
							cy.dataTest(
								`signal-assignment:${signalWithoutPin}`
							).within(() => {
								cy.dataTest('signal-assignment:name').should(
									'contain',
									signalWithoutPin
								);

								cy.dataTest('pin-assignment-info').should(
									'contain',
									'--'
								);
							});

							// Signal assigned to a different core should not be displayed within the current card
							cy.dataTest(
								`signal-assignment:${signalAssignedToDifferentCore}`
							).should('not.exist');
						});
					});

					cy.dataTest(`core:CM4-proj`).within(() => {
						cy.dataTest(
							`core:CM4-proj:allocation:${peripheral}`
						).within(() => {
							cy.dataTest(
								`core:CM4-proj:allocation:${peripheral}:chevron`
							).click();

							// Signal assigned to a different core should be displayed within the corresponding card
							cy.dataTest(
								`signal-assignment:${signalAssignedToDifferentCore}`
							).within(() => {
								cy.dataTest('signal-assignment:name').should(
									'contain',
									signalAssignedToDifferentCore
								);
							});

							cy.dataTest('peripheral-assignment:counter').should(
								'have.text',
								'0/1'
							);
						});
					});
				});
			});

			it('Should show conflict icon and required status for signals with required pin assignments.', () => {
				localStorage.setItem(
					'Controls',
					JSON.stringify(max32690wlp.Controls)
				);
				const reduxStore = configurePreloadedStore(
					max32690wlp as unknown as Soc
				);

				const SPI0 = 'SPI0';
				const coreId = 'RV';
				const signalName = 'MISO';

				reduxStore.dispatch(
					setSignalAssignment({
						peripheral: SPI0,
						signalName,
						projectId: 'RV-proj'
					})
				);

				reduxStore.dispatch(
					setPeripheralConfig({
						peripheralId: SPI0,
						config: {
							DIRECTION: 'TARGET',
							MODE: 'FOUR_WIRE',
							WORD_SIZE: '2'
						}
					})
				);

				cy.mount(<CoreSummary />, reduxStore).then(() => {
					cy.dataTest(`core:${coreId}-proj`).within(() => {
						cy.dataTest(
							`core:${coreId}-proj:allocation:${SPI0}:chevron`
						).click();

						cy.dataTest(
							`core:${coreId}-proj:allocation:${SPI0}`
						).within(() => {
							cy.dataTest(`signal-assignment:${signalName}`).within(
								() => {
									cy.dataTest('pin-assignment-info').should(
										'have.text',
										'--(required)'
									);
									cy.dataTest('signal-assignment:conflict').should(
										'exist'
									);
								}
							);
						});
					});
				});
			});

			it('Should remove preallocated peripherals and signals', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp as unknown as Soc
				);

				reduxStore.dispatch(
					setPeripheralAssignment({
						peripheral: 'DMA',
						projectId: 'CM4-proj',
						config: {}
					})
				);

				reduxStore.dispatch(
					setSignalAssignment({
						peripheral: 'GPIO0',
						signalName: 'P0.1',
						projectId: 'RV-proj'
					})
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:RV-proj').within(() => {
					cy.dataTest('core:RV-proj:allocation:GPIO0')
						.should('exist')
						.within(() => {
							cy.dataTest(
								'core:RV-proj:allocation:GPIO0:chevron'
							).click();

							cy.dataTest('signal-assignment:P0.1').should('exist');
						})
						.then(() => {
							cy.wrap(
								reduxStore.dispatch(
									removeSignalAssignment({
										peripheral: 'GPIO0',
										signalName: 'P0.1'
									})
								)
							).then(() => {
								cy.dataTest('core:RV-proj:allocation:GPIO0').should(
									'not.exist'
								);
							});
						});
				});

				cy.dataTest('core:CM4-proj')
					.within(() => {
						cy.dataTest('core:CM4-proj:allocation:DMA').should(
							'exist'
						);
					})
					.then(() => {
						cy.wrap(
							reduxStore.dispatch(
								removePeripheralAssignment({
									peripheral: 'DMA'
								})
							)
						).then(() => {
							cy.dataTest('core:CM4-proj').within(() => {
								cy.dataTest('core:CM4-proj:allocation:DMA').should(
									'not.exist'
								);
							});
						});
					});
			});

			it('Should display peripherals in alphabetical order by name', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp as unknown as Soc,
					mockCfsConfigWithPreassignments
				);

				reduxStore.dispatch(
					setSignalGroupAssignment({
						peripheral: 'UART0',
						projectId: 'CM4-proj',
						config: {
							PARITY: 'DISABLED',
							CHAR_SIZE: '5',
							STOP_BITS: '1',
							HW_FLOW_CTRL: 'DISABLED',
							CHOSEN: '',
							BAUD: '115200'
						}
					})
				);

				reduxStore.dispatch(
					setPeripheralAssignment({
						peripheral: 'DMA',
						projectId: 'CM4-proj',
						config: {}
					})
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.wait(1000);

				cy.dataTest('core:CM4-proj').within(() => {
					cy.dataTest('core:CM4-proj:allocation:CM4 SysTick').should(
						'exist'
					);
					cy.dataTest('core:CM4-proj:allocation:UART0').should(
						'exist'
					);

					cy.dataTest('core:CM4-proj:allocation:DMA').should('exist');
				});

				cy.dataTest('core:CM4-proj')
					.find('> *')
					.then(children => {
						const textsInOrder = children
							.map((_, el) => Cypress.$(el).text().trim())
							.get();

						// First the preallocated peripheral
						expect(textsInOrder[1]).to.include('CM4 SysTick');
						// Then peripherals in alphabetical order
						expect(textsInOrder[2]).to.include('DMA');
						expect(textsInOrder[3]).to.include('UART0');
					});
			});
		});

		/* Disable 78002 tests while that part isn't supported.
		** Also, currently there are no parts that have no preallocated peripherals, as there is always a SysTick timer. So commenting out that test too.
		context('MAX78002-CSBGA', () => {
			beforeEach(() => {
				localStorage.setItem(
					'Cores',
					JSON.stringify(max78002csbga.Cores)
				);

				localStorage.setItem(
					'Peripherals',
					JSON.stringify(max78002csbga.Peripherals)
				);

				localStorage.setItem(
					'Package',
					JSON.stringify(max78002csbga.Packages[0])
				);
			});

			afterEach(() => {
				cy.clearLocalStorage();
				resetPinDictionary();
				resetSocPeripherals();
			});

			it('Should list all available cores for a given SoC', () => {
				const reduxStore = configurePreloadedStore(
					max78002csbga as unknown as Soc
				);

				localStorage.setItem(
					'Cores',
					JSON.stringify(max32690wlp.Cores)
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj').should('exist');

				cy.dataTest('core:CM4-proj:label').should(
					'have.text',
					'ARM Cortex-M4'
				);

				cy.dataTest('core:CM4-proj:primary-tag')
					.should('exist')
					.should('have.text', 'Primary');

				cy.dataTest('core:RV-proj').should('exist');

				cy.dataTest('core:RV-proj:label').should(
					'have.text',
					'RISC-V (RV32)'
				);
			});

			it('Should display the "No peripherals allocated" when there are no preallocations or user allocations', () => {
				window.localStorage.setItem(
					'Cores',
					JSON.stringify(max78002csbga.Cores)
				);

				window.localStorage.setItem(
					'Peripherals',
					JSON.stringify(max78002csbga.Peripherals)
				);

				const reduxStore = configurePreloadedStore(
					max78002csbga as unknown as Soc
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj').should('exist');

				cy.dataTest('core:CM4-proj:no-allocations')
					.should('exist')
					.should('have.text', 'No peripherals allocated.');

				cy.dataTest('core:RV-proj').should('exist');

				cy.dataTest('core:RV-proj:no-allocations')
					.should('exist')
					.should('have.text', 'No peripherals allocated.');
			});
		}); */
	}
);
