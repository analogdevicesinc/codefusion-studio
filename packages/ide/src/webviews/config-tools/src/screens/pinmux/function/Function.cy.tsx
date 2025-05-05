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
import type {
	Soc,
	FormattedPeripheral,
	FormattedPeripheralSignal,
	UnifiedPeripherals
} from '@common/types/soc';
import Peripheral from '../../../components/peripheral/Peripheral';
import {configurePreloadedStore} from '../../../state/store';
import {getSocPeripheralDictionary} from '../../../utils/soc-peripherals';
const mock = await import(
	`../../../../../../../../cli/src/socs/max32690-tqfn.json`
);

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

describe('Function component', () => {
	beforeEach(() => {
		localStorage.setItem('Package', JSON.stringify(mock.Packages[0]));

		localStorage.setItem('configDict', JSON.stringify(configDict));

		localStorage.setItem('Cores', JSON.stringify(mock.Cores));

		localStorage.setItem(
			'Peripherals',
			JSON.stringify(mock.Peripherals)
		);
		localStorage.setItem(
			'pluginControls:CM4-proj',
			JSON.stringify(mock.Controls)
		);
	});

	const reduxStore = configurePreloadedStore(mock as unknown as Soc);

	it('Assigns coprogrammed signals correctly', () => {
		const socPeripheralDictionary: Array<
			FormattedPeripheral<FormattedPeripheralSignal>
		> = Object.values(getSocPeripheralDictionary());

		const {peripheralSignalsTargets} =
			reduxStore.getState().peripheralsReducer;

		const unifiedPeripherals =
			socPeripheralDictionary.reduce<UnifiedPeripherals>(
				(acc, peripheral) => {
					Object.values(peripheral.signals).forEach(signal => {
						if (!acc[peripheral.name]) {
							acc[peripheral.name] = {
								name: peripheral.name,
								description: '',
								signals: {}
							};
						}

						acc[peripheral.name].signals[signal.name] = {
							...signal,
							currentTarget:
								peripheralSignalsTargets[peripheral.name]
									.signalsTargets[signal.name]
						};
					});

					return acc;
				},
				{}
			);

		const peripheral = Object.values(unifiedPeripherals).find(
			peripheral => peripheral.name === 'MISC'
		);

		if (peripheral) {
			cy.mount(
				<Peripheral
					isOpen
					isLastPeripheralGroup
					hasPinConflict={false}
					title={peripheral.name}
					signals={Object.values(peripheral.signals)}
				/>,
				reduxStore
			);

			cy.dataTest('MISC-SWDCLK').within(() => {
				cy.dataTest('MISC-SWDCLK-span').should(
					'have.attr',
					'data-checked',
					'false'
				);
			});

			cy.dataTest('MISC-SWDIO').within(() => {
				cy.get('label').click();
			});

			cy.dataTest('MISC-SWDCLK').within(() => {
				cy.get('svg').should('exist');
				cy.dataTest('MISC-SWDCLK-span').should(
					'have.attr',
					'data-checked',
					'true'
				);
			});
		}
	});
});
