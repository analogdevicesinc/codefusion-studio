/* eslint-disable @typescript-eslint/no-unsafe-argument */
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

import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import RegisterBody from './RegisterBody';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import {setClockNodeControlValue} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {
	setPeripheralAssignment,
	setPeripheralConfig
} from '../../../state/slices/peripherals/peripherals.reducer';
import ClockDiagram from '../../clock-config/clock-diagram/ClockDiagram';

const mock = (await import(
	`@socs/max32690-tqfn.json`
)) as unknown as Soc;
const clockConfigMock = (await import(
	`@socs/max32690-wlp.json`
)) as unknown as Soc;

describe('Register body component', () => {
	it('Assigning WDT before LPWDT should give the same result', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const reduxStore = configurePreloadedStore(
				mock,
				undefined,
				controls
			);

			// Setup WDT0
			reduxStore.dispatch(
				setClockNodeControlValue({
					key: 'ENABLE',
					name: 'WDT0',
					value: 'TRUE'
				})
			);

			reduxStore.dispatch(
				setPeripheralAssignment({
					peripheral: 'WDT0',
					projectId: 'RV',
					config: {
						EVENTS: 'ONLY_LATE',
						WDT_INT_EN: 'FALSE',
						WDT_RST_EN: 'FALSE'
					}
				})
			);

			reduxStore.dispatch(
				setPeripheralConfig({
					config: {
						EVENTS: 'ONLY_LATE',
						INT_LATE_VAL: '2POW31',
						RST_LATE_VAL: '2POW31',
						WDT_INT_EN: 'TRUE',
						WDT_RST_EN: 'TRUE'
					},
					peripheralId: 'WDT0'
				})
			);

			// Setup LPWDT0
			reduxStore.dispatch(
				setClockNodeControlValue({
					key: 'ENABLE',
					name: 'LPWDT0',
					value: 'TRUE'
				})
			);

			reduxStore.dispatch(
				setPeripheralAssignment({
					peripheral: 'LPWDT0',
					projectId: 'RV',
					config: {
						EVENTS: 'ONLY_LATE',
						WDT_INT_EN: 'FALSE',
						WDT_RST_EN: 'FALSE'
					}
				})
			);

			reduxStore.dispatch(
				setPeripheralConfig({
					config: {
						EVENTS: 'EARLY_AND_LATE',
						INT_EARLY_VAL: '2POW18',
						INT_LATE_VAL: '2POW28',
						RST_EARLY_VAL: '2POW20',
						RST_LATE_VAL: '2POW27',
						WDT_INT_EN: 'TRUE',
						WDT_RST_EN: 'TRUE'
					},
					peripheralId: 'LPWDT0'
				})
			);

			cy.mount(<RegisterBody />, reduxStore);

			// Verify the 'Modified' chip is enabled and contains the correct count
			cy.get('[data-test="Modified"]')
				.should('not.be.disabled')
				.and('contain.text', '4');
		});
	});

	it('Assigning LPWDT before WDT should give the same result', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const reduxStore = configurePreloadedStore(
				mock,
				undefined,
				controls
			);

			// Setup LPWDT0
			reduxStore.dispatch(
				setClockNodeControlValue({
					key: 'ENABLE',
					name: 'LPWDT0',
					value: 'TRUE'
				})
			);

			reduxStore.dispatch(
				setPeripheralAssignment({
					peripheral: 'LPWDT0',
					projectId: 'RV',
					config: {
						EVENTS: 'ONLY_LATE',
						WDT_INT_EN: 'FALSE',
						WDT_RST_EN: 'FALSE'
					}
				})
			);

			reduxStore.dispatch(
				setPeripheralConfig({
					config: {
						EVENTS: 'EARLY_AND_LATE',
						INT_EARLY_VAL: '2POW18',
						INT_LATE_VAL: '2POW28',
						RST_EARLY_VAL: '2POW20',
						RST_LATE_VAL: '2POW27',
						WDT_INT_EN: 'TRUE',
						WDT_RST_EN: 'TRUE'
					},
					peripheralId: 'LPWDT0'
				})
			);

			// Setup WDT0
			reduxStore.dispatch(
				setClockNodeControlValue({
					key: 'ENABLE',
					name: 'WDT0',
					value: 'TRUE'
				})
			);

			reduxStore.dispatch(
				setPeripheralAssignment({
					peripheral: 'WDT0',
					projectId: 'RV',
					config: {
						EVENTS: 'ONLY_LATE',
						WDT_INT_EN: 'FALSE',
						WDT_RST_EN: 'FALSE'
					}
				})
			);

			reduxStore.dispatch(
				setPeripheralConfig({
					config: {
						EVENTS: 'ONLY_LATE',
						INT_LATE_VAL: '2POW31',
						RST_LATE_VAL: '2POW31',
						WDT_INT_EN: 'TRUE',
						WDT_RST_EN: 'TRUE'
					},
					peripheralId: 'WDT0'
				})
			);

			cy.mount(<RegisterBody />, reduxStore);

			cy.get('[data-test="Modified"]')
				.should('not.be.disabled')
				.and('contain.text', '4');
		});
	});

	it('Ignores modified grouped peripheral if disabled', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const reduxStore = configurePreloadedStore(
				mock,
				undefined,
				controls
			);

			// Setup UART2
			reduxStore.dispatch(
				setClockNodeControlValue({
					key: 'UART2_ENABLE',
					name: 'TMR0/1/2/3',
					value: 'FALSE'
				})
			);

			reduxStore.dispatch(
				setClockNodeControlValue({
					key: 'UART2_MUX',
					name: 'UART0/2',
					value: 'ERFO'
				})
			);

			cy.mount(<RegisterBody />, reduxStore);

			// Verify the 'Modified' chip is disabled
			cy.get('[data-test="Modified"]').should('be.disabled');
		});
	});

	it('should render the register details header when a register is selected', () => {
		const reduxStore = configurePreloadedStore(mock);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row').not(':first').first().click();
		});

		cy.dataTest('register-details-header').should('be.visible');
	});

	it('should navigate back registers table when the user clicks the back button', () => {
		const reduxStore = configurePreloadedStore(mock);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row').not(':first').first().click();
		});

		cy.dataTest('register-details-header').should('be.visible');

		cy.dataTest('chevron-left-icon').click();

		cy.dataTest('register-table-grid').should('be.visible');
	});

	it('should succesfully filter on the register details table', () => {
		const reduxStore = configurePreloadedStore(mock);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row').not(':first').first().click();
		});

		// Verify the 'Unmodified' chip is enabled and contains the correct count
		cy.get('[data-test="Unmodified"]')
			.should('not.be.disabled')
			.and('contain.text', 'Unmodified8');

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('RESERVED');

		cy.dataTest('register-details-grid').within(() => {
			cy.get('vscode-data-grid-row')
				.not(':first')
				.each($row => {
					cy.wrap($row).should('contain.text', 'RESERVED');
				});
		});

		// Verify the 'Unmodified' chip is enabled and contains the correct count
		cy.get('[data-test="Unmodified"]')
			.should('not.be.disabled')
			.and('contain.text', 'Unmodified4');

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('NOTHING');

		// Verify that both chips are disabled
		cy.get('[data-test="Unmodified"]')
			.should('be.disabled')
			.and('contain.text', 'Unmodified');

		cy.get('[data-test="Modified"]')
			.should('be.disabled')
			.and('contain.text', 'Modified');
	});

	it('Filters registers by search input', () => {
		const reduxStore = configurePreloadedStore(mock);

		cy.mount(<RegisterBody />, reduxStore);

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('GPIO');

		cy.dataTest('register-table-grid').within(() => {
			cy.get('vscode-data-grid-row')
				.not(':first')
				.each($row => {
					cy.wrap($row).should('contain.text', 'GPIO');
				});
		});
	});

	it('Displays "No results found" when search yields no results', () => {
		const reduxStore = configurePreloadedStore(mock);

		cy.mount(<RegisterBody />, reduxStore);

		// Type 'randomRegister' into the search input
		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('randomRegister');

		// Verify that the "No results found" message is displayed
		cy.contains('div', 'No results found')
			.should('be.visible')
			.and('have.css', 'text-align', 'center');

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.clear();
	});

	it('Verifies the initial state of Modified and Unmodified chips with no pin assignments, reflecting the reset value of the MCU.', () => {
		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				const reduxStore = configurePreloadedStore(
					mock,
					undefined,
					controls
				);

				cy.mount(<RegisterBody />, reduxStore);

				// Verify the 'Modified' chip is disabled
				cy.get('[data-test="Modified"]').should('be.disabled');

				// Verify the 'Unmodified' chip is enabled and contains the correct count
				cy.get('[data-test="Unmodified"]')
					.should('not.be.disabled')
					.and('contain.text', mock.Registers.length.toString());
			}
		);
	});

	it('Filters registers by modified/unmodified state', () => {
		const reduxStore = configurePreloadedStore(mock);

		// Apply a signal
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '41',
				Peripheral: 'LPTMR0',
				Name: 'IOA'
			})
		);

		cy.mount(<RegisterBody />, reduxStore).then(() => {
			// Verify the 'Modified' chip is enabled and contains the correct count
			cy.get('[data-test="Modified"]')
				.should('not.be.disabled')
				.and('contain.text', '3');

			// Verify the 'Unmodified' chip is enabled and contains the correct count
			cy.get('[data-test="Unmodified"]')
				.should('not.be.disabled')
				.and('contain.text', (mock.Registers.length - 3).toString());

			// Click on 'Modified' chip
			cy.get('[data-test="Modified"]').click();

			// Verify that there are results
			cy.dataTest('register-table-grid').within(() => {
				cy.get('vscode-data-grid-row')
					.not(':first')
					// eslint-disable-next-line max-nested-callbacks
					.each($row => {
						cy.wrap($row).should('exist').and('not.be.empty');
					});
			});
		});
	});

	it('Checks values after dispatch for clock config', () => {
		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				const reduxStore = configurePreloadedStore(
					clockConfigMock,
					undefined,
					controls
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
						value: '23',
						error: undefined
					})
				);

				cy.mount(<RegisterBody />, reduxStore);

				cy.dataTest('Modified').click();

				cy.dataTest('GCR_CLKCTRL-data-grid-row').within(() => {
					cy.dataTest('GCR_CLKCTRL-name-grid-cell').click();
				});

				cy.dataTest('bit-group').should('be.visible');

				cy.get('[data-test="Modified"]').should('contain.text', '2');

				cy.dataTest('Modified').click();

				cy.dataTest('register-details-grid')
					.should('be.visible')
					.and('include.text', 'SYSCLK_SEL');
			}
		);
	});

	it('Checks values for intialization of oscillators', () => {
		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				const reduxStore = configurePreloadedStore(
					clockConfigMock,
					undefined,
					controls
				);

				reduxStore.dispatch(
					setClockNodeControlValue({
						name: 'SYS_OSC Mux',
						key: 'MUX',
						value: 'ERFO'
					})
				);

				// Switch first to clock canvas to make sure the clock dictionary is computed
				/* eslint-disable @typescript-eslint/no-empty-function */
				cy.mount(
					<div style={{width: '100%', height: '400px'}}>
						<ClockDiagram
							canvas={mock.Packages[0].ClockCanvas}
							handleNodeHover={() => {}}
							handleClockHover={() => {}}
						/>
					</div>,
					reduxStore
				);
				// Ensure it loads
				cy.wait(3000);
				// Switch to register view
				cy.mount(<RegisterBody />, reduxStore);

				cy.dataTest('Modified').click();

				cy.dataTest('GCR_CLKCTRL-data-grid-row').within(() => {
					cy.dataTest('GCR_CLKCTRL-name-grid-cell').click();
				});

				cy.dataTest('bit-group').should('be.visible');

				cy.get('[data-test="Modified"]').should('contain.text', '4');

				cy.dataTest('Modified').click();

				cy.dataTest('register-details-grid')
					.should('be.visible')
					.and('include.text', 'ERFO_EN');
			}
		);
	});

	it('Updates on Modified chip counts after applying signal and search input', () => {
		const reduxStore = configurePreloadedStore(mock);
		reduxStore.dispatch(
			setAppliedSignal({
				Pin: '41',
				Peripheral: 'LPTMR0',
				Name: 'IOA'
			})
		);

		cy.mount(<RegisterBody />, reduxStore);

		cy.get('[data-test="Modified"]').click();

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.type('EN0');

		cy.get('[data-test="Modified"]').should('contain.text', '1');

		cy.dataTest('search-control-input')
			.shadow()
			.find('input')
			.clear();

		cy.get('[data-test="Modified"]').should('contain.text', '3');

		cy.get('[data-test="Unmodified"]').should(
			'contain.text',
			(mock.Registers.length - 3).toString()
		);
	});
});
