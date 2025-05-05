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
import {configureStore} from '@reduxjs/toolkit';
import {rootReducer} from '../../../state/store';
import PeripheralBlock from './PeripheralBlock';
import type {
	FormattedPeripheral,
	FormattedPeripheralSignal
} from '@common/types/soc';

const reduxStore = configureStore({reducer: rootReducer});

const mockedConfigDict = {
	BoardName: 'AD-APARD32690-SL',
	Package: 'WLP',
	Soc: 'MAX32690',
	projects: [
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
};

beforeEach(() => {
	window.localStorage.setItem(
		'configDict',
		JSON.stringify(mockedConfigDict)
	);
});

describe('Peripheral block container', () => {
	it('should display individual signals and omit group title, if SignalGroup is undefined', () => {
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
			}
		};

		cy.mount(<PeripheralBlock {...mock} />, reduxStore);

		// Open the accordion by simulating a click on the header
		cy.dataTest(`accordion:${mock.name}`).should('exist').click();

		cy.dataTest(`peripheral-signal-${mock.signalGroup}`).should(
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

	it('should group signals and show group title, if SignalGroup is defined', () => {
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
			signalGroup: 'SIGNAL GROUP'
		};

		cy.mount(<PeripheralBlock {...mock} />, reduxStore);

		// Open the accordion by simulating a click on the header
		cy.dataTest(`accordion:${mock.signalGroup}`)
			.should('exist')
			.click();

		cy.dataTest(`peripheral-signal-${mock.signalGroup}`)
			.should('exist')
			.should('have.text', mock.signalGroup);

		cy.dataTest(
			`peripheral-signal-${mock.signalGroup}-chevron`
		).should('exist');

		Object.entries(mock.signals).forEach(([_, signal]) => {
			cy.dataTest(`peripheral-signal-${signal.name}`)
				.should('exist')
				.should('have.text', signal.name)
				.invoke('attr', 'class')
				.should('include', '_groupedSignal_');

			cy.dataTest(`peripheral-signal-${signal.name}-chevron`).should(
				'not.exist'
			);
		});
	});

	it('should show group title if SignalGroup is defined and no signals', () => {
		const mock: FormattedPeripheral<FormattedPeripheralSignal> = {
			name: 'PERIPHERAL NAME',
			description: '',
			signals: {},
			signalGroup: 'SIGNAL GROUP'
		};

		cy.mount(<PeripheralBlock {...mock} />, reduxStore);

		// Open the accordion by simulating a click on the header
		cy.dataTest(`accordion:${mock.signalGroup}`)
			.should('exist')
			.click();

		cy.dataTest(`peripheral-signal-${mock.signalGroup}`)
			.should('exist')
			.should('have.text', mock.signalGroup);

		cy.dataTest(
			`peripheral-signal-${mock.signalGroup}-chevron`
		).should('exist');

		cy.get('[data-test="peripheral-signal-"]').should('not.exist');
	});

	it('should select core', () => {
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
			signalGroup: 'SIGNAL GROUP',
			cores: ['CM4', 'RV']
		};

		cy.mount(<PeripheralBlock {...mock} />, reduxStore);

		// Open the accordion by simulating a click on the header
		cy.dataTest(`accordion:${mock.signalGroup}`)
			.should('exist')
			.click();

		cy.dataTest(`peripheral-signal-${mock.signalGroup}`)
			.should('exist')
			.click();

		if (!mock.cores) return;

		Object.entries(mock.cores).forEach(([_, coreId]) => {
			cy.dataTest(`core-${coreId}-proj-container`).should('exist');
		});

		cy.dataTest(`core-${mock.cores[0]}-proj-container`).click();

		Object.entries(mock.cores).forEach(([_, coreId]) => {
			cy.dataTest(`core-${coreId}-proj-container`).should(
				'not.exist'
			);
		});
	});

	it('should cancel core allocation', () => {
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
			signalGroup: 'SIGNAL GROUP',
			cores: ['CM4', 'RV']
		};

		cy.mount(
			<PeripheralBlock {...mock} security='Non-Secure' />,
			reduxStore
		);

		// Open the accordion by simulating a click on the header
		cy.dataTest(`accordion:${mock.signalGroup}`)
			.should('exist')
			.click();

		cy.dataTest(`peripheral-signal-${mock.signalGroup}`)
			.should('exist')
			.click();

		if (!mock.cores) return;

		Object.entries(mock.cores).forEach(([_, coreId]) => {
			cy.dataTest(`core-${coreId}-proj-container`).should('exist');
		});

		cy.dataTest(`core-selector-cancel-btn`).click();

		Object.entries(mock.cores).forEach(([_, coreId]) => {
			cy.dataTest(`core-${coreId}-proj`).should('not.exist');
		});

		cy.dataTest(
			`peripheral-signal-${mock.signalGroup}-checkmark`
		).should('not.exist');
	});
});
