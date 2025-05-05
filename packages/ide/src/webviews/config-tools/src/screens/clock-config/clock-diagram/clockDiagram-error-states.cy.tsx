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

const soc = await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default as unknown as Soc);

const configDict = {
	BoardName: '',
	Package: 'WLP',
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

// @TODO: This test is similar to the one in ClockDiagram.cy.tsx. Consider covering another error case.
describe('Clock Diagram error states', () => {
	beforeEach(() => {
		cy.clearLocalStorage().then(() => {
			localStorage.setItem(
				'ClockNodes',
				JSON.stringify(soc.ClockNodes)
			);

			localStorage.setItem(
				'Package',
				JSON.stringify(soc.Packages[0])
			);

			localStorage.setItem(
				'Registers',
				JSON.stringify(soc.Registers)
			);

			localStorage.setItem('Cores', JSON.stringify(soc.Cores));

			localStorage.setItem('configDict', JSON.stringify(configDict));

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
				undefined,
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
					cy.get(
						'#\\32 22bd4f0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node_highlight.error'
					)
						.should('exist')
						.then(() => {
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
