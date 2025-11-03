/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import PeripheralBlock from './PeripheralBlock';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal,
	Soc
} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import type {CfsConfig} from 'cfs-plugins-api';

const soc = (await import('@socs/max32690-wlp.json'))
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
			IsPrimary: true,
			Name: 'ARM Cortex-M4',
			PluginId: '',
			Secure: false,
			ProjectId: 'CM4-proj',
			CoreId: 'CM4'
		},
		{
			CoreNum: 0,
			Description: 'Risc-V (RV32)',
			ExternallyManaged: false,
			FirmwarePlatform: '',
			IsPrimary: true,
			Name: 'RISC-V (RV32)',
			PluginId: '',
			Secure: false,
			ProjectId: 'RV-proj',
			CoreId: 'RV'
		}
	]
} as unknown as CfsConfig;

describe('Peripheral block container', () => {
	it('should display individual signals and omit group title, if Assignable is FALSE', () => {
		const reduxStore = configurePreloadedStore(soc, mockedConfigDict);
		const mock: FormattedPeripheral<FormattedPeripheralSignal> = {
			name: 'PERIPHERAL NAME',
			description: '',
			assignable: false,
			signals: {
				SIGNAL_1: {
					name: 'SIGNAL 1',
					description: '',
					pins: []
				},
				SIGNAL_2: {
					name: 'SIGNAL 2',
					description: '',
					pins: []
				},
				SIGNAL_3: {
					name: 'SIGNAL 3',
					description: '',
					pins: []
				},
				SIGNAL_4: {
					name: 'SIGNAL 4',
					description: '',
					pins: []
				}
			}
		};

		cy.mount(<PeripheralBlock {...mock} />, reduxStore);

		// Open the accordion by simulating a click on the header
		cy.dataTest(`accordion:${mock.name}`).should('exist').click();

		cy.dataTest(`peripheral-signal-${mock.group}`).should(
			'not.exist'
		);

		Object.entries(mock.signals).forEach(([_, signal]) => {
			cy.dataTest(`peripheral-signal-${signal.name}`)
				.should('exist')
				.should('have.text', signal.name)
				.invoke('attr', 'class')
				.should('include', '_signal_');

			cy.dataTest(`peripheral-signal-${signal.name}-chevron`).should(
				'exist'
			);
		});
	});

	it('should not show accordion when peripheral has signals and assignable is TRUE', () => {
		const reduxStore = configurePreloadedStore(soc, mockedConfigDict);
		const mock: FormattedPeripheral<FormattedPeripheralSignal> = {
			name: 'PERIPHERAL NAME',
			description: '',
			signals: {
				SIGNAL_1: {
					name: 'SIGNAL 1',
					description: '',
					pins: []
				},
				SIGNAL_2: {
					name: 'SIGNAL 2',
					description: '',
					pins: []
				},
				SIGNAL_3: {
					name: 'SIGNAL 3',
					description: '',
					pins: []
				},
				SIGNAL_4: {
					name: 'SIGNAL 4',
					description: '',
					pins: []
				}
			},
			assignable: true
		};

		cy.mount(<PeripheralBlock {...mock} />, reduxStore);

		cy.dataTest(`peripheral-block-${mock.name}`)
			.should('exist')
			.click();

		cy.dataTest(`peripheral-signal-${mock.name}`).should('not.exist');

		cy.dataTest(`allocate-${mock.name}-button`).should('exist');
	});

	it('should not show accordion when peripheral has no signal and assignable is TRUE', () => {
		const reduxStore = configurePreloadedStore(soc, mockedConfigDict);
		const mock: FormattedPeripheral<FormattedPeripheralSignal> = {
			name: 'PERIPHERAL NAME',
			description: '',
			signals: {},
			assignable: true
		};

		cy.mount(<PeripheralBlock {...mock} />, reduxStore);

		cy.dataTest(`peripheral-block-${mock.name}`)
			.should('exist')
			.click();

		cy.dataTest(`allocate-${mock.name}-button`).should('exist');
	});
});
