/* eslint-disable max-nested-callbacks */
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
/* eslint-disable @typescript-eslint/no-empty-function */
import type {Soc} from '@common/types/soc';
import ClockDiagram from './ClockDiagram';
import {configurePreloadedStore} from '../../../state/store';
import {setClockNodeControlValue} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

const soc = (await import('@socs/max32690-wlp.json'))
	.default as unknown as Soc;

import type {CfsConfig} from 'cfs-plugins-api';
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

// @TODO: This test is similar to the one in ClockDiagram.cy.tsx. Consider covering another error case.
describe('Clock Diagram error states', () => {
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

	it('Should render error states in the diagram', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const reduxStore = configurePreloadedStore(
				soc,
				configDict,
				controls
			);

			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'F4',
					Peripheral: 'I2S0',
					Name: 'CLKEXT'
				})
			);

			cy.mount(
				<div style={{width: '100%', height: '400px'}}>
					<ClockDiagram
						canvas={soc.Packages[0].ClockCanvas}
						handleNodeHover={() => {}}
						handleClockHover={() => {}}
					/>
				</div>,
				reduxStore
			).then(() => {
				cy.wait(1000);

				// We also need to check grouped peripherals.
				reduxStore.dispatch(
					setClockNodeControlValue({
						name: 'UART0/1/2',
						key: 'UART2_ENABLE',
						value: 'TRUE',
						error: undefined
					})
				);

				const setError = reduxStore.dispatch(
					setClockNodeControlValue({
						name: 'P0.23',
						key: 'P0_23_FREQ',
						value: '2000000000',
						error: 'INVALID_MAX_VAL'
					})
				);

				reduxStore.dispatch(
					setClockNodeControlValue({
						name: 'SYS_OSC Mux',
						key: 'MUX',
						value: 'CLKEXT',
						error: undefined
					})
				);

				cy.log(JSON.stringify(setError.payload));

				cy.wait(1000).then(() => {
					// UART0/1/2 block has ERROR
					cy.get(
						'#\\34 28eb510-1761-11ef-a073-695fa460553d > .adi_diagram_content_node_highlight.error'
					).should('exist');

					// P0.23 block has ERROR
					cy.get(
						'#\\32 22bd4f0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node_highlight.error'
					)
						.should('exist')
						.then(() => {
							reduxStore.dispatch(
								setClockNodeControlValue({
									name: 'UART0/1/2',
									key: 'UART2_MUX',
									value: 'IBRO',
									error: undefined
								})
							);

							const revert = reduxStore.dispatch(
								setClockNodeControlValue({
									name: 'P0.23',
									key: 'P0_23_FREQ',
									value: '100',
									error: undefined
								})
							);

							cy.log(JSON.stringify(revert.payload));

							cy.wait(1000).then(() => {
								// UART0/1/2 block no ERROR
								cy.get(
									'#\\34 28eb510-1761-11ef-a073-695fa460553d > .adi_diagram_content_node_highlight.error'
								).should('not.exist');

								// P0.23 block  no ERROR
								cy.get(
									'#\\32 22bd4f0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node_highlight.error'
								).should('not.exist');
							});
						});
				});
			});
		});
	});
});
