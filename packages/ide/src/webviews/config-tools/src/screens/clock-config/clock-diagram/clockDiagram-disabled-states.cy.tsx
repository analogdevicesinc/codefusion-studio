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
/* eslint-disable max-nested-callbacks */
/* eslint-disable @typescript-eslint/no-empty-function */
import type {Soc} from '@common/types/soc';
import ClockDiagram from './ClockDiagram';
import {configurePreloadedStore} from '../../../state/store';
import {setClockNodeControlValue} from '../../../state/slices/clock-nodes/clockNodes.reducer';

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
			FirmwarePlatform: 'baremetal',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		}
	]
};

describe('Clock Diagram disabled states', () => {
	beforeEach(() => {
		window.localStorage.setItem(
			'Package',
			JSON.stringify(soc.Packages[0])
		);

		window.localStorage.setItem(
			'configDict',
			JSON.stringify(configDict)
		);

		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				window.localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			}
		);
	});
	it('Should enable and disable nodes and clocks in the diagram', () => {
		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				const reduxStore = configurePreloadedStore(
					soc,
					undefined,
					controls
				);

				const targetClocks = [
					'4e8bca4b-1763-11ef-a073-695fa460553d',
					'0385d850-1c41-11ef-8079-f382b26e79a7',
					'12bb4710-1c41-11ef-8079-f382b26e79a7',
					'14aae210-1c41-11ef-8079-f382b26e79a7',
					'26e7c470-1c41-11ef-8079-f382b26e79a7',
					'496384e6-3fa4-11ef-b175-05083d74e1b4',
					'd0e0e8e0-1c40-11ef-8079-f382b26e79a7',
					'de0d75d0-ce59-11ef-8762-074fe3ac9b96',
					'd424c482-c44d-11ef-a69d-a35a325d3daf',
					'3629a4e6-3fa4-11ef-b175-05083d74e1b4',
					'd52ea2b5-175f-11ef-bfcc-eff1a86f1e4c'
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

					junctions.should('have.length', 47);

					cy.wrap(
						targetClocks.map(clock => {
							const line = cy.get(`g#${clock} > g > path`);

							return line;
						})
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
							const enableClock = reduxStore.dispatch(
								setClockNodeControlValue({
									name: 'TMR0/1/2/3',
									key: 'TMR0_ENABLE',
									value: 'TRUE'
								})
							);

							cy.log(JSON.stringify(enableClock.payload));

							cy.wait(1000);

							cy.wrap(
								targetClocks.map(clock =>
									cy.get(`g#${clock} > g > path`)
								)
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
												47
											);
										});
								});
						});
				});
			}
		);
	});
});
