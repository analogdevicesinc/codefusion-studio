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

// @TODO: This test is similar to the one in ClockDiagram.cy.tsx. Consider covering another error case.
describe('Clock Diagram error states', () => {
	it('Should render error states in the diagram', () => {
		const reduxStore = configurePreloadedStore(soc);

		const {registers} =
			reduxStore.getState().appContextReducer.registersScreen;

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F4',
				Peripheral: 'MISC',
				Name: 'CLKEXT',
				registers
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
					type: 'Pin Input',
					name: 'P0.23',
					key: 'P0_23_FREQ',
					value: '200000000',
					error: 'INVALID_MAX_VAL'
				})
			);

			reduxStore.dispatch(
				setClockNodeControlValue({
					type: 'Mux',
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
								type: 'Pin Input',
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
