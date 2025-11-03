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
			FirmwarePlatform: 'msdk',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		}
	]
} as unknown as CfsConfig;

describe('Clock Diagram computed values', () => {
	beforeEach(() => {
		cy.viewport(1068, 688);
		cy.fixture('clock-config-plugin-controls-msdk.json').then(
			controls => {
				window.localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			}
		);
	});

	it('Updates the computed clock values in the diagram', () => {
		cy.fixture('clock-config-plugin-controls-msdk.json').then(
			controls => {
				const reduxStore = configurePreloadedStore(
					soc,
					configDict,
					controls
				);

				cy.mount(
					<div style={{width: '100%', height: '688px'}}>
						<ClockDiagram
							canvas={soc.Packages[0].ClockCanvas}
							handleNodeHover={() => {}}
							handleClockHover={() => {}}
						/>
					</div>,
					reduxStore
				).then(() => {
					cy.get('g#0ef58c80-175f-11ef-bfcc-eff1a86f1e4c')
						.should('be.visible')
						.find('text')
						.first()
						.should('have.text', '120 MHz')
						.then(() => {
							cy.wrap(
								reduxStore.dispatch(
									setClockNodeControlValue({
										name: 'PRESCALER',
										key: 'DIV',
										value: '4'
									})
								)
							).then(setDivider => {
								cy.log(JSON.stringify(setDivider.payload));

								cy.get('g#0ef58c80-175f-11ef-bfcc-eff1a86f1e4c')
									.find('text')
									.first()
									.should('have.text', '30 MHz')
									.then(() => {
										const setClock = reduxStore.dispatch(
											setClockNodeControlValue({
												name: 'SYS_OSC Mux',
												key: 'MUX',
												value: 'ERTCO'
											})
										);

										cy.log(JSON.stringify(setClock.payload)).then(
											() => {
												cy.get(
													'g#0ef58c80-175f-11ef-bfcc-eff1a86f1e4c'
												)
													.find('text')
													.first()
													.should('have.text', '8.192 kHz');
											}
										);
									});
							});
						});
				});
			}
		);
	});
});
