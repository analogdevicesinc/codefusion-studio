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
import {
	setClockNodeDetailsTargetNode,
	setDiagramData
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {configurePreloadedStore} from '../../../state/store';
import ClockConfigSideContainer from './Side';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import type {CfsConfig} from 'cfs-plugins-api';

const mock = (await import(`@socs/max32690-wlp.json`))
	.default as unknown as Soc;

const configDict = {
	BoardName: '',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
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
} as unknown as CfsConfig;

describe('Clock config side component', () => {
	const reduxStore = configurePreloadedStore(mock, configDict);

	beforeEach(() => {
		cy.clearLocalStorage().then(() => {
			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					window.localStorage.setItem(
						'pluginControls:CM4-proj',
						JSON.stringify(controls)
					);
				}
			);
		});
	});

	it('Opens a clock node type correctly', () => {
		cy.mount(<ClockConfigSideContainer />, reduxStore);

		cy.dataTest('LPM Mux').should('not.exist');

		cy.dataTest('accordion:MUX').click();

		cy.dataTest('LPM Mux').should('exist');
	});

	it('Opens and closes clock node details view correctly', async () => {
		const store = {...reduxStore};

		store.dispatch(setClockNodeDetailsTargetNode('32KIN'));

		cy.mount(<ClockConfigSideContainer />, store);

		cy.dataTest('side-32KIN').should('exist');

		cy.dataTest('Mux')
			.should('not.exist')
			.then(() => {
				cy.wrap(
					store.dispatch(setClockNodeDetailsTargetNode(undefined))
				).then(() => {
					cy.dataTest('Mux').should('exist');
				});
			});
	});

	it('Adds an input error and checks title correctly renders conflict icon', async () => {
		const store = {...reduxStore};

		store.dispatch(setClockNodeDetailsTargetNode('P0.23'));

		cy.mount(<ClockConfigSideContainer />, store);

		cy.dataTest('FREQ-P0.23-control-input')
			.shadow()
			.within(() => {
				cy.get('#control').type('test');
			})
			.then(() => {
				cy.wrap(
					store.dispatch(setClockNodeDetailsTargetNode(undefined))
				).then(() => {
					cy.dataTest('side-P0.23').should('exist');
				});
			});
	});

	it('Displays an error icon when a node has an unconfigured value and is enabled', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
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
				setDiagramData({
					'P0.23': {
						enabled: true,
						error: true
					}
				})
			);

			cy.mount(<ClockConfigSideContainer />, store);

			cy.dataTest('accordion:conflict:Pin Input').should('exist');

			cy.dataTest('accordion:PIN INPUT').should('exist');

			cy.dataTest('accordion:PIN INPUT').click();

			cy.wait(500);

			cy.dataTest('accordion-item:conflict:P0.23').should('exist');
		});
	});

	it('Does not display an error icon when a node has an unconfigured value and is disabled', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
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
				setDiagramData({
					'P0.23': {
						enabled: false,
						error: true
					}
				})
			);

			cy.mount(<ClockConfigSideContainer />, store);

			cy.dataTest('accordion:conflict:PIN INPUT').should('not.exist');

			cy.dataTest('accordion:PIN INPUT').should('exist');

			cy.dataTest('accordion:PIN INPUT').click();

			cy.wait(500);

			cy.dataTest('accordion-item:conflict:P0.23').should(
				'not.exist'
			);
		});
	});

	it('Does not display an error icon for disabled control values', async () => {
		const store = {...reduxStore};

		store.dispatch(
			setAppliedSignal({
				Pin: 'G5',
				Peripheral: 'OSC',
				Name: 'ERFO_CLK_OUT',
				PinCfg: {PWR: 'VDDIO'}
			})
		);

		cy.mount(<ClockConfigSideContainer />, store);

		cy.dataTest('accordion:OSCILLATOR')
			.should('exist')
			.then(() => {
				cy.dataTest('accordion:conflict:Divider').should('not.exist');
			});
	});
});
