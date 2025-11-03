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
import CoreSummary from './CoreSummary';
import type {CfsConfig} from 'cfs-plugins-api';
import {
	setPeripheralAssignment,
	setSignalAssignment,
	setSignalGroupAssignment
} from '../../../state/slices/peripherals/peripherals.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

/* Disable 78002 tests while that part isn't supported.
const max78002csbga = await import(
	   '@socs/max78002-csbga.json'
).then(module => module.default);
*/

const max32690wlp = (await import('@socs/max32690-wlp.json').then(
	module => module.default
)) as Soc;

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
	PluginVersion: '1.1.0',
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
	Projects: [
		{
			...cm4Project
		},
		{
			...rvProject
		}
	]
} as unknown as CfsConfig;

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

			it('Should display core cards', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp,
					mockCfsConfigWithPreassignments
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj:label').should('exist');

				cy.dataTest('core:CM4-proj:primary-tag').should('exist');

				cy.dataTest('core:RV-proj:label').should('exist');

				cy.dataTest('core:RV-proj:primary-tag').should('exist');
			});

			it('should display preallocated peripheral in core card', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp,
					mockCfsConfigWithPreassignments
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj:label')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest(
							'core:CM4-proj:allocation:CM4 SysTick'
						).should('exist');

						cy.dataTest('core:CM4-proj:allocation:lock-icon').should(
							'exist'
						);
					});

				cy.dataTest('core:RV-proj:label')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest('core:RV-proj:allocation:RV mtime').should(
							'exist'
						);
						cy.dataTest('core:RV-proj:allocation:lock-icon').should(
							'exist'
						);
					});
			});

			it('should display signal group but signals should not be visible', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp,
					mockedConfigDict
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
				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj:label')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest('core:CM4-proj:allocation:UART0').should(
							'exist'
						);
						cy.dataTest('accordion:UART0').should('not.exist');
					});
			});

			it('should display individual signals assignment inside core card', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp as unknown as Soc,
					mockedConfigDict
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

				reduxStore.dispatch(
					setAppliedSignal({
						Pin: 'J2', // or any valid pin name
						Peripheral: 'GPIO0',
						Name: 'P0.1'
					})
				);
				reduxStore.dispatch(
					setAppliedSignal({
						Pin: 'J3',
						Peripheral: 'GPIO0',
						Name: 'P0.2'
					})
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:RV-proj:label')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest('core:RV-proj:allocation:GPIO0')
							.should('exist')
							.click()
							.then(() => {
								cy.dataTest('signal-assignment:P0.1').should('exist');
							});
					});

				cy.dataTest('core:CM4-proj:label')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest('core:CM4-proj:allocation:GPIO0')
							.should('exist')
							.click()
							.then(() => {
								cy.dataTest('signal-assignment:P0.2').should('exist');
							});
					});
			});

			it('should display peripheral assignment with no signal in the core card', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp as unknown as Soc,
					mockedConfigDict
				);

				reduxStore.dispatch(
					setPeripheralAssignment({
						peripheral: 'DMA',
						projectId: 'CM4-proj',
						config: {}
					})
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj:label')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest('core:CM4-proj:allocation:DMA').should(
							'exist'
						);
					});
			});

			it('should display signal assignment information in the core card', () => {
				const reduxStore = configurePreloadedStore(
					max32690wlp,
					mockedConfigDict
				);

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
				reduxStore.dispatch(
					setAppliedSignal({
						Pin: pinId,
						Peripheral: peripheral,
						Name: signalAssignedToDifferentCore
					})
				);

				cy.mount(<CoreSummary />, reduxStore).then(() => {
					cy.dataTest('core:CM4-proj:label')
						.should('exist')
						.click()
						.then(() => {
							cy.dataTest('core:CM4-proj:allocation:GPIO0')
								.should('exist')
								.click()
								.then(() => {
									// Signal without pin assignment should display '--'

									cy.dataTest('signal-assignment:name').should(
										'contain',
										signalAssignedToDifferentCore
									);
								});
						});

					cy.dataTest('core:RV-proj:label')
						.should('exist')
						.click()
						.then(() => {
							cy.dataTest('core:RV-proj:allocation:GPIO0')
								.should('exist')
								.click()
								.then(() => {
									cy.dataTest('signal-assignment:name').should(
										'contain',
										signalName
									);

									cy.dataTest('pin-assignment-info').should(
										'contain',
										`${signalName} (${pinId})`
									);
								});
						});
				});
			});

			it('should be able to delete signal and peripheral assignemnts', () => {
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

				reduxStore.dispatch(
					setSignalAssignment({
						peripheral: 'GPIO0',
						signalName: 'P0.2',
						projectId: 'RV-proj'
					})
				);

				reduxStore.dispatch(
					setAppliedSignal({
						Pin: 'J2', // or any valid pin name
						Peripheral: 'GPIO0',
						Name: 'P0.1'
					})
				);
				reduxStore.dispatch(
					setAppliedSignal({
						Pin: 'J3',
						Peripheral: 'GPIO0',
						Name: 'P0.2'
					})
				);

				cy.mount(<CoreSummary />, reduxStore);

				cy.dataTest('core:CM4-proj:label')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest('core:CM4-proj:allocation:DMA').should(
							'exist'
						);
						cy.dataTest('core:CM4-proj-DMA:allocation:delete-icon')
							.should('exist')
							.click()
							.then(() => {
								cy.dataTest('core:CM4-proj:allocation:DMA').should(
									'not.exist'
								);
							});
					});

				cy.dataTest('core:RV-proj:label')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest('core:RV-proj:allocation:GPIO0')
							.should('exist')
							.click()
							.then(() => {
								cy.dataTest('signal-assignment:P0.1').should('exist');
								cy.dataTest('signal-assignment:P0.2').should('exist');
								cy.dataTest('core:GPIO0-P0.1:allocation:delete-icon')
									.should('exist')
									.click()
									.then(() => {
										cy.dataTest('signal-assignment:P0.1').should(
											'not.exist'
										);
										cy.dataTest('signal-assignment:P0.2').should(
											'exist'
										);
									});
							});
					});
			});
		});
	}
);
