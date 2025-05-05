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
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';
import type {CfsConfig} from 'cfs-plugins-api';

const soc = await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default as unknown as Soc);

describe('Clock Diagram', () => {
	beforeEach(() => {
		cy.clearLocalStorage().then(() => {
			localStorage.setItem(
				'ClockNodes',
				JSON.stringify(soc.ClockNodes)
			);

			cy.fixture('clock-config-plugin-controls.json').then(
				controls => {
					window.localStorage.setItem(
						'pluginControls:CM4-proj',
						JSON.stringify(controls)
					);
				}
			);

			window.localStorage.setItem(
				'configDict',
				JSON.stringify({
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
				})
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
		});

		cy.viewport(1068, 688);
	});

	it('Should render error states in the diagram', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const reduxStore = configurePreloadedStore(
				soc,
				{} as CfsConfig,
				controls
			);

			reduxStore.dispatch(
				setAppliedSignal({
					Pin: 'F4',
					Peripheral: 'MISC',
					Name: 'CLKEXT'
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

			cy.mount(
				<div style={{width: '100%', height: '400px'}}>
					<ClockDiagram
						canvas={soc.Packages[0].ClockCanvas}
						handleNodeHover={() => {}}
						handleClockHover={() => {}}
					/>
				</div>,
				reduxStore
			)
				.then(() => {
					// P0.23 has unconfigured value, it should display as error
					cy.get(
						'#\\32 22bd4f0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node_highlight.error'
					).should('be.visible');

					// All related nodes should be in error state
					cy.get(
						'#\\31 84f1cd0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node_highlight.error'
					).should('be.visible');

					cy.get(
						'#ec99b0a0-175c-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node_highlight.error'
					).should('be.visible');

					cy.get(
						'#\\36 4a89760-178e-11ef-a3f8-3128e749cdb5 > rect.adi_diagram_content_node_highlight.error'
					).should('be.visible');

					cy.get(
						'#\\35 7c00a30-175f-11ef-bfcc-eff1a86f1e4c > rect.adi_diagram_content_node_highlight.error'
					).should('be.visible');

					cy.get(
						'#f8b687d0-3202-11ef-9ee9-a103ae3867ee > rect.adi_diagram_content_node_highlight.error'
					).should('be.visible');
				})
				.then(() => {
					cy.wrap(
						reduxStore.dispatch(
							setClockNodeControlValue({
								name: 'P0.23',
								key: 'P0_23_FREQ',
								value: '10000',
								error: undefined
							})
						)
					).then(setValidValue => {
						cy.log(JSON.stringify(setValidValue.payload))
							.then(() => {
								// When a valid value is set, all the error path is removed
								cy.get(
									'#\\32 22bd4f0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node'
								).should('be.visible');
								// All related nodes should be in error state
								cy.get(
									'#\\31 84f1cd0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node'
								).should('be.visible');
								cy.get(
									'#ec99b0a0-175c-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node'
								).should('be.visible');
								cy.get(
									'#\\36 4a89760-178e-11ef-a3f8-3128e749cdb5 > rect.adi_diagram_content_node'
								).should('be.visible');
								cy.get(
									'#\\35 7c00a30-175f-11ef-bfcc-eff1a86f1e4c > rect.adi_diagram_content_node'
								).should('be.visible');
								cy.get(
									'#f8b687d0-3202-11ef-9ee9-a103ae3867ee > rect.adi_diagram_content_node'
								).should('be.visible');
							})
							.then(() => {
								cy.wrap(
									reduxStore.dispatch(
										setClockNodeControlValue({
											name: 'P0.23',
											key: 'P0_23_FREQ',
											value: '90000000',
											error: 'INVALID_MAX_VAL'
										})
									)
								).then(revert => {
									cy.log(JSON.stringify(revert.payload));
									cy.wait(1000);
									cy.get(
										'#\\32 22bd4f0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node_highlight.error'
									).should('be.visible');
									cy.get(
										'#\\31 84f1cd0-175d-11ef-a773-0da4986d92e7 > rect.adi_diagram_content_node_highlight.error'
									).should('be.visible');
								});
							});
					});
				});
		});
	});

	it('Correctly disables nodes that are initialized in error state', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const reduxStore = configurePreloadedStore(
				soc,
				{} as CfsConfig,
				controls
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
				cy.wait(2000);

				// Assert High-Speed USB initializes in disabled state
				cy.get(
					'#b2dd6340-1c41-11ef-8079-f382b26e79a7 > rect.adi_diagram_content_node_highlight.disabled'
				)
					.should('be.visible')
					.then(() => {
						cy.wrap(
							reduxStore.dispatch(
								setClockNodeControlValue({
									name: 'High-Speed USB',
									key: 'ENABLE',
									value: 'TRUE'
								})
							)
						)
							.then(() => {
								cy.wrap(
									reduxStore.dispatch(
										setClockNodeControlValue({
											name: 'SYS_OSC Mux',
											key: 'MUX',
											value: 'ISO'
										})
									)
								);
							})
							.then(() => {
								cy.wait(1000);

								// Assert High-Speed USB enables with error state
								cy.get(
									'#b2dd6340-1c41-11ef-8079-f382b26e79a7 > rect.adi_diagram_content_node_highlight.error'
								)
									.should('be.visible')
									.then(() => {
										cy.wrap(
											reduxStore.dispatch(
												setClockNodeControlValue({
													name: 'High-Speed USB',
													key: 'ENABLE',
													value: 'FALSE'
												})
											)
										).then(() => {
											cy.wait(1000);

											// Assert High-Speed USB returns to disabled state
											cy.get(
												'#b2dd6340-1c41-11ef-8079-f382b26e79a7 > rect.adi_diagram_content_node_highlight.disabled'
											).should('be.visible');
										});
									});
							});
					});
			});
		});
	});
});
