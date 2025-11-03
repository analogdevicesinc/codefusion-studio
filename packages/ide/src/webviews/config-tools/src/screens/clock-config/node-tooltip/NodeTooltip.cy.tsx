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

/* eslint-disable @typescript-eslint/no-unsafe-argument */
import type {DiagramNode, Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import NodeTooltip from './NodeTooltip';
import {
	setClockNodeControlValue,
	setDiagramData
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {useRef} from 'react';
import {controlErrorTypes} from '@common/utils/control-errors';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

const wlp = (await import('@socs/max32690-wlp.json'))
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
			FirmwarePlatform: 'baremetal',
			CoreId: 'CM4',
			Name: 'ARM Cortex-M4',
			PluginId: '',
			ProjectId: 'CM4-proj'
		}
	]
} as unknown as CfsConfig;

const mockHoveredNodeInfo = {
	name: '',
	id: '',
	styles: {
		backgroundColor: '',
		fontColor: '',
		circleColor: '',
		borderColor: '',
		icon: undefined
	},
	icon: '',
	background: '',
	group: '',
	clockReference: undefined,
	metadata: {
		name: undefined,
		group: '',
		description: undefined,
		type: undefined,
		outputTerminals: [],
		intputTerminals: []
	},
	condition: undefined,
	enabled: true,
	error: false
};

function MockDiagramNode({
	hoveredNodeInfo
}: {
	readonly hoveredNodeInfo: DiagramNode;
}) {
	const ref = useRef<HTMLDivElement>(null);

	return (
		<div
			ref={ref}
			style={{position: 'relative', width: '100%', height: '500px'}}
		>
			<div style={{width: '128px', height: '48px', border: '1px'}} />
			<NodeTooltip
				hoveredNodeInfo={hoveredNodeInfo}
				containerRef={ref}
			/>
		</div>
	);
}

describe('Node Tooltip', () => {
	beforeEach(() => {
		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				localStorage.setItem(
					'pluginControls:CM4-proj',
					JSON.stringify(controls)
				);
			}
		);
	});

	it('Displays correct error message on tooltip when a control contains a value greater than the allowed', () => {
		cy.fixture('clock-config-plugin-controls-baremetal.json').then(
			controls => {
				const store = configurePreloadedStore(
					wlp,
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

				store.dispatch(
					setClockNodeControlValue({
						name: 'SYS_OSC Mux',
						key: 'MUX',
						value: 'CLKEXT'
					})
				);

				store.dispatch(
					setClockNodeControlValue({
						name: 'P0.23',
						key: 'P0_23_FREQ',
						value: '200000000',
						error: controlErrorTypes.maxVal
					})
				);

				cy.mount(
					<MockDiagramNode
						hoveredNodeInfo={{
							...mockHoveredNodeInfo,
							name: 'P0.23',
							error: true
						}}
					/>,
					store
				);

				cy.dataTest('tooltip:notification:error').should(
					'be.visible'
				);

				cy.dataTest('notification:message').contains(
					'Entered value is too high'
				);

				cy.get(
					'ul > li[data-test="tooltip:body:error-value"]'
				).contains('200000000 (Max 80000000)');

				cy.dataTest('notification:icon:conflict').should(
					'be.visible'
				);
			}
		);
	});

	it('Displays correct error message on tooltip when a control contains a value less than the allowed', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const store = configurePreloadedStore(wlp, undefined, controls);

			store.dispatch(
				setAppliedSignal({
					Pin: 'F4',
					Peripheral: 'MISC',
					Name: 'CLKEXT'
				})
			);

			store.dispatch(
				setClockNodeControlValue({
					name: 'P0.23',
					key: 'P0_23_FREQ',
					value: '0',
					error: controlErrorTypes.minVal
				})
			);

			cy.mount(
				<MockDiagramNode
					hoveredNodeInfo={{
						...mockHoveredNodeInfo,
						name: 'P0.23',
						error: true
					}}
				/>,
				store
			);

			cy.dataTest('tooltip:notification:error').should('be.visible');

			cy.dataTest('notification:message').contains(
				'Entered value is too low'
			);

			cy.get(
				'ul > li[data-test="tooltip:body:error-value"]'
			).contains('0 (Min 1)');

			cy.dataTest('notification:icon:conflict').should('be.visible');
		});
	});

	it('Should display inputs and outputs when hovered node is a divider', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const store = configurePreloadedStore(wlp, undefined, controls);

			cy.mount(
				<MockDiagramNode
					hoveredNodeInfo={{
						...mockHoveredNodeInfo,
						name: 'PRESCALER',
						error: false
					}}
				/>,
				store
			);

			cy.dataTest('tooltip:header:nodeName').should(
				'have.text',
				'PRESCALER'
			);
			cy.dataTest('tooltip:header:nodeDescription').should(
				'have.text',
				'System Oscillator Prescaler'
			);
			cy.dataTest('tooltip:inputs:title').should('be.visible');
			cy.dataTest('tooltip:outputs:title').should('be.visible');
		});
	});

	it('Should only display information about active controls', () => {
		cy.fixture('clock-config-plugin-controls.json').then(controls => {
			const store = configurePreloadedStore(wlp, undefined, controls);

			store.dispatch(
				setClockNodeControlValue({
					name: 'TMR0/1/2/3',
					key: 'TMR0_ENABLE',
					value: 'TRUE'
				})
			);

			cy.mount(
				<MockDiagramNode
					hoveredNodeInfo={{
						...mockHoveredNodeInfo,
						name: 'TMR0/1/2/3',
						error: false
					}}
				/>,
				store
			);

			cy.dataTest('tooltip:header:nodeName').should(
				'have.text',
				'TMR0/1/2/3'
			);

			cy.dataTest('tooltip:header:nodeDescription').should(
				'have.text',
				'Timer Peripherals'
			);

			cy.dataTest('TMR0a').should('be.visible');
			cy.dataTest('TMR0b').should('be.visible');

			cy.dataTest('TMR1a').should('not.exist');
			cy.dataTest('TMR1b').should('not.exist');
		});
	});
});
