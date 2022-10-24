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
/* eslint-disable @typescript-eslint/no-empty-function */
import type {Soc} from '@common/types/soc';
import ClockDiagram from './ClockDiagram';
import {configurePreloadedStore} from '../../../state/store';
import {setClockNodeControlValue} from '../../../state/slices/clock-nodes/clockNodes.reducer';

const soc = await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default as unknown as Soc);

describe('Clock Diagram disabled states', () => {
	it('Should enable and disable nodes and clocks in the diagram', () => {
		const reduxStore = configurePreloadedStore(soc);

		const targetClocks = [
			'4e8bca4b-1763-11ef-a073-695fa460553d',
			'0385d850-1c41-11ef-8079-f382b26e79a7',
			'0385d850-1c41-11ef-8079-f382b26e79a7',
			'12bb4710-1c41-11ef-8079-f382b26e79a7',
			'14aae210-1c41-11ef-8079-f382b26e79a7',
			'26e7c470-1c41-11ef-8079-f382b26e79a7',
			'99485470-3fa6-11ef-81bd-539cdfd3aa72',
			'496384e6-3fa4-11ef-b175-05083d74e1b4',
			'a50e8d16-3fa6-11ef-81bd-539cdfd3aa72',
			'a50e3ef2-3fa6-11ef-81bd-539cdfd3aa72'
		];

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

			cy.get(
				'g#21f6be60-1761-11ef-a073-695fa460553d > rect.adi_diagram_content_node_highlight.disabled'
			).should('exist');

			const junctions = cy.get('circle.schematic_dot');

			junctions.should('have.length', 48);

			cy.wrap(
				targetClocks.map(clock => {
					const line = cy.get(`g#${clock} > g > path`);

					return line;
				})
			)
				.then($ => {
					$.forEach(line =>
						line.should('have.class', 'segment-highlight-disabled')
					);
				})
				.then(() => {
					const enableClock = reduxStore.dispatch(
						setClockNodeControlValue({
							type: 'Peripheral',
							name: 'TMR0/1/2/3',
							key: 'TMR0_ENABLE',
							value: 'TRUE'
						})
					);

					cy.log(JSON.stringify(enableClock.payload));

					cy.wait(1000);

					cy.wrap(
						targetClocks.map(clock => cy.get(`g#${clock} > g > path`))
					)
						.then($ => {
							$.forEach(line =>
								line.should(
									'not.have.class',
									'segment-highlight-disabled'
								)
							);
						})
						.then(() => {
							const disableClock = reduxStore.dispatch(
								setClockNodeControlValue({
									type: 'Peripheral',
									name: 'TMR0/1/2/3',
									key: 'TMR0_ENABLE',
									value: 'FALSE'
								})
							);

							cy.log(JSON.stringify(disableClock.payload));

							cy.wait(1000);

							cy.wrap(
								targetClocks.map(clock =>
									cy.get(`g#${clock} > g > path`)
								)
							)
								.then($ => {
									$.forEach(line =>
										line.should(
											'have.class',
											'segment-highlight-disabled'
										)
									);
								})
								.then(() => {
									cy.get('circle.schematic_dot').should(
										'have.length',
										48
									);
								});
						});
				});
		});
	});
});
