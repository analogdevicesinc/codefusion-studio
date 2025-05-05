/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import type {ConfiguredPin} from '@common/api';
import type {Soc} from '@common/types/soc';
import {setActiveConfiguredSignal} from '../../../../state/slices/app-context/appContext.reducer';
import {setAppliedSignal} from '../../../../state/slices/pins/pins.reducer';
import {configurePreloadedStore} from '../../../../state/store';
import PinconfigDisplay from './PinconfigDisplay';
import {
	setActivePeripheral,
	setActiveSignal,
	setPeripheralAssignment,
	setSignalAssignment
} from '../../../../state/slices/peripherals/peripherals.reducer';
import type {CfsConfig} from 'cfs-plugins-api';
import {resetPinDictionary} from '../../../../utils/soc-pins';
import {computeInitialPinConfig} from '../../../../utils/pin-reset-controls';

const mock = (await import(
	`../../../../../../../../../cli/src/socs/max32690-tqfn.json`
).then(module => module.default)) as unknown as Soc;

const mockControlsPromise = Promise.resolve({
	PinConfig: mock.Controls?.PinConfig || []
});

const configDict = {
	BoardName: '',
	Package: 'TQFN',
	Soc: 'MAX32690',
	projects: [
		{
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: 'zephyr',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		}
	]
};

describe('PinconfigDisplay component', () => {
	beforeEach(() => {
		resetPinDictionary();

		localStorage.setItem(
			'Peripherals',
			JSON.stringify(mock.Peripherals)
		);
		localStorage.setItem('Registers', JSON.stringify(mock.Registers));
		localStorage.setItem('Package', JSON.stringify(mock.Packages[0]));
		localStorage.setItem('configDict', JSON.stringify(configDict));

		localStorage.setItem(
			'pluginControls:CM4-proj',
			JSON.stringify(mock.Controls)
		);
	});

	it('Checks for correctly computed defaults', () => {
		computeInitialPinConfig({
			Pin: '41',
			Peripheral: 'LPTMR0',
			Signal: 'IOA',
			ProjectId: 'CM4-proj'
		})
			.then(result => {
				const reduxStore = configurePreloadedStore(mock);

				reduxStore.dispatch(
					setPeripheralAssignment({
						peripheral: 'LPTMR0',
						projectId: 'CM4-proj',
						config: {}
					})
				);

				reduxStore.dispatch(setActivePeripheral('LPTMR0'));

				reduxStore.dispatch(
					setActiveSignal({
						peripheral: 'LPTMR0',
						signal: 'IOA',
						keepActivePeripheral: true
					})
				);
				reduxStore.dispatch(
					setAppliedSignal({
						Pin: '41',
						Peripheral: 'LPTMR0',
						Name: 'IOA',
						PinCfg: result
					})
				);
				reduxStore.dispatch(
					setActiveConfiguredSignal({
						peripheralName: 'LPTMR0',
						signalName: 'IOA',
						pinId: '41'
					})
				);

				cy.mount(
					<PinconfigDisplay
						controlsPromise={mockControlsPromise}
						projectId='CM4-proj'
					/>,
					reduxStore
				);

				cy.dataTest('TMR_SIGNAL_TYPE-IOA-control-dropdown').should(
					'have.value',
					'IN'
				);
				cy.dataTest('PWR-IOA-control-dropdown').should(
					'have.value',
					'VDDIO'
				);
				cy.dataTest('PS-IOA-control-dropdown').should(
					'have.value',
					'DIS'
				);
			})
			.catch(error => {
				throw new Error(`Error computing default value: ${error}`);
			});
	});

	it('Changes dropdown values and verifies for correct recomputations', () => {
		const reduxStore = configurePreloadedStore(mock);

		reduxStore.dispatch(
			setSignalAssignment({
				peripheral: 'GPIO0',
				signalName: 'P0.7',
				projectId: 'CM4-proj'
			})
		);

		reduxStore.dispatch(setActivePeripheral('GPIO0'));

		reduxStore.dispatch(
			setActiveSignal({
				peripheral: 'GPIO0',
				signal: 'P0.7',
				keepActivePeripheral: true
			})
		);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '7',
				Peripheral: 'GPIO0',
				Name: 'P0.7',
				PinCfg: {
					MODE: 'IN',
					PWR: 'VDDIO',
					PS: 'DIS'
				}
			})
		);
		reduxStore.dispatch(
			setActiveConfiguredSignal({
				peripheralName: 'GPIO0',
				signalName: 'P0.7',
				pinId: '7'
			})
		);

		cy.mount(
			<PinconfigDisplay
				controlsPromise={mockControlsPromise}
				projectId='CM4-proj'
			/>,
			reduxStore
		);

		cy.dataTest('MODE-P0.7-control-dropdown').click();
		cy.dataTest('P0.7-7-OUT').click();
		cy.dataTest('package-display-info')
			.find('p')
			.first()
			.should('have.text', '* non-default value');
		cy.dataTest('PS-P0.7-control-dropdown').should('not.exist');
		cy.dataTest('DS-P0.7-control-dropdown').should('have.value', '0');
	});

	it('Correctly resets to default values a pre-configured signal', () => {
		// For the third test
		const persistedPinConfig: ConfiguredPin[] = [
			{
				Pin: '39',
				Peripheral: 'ADC',
				Signal: 'AIN0'
			}
		];

		const persistedProjectConfig = [
			{
				ProjectId: 'CM4-proj',
				CoreId: 'CM4',
				Peripherals: [
					{
						Name: 'ADC',
						Signals: [
							{
								Name: 'AIN0',
								Config: {
									PWR: 'VDDIOH' // Non-default value
								}
							}
						]
					}
				],
				Partitions: [],
				PlatformConfig: {}
			}
		];

		const reduxStore = configurePreloadedStore(mock, {
			Pins: persistedPinConfig,
			Projects: persistedProjectConfig
		} as unknown as CfsConfig);

		reduxStore.dispatch(setActivePeripheral('ADC'));

		reduxStore.dispatch(
			setActiveSignal({
				peripheral: 'ADC',
				signal: 'AIN0',
				keepActivePeripheral: true
			})
		);

		reduxStore.dispatch(
			setActiveConfiguredSignal({
				peripheralName: 'ADC',
				signalName: 'AIN0',
				pinId: '39'
			})
		);

		cy.mount(
			<PinconfigDisplay
				controlsPromise={mockControlsPromise}
				projectId='CM4-proj'
			/>,
			reduxStore
		);

		// Should assert that the loaded values is non default.
		cy.dataTest('package-display-info')
			.find('p')
			.first()
			.should('have.text', '* non-default value');

		cy.dataTest('PWR-AIN0-control-dropdown')
			.should('exist')
			.click()
			.then(() => {
				cy.dataTest('AIN0-39-VDDIO')
					.should('exist')
					.click()
					.then(() => {
						cy.dataTest('package-display-info').should('not.exist');
					});
			});
	});
});
