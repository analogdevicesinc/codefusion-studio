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
import type {ControlCfg, Soc} from '@common/types/soc';
import ClockDiagram from './ClockDiagram';
import {configurePreloadedStore} from '../../../state/store';
import {setClockNodeControlValue} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import type {CfsConfig} from 'cfs-plugins-api';

const soc = (await import('@socs/max32690-wlp.json').then(
	module => module.default
)) as Soc;

const configDict = {
	BoardName: '',
	Package: 'WLP',
	Soc: 'MAX32690',
	Projects: [
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
} as unknown as CfsConfig;

describe('Clock Diagram disabled states', () => {
	before(() => {
		cy.fixture('clock-config-plugin-controls-baremetal.json')
			.as('controls')
			.then(controls => {
				window.localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			});

		cy.viewport(1920, 1080);
	});
	it('Should enable and disable nodes and clocks in the diagram', () => {
		cy.get<Record<string, ControlCfg[]>>('@controls').then(
			controls => {
				const reduxStore = configurePreloadedStore(
					soc,
					configDict,
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
					'e057056c-c44d-11ef-a69d-a35a325d3daf',
					'3629a4e6-3fa4-11ef-b175-05083d74e1b4',
					'd52ea2b5-175f-11ef-bfcc-eff1a86f1e4c'
				];

				cy.mount(
					<div style={{width: '100vw', height: '100vh'}}>
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
							cy.wrap(
								reduxStore.dispatch(
									setClockNodeControlValue({
										name: 'TMR0/1/2/3',
										key: 'TMR0_ENABLE',
										value: 'TRUE'
									})
								)
							).then(() => {
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
										cy.wrap(
											reduxStore.dispatch(
												setClockNodeControlValue({
													name: 'TMR0/1/2/3',
													key: 'TMR0_ENABLE',
													value: 'FALSE'
												})
											)
										).then(() => {
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
						});
				});
			}
		);
	});
});
