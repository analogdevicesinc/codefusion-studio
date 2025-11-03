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
/* eslint-disable max-nested-callbacks */
import type {ControlCfg, Soc} from '@common/types/soc';
import {
	setClockNodeDetailsTargetNode,
	setClockNodeControlValue
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {configurePreloadedStore} from '../../../state/store';
import ClockDetails from './ClockDetails';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import type {CfsConfig} from 'cfs-plugins-api';

const mock = (await import(`@socs/max32690-wlp.json`))
	.default as unknown as Soc;

// Helper function to convert Cypress fixture to a standard Promise
async function getControlsPromise(): Promise<
	Record<string, ControlCfg[]>
> {
	return new Promise(resolve => {
		cy.fixture('clock-config-plugin-controls-msdk.json').then(
			data => {
				resolve(data as Record<string, ControlCfg[]>);
			}
		);
	});
}

const configDict = {
	BoardName: '',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
		{
			Description: 'ARM Cortex-M4',
			ExternallyManaged: false,
			FirmwarePlatform: 'msdk',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		}
	]
} as unknown as CfsConfig;

describe('Clock details component', () => {
	beforeEach(() => {
		getControlsPromise()
			.then(controls => {
				window.localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			})
			.catch(() => null);
	});

	it('Adds a non-valid integer value and checks for errors', () => {
		getControlsPromise()
			.then(controls => {
				const store = configurePreloadedStore(
					mock,
					configDict,
					controls
				);

				store.dispatch(
					setAppliedSignal({
						Pin: 'F4',
						Peripheral: 'MISC',
						Name: 'CLKEXT'
					})
				);

				store.dispatch(
					setClockNodeControlValue({
						name: 'SYS_OSC Mux',
						key: 'MUX',
						value: 'External Clock on P0.23',
						error: undefined
					})
				);

				store.dispatch(setClockNodeDetailsTargetNode('P0.23'));

				cy.mount(
					<ClockDetails
						controlsPromise={Promise.resolve(controls)}
					/>,
					store
				);

				cy.dataTest('P0_23_FREQ-P0.23-control-input')
					.shadow()
					.within(() => {
						cy.get('#control').type('test');
					});

				cy.dataTest('P0_23_FREQ-P0.23-error').should(
					'contain.text',
					'Invalid input type'
				);

				cy.dataTest('P0_23_FREQ-P0.23-control-input')
					.shadow()
					.within(() => {
						cy.get('#control').clear();
						cy.wait(1000);
					});

				cy.dataTest('P0_23_FREQ-P0.23-control-input')
					.shadow()
					.within(() => {
						cy.get('#control').type('800000001');
					});

				cy.dataTest('P0_23_FREQ-P0.23-error').should(
					'contain',
					'Value exceeds the range 1 to 80000000'
				);

				cy.dataTest('P0_23_FREQ-P0.23-control-input')
					.shadow()
					.within(() => {
						cy.get('#control').clear();
						cy.wait(1000);
					});

				cy.dataTest('P0_23_FREQ-P0.23-control-input')
					.shadow()
					.within(() => {
						cy.get('#control').type('1');
					});

				cy.dataTest('P0_23_FREQ-P0.23-error').should('not.exist');

				cy.dataTest('P0_23_FREQ-P0.23-control-input')
					.shadow()
					.within(() => {
						cy.get('#control').clear();
						cy.wait(1000);
					});
			})
			.catch(() => null);
	});

	it('Checks that controls are disabled when clock conditions are not met', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const store = configurePreloadedStore(
				mock,
				configDict,
				controls as Record<string, ControlCfg[]>
			);
			const controlsPromise = getControlsPromise();

			store.dispatch(setClockNodeDetailsTargetNode('TMR0/1/2/3'));

			cy.mount(
				<ClockDetails controlsPromise={controlsPromise} />,
				store
			);

			cy.dataTest('TMR0a_MUX-TMR0/1/2/3').should(
				'have.attr',
				'aria-disabled',
				'true'
			);

			cy.dataTest('TMR0_ENABLE-TMR0/1/2/3').within(() => {
				cy.get('span').click();
			});

			cy.dataTest('TMR0a_MUX-TMR0/1/2/3').should(
				'have.attr',
				'aria-disabled',
				'false'
			);
		});
	});

	it('Checks that controls are disabled when pinmux conditions are not met', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const store = configurePreloadedStore(
				mock,
				configDict,
				controls as Record<string, ControlCfg[]>
			);
			const controlsPromise = getControlsPromise();

			store.dispatch(setClockNodeDetailsTargetNode('P0.27'));

			cy.mount(
				<ClockDetails controlsPromise={controlsPromise} />,
				store
			);

			cy.dataTest('P0_27_FREQ-P0.27-control-input').should(
				'have.attr',
				'disabled'
			);
		});
	});

	it('Checks that input controls are persisted', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			// Renamed to avoid conflict
			const store = configurePreloadedStore(
				mock,
				configDict,
				controls as Record<string, ControlCfg[]>
			);
			const controlsPromise = getControlsPromise();

			store.dispatch(
				setAppliedSignal({
					Pin: 'F4',
					Peripheral: 'MISC',
					Name: 'CLKEXT'
				})
			);

			store.dispatch(
				setClockNodeControlValue({
					name: 'SYS_OSC Mux',
					key: 'MUX',
					value: 'External Clock on P0.23',
					error: undefined
				})
			);

			store.dispatch(setClockNodeDetailsTargetNode('P0.23'));

			cy.mount(
				<ClockDetails controlsPromise={controlsPromise} />,
				store
			).then(() => {
				cy.dataTest('P0_23_FREQ-P0.23-control-input')
					.shadow()
					.within(() => {
						cy.get('#control').type('22');
						cy.wait(1000);
					})
					.then(() => {
						cy.wrap(
							store.dispatch(setClockNodeDetailsTargetNode(undefined))
						).then(() => {
							cy.wrap(
								store.dispatch(setClockNodeDetailsTargetNode('P0.23'))
							).then(() => {
								cy.dataTest('P0_23_FREQ-P0.23-control-input').should(
									'have.attr',
									'current-value',
									'22'
								);
							});
						});
					});
			});
		});
	});
});
