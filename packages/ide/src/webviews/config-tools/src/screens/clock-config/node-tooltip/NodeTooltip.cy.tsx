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
import type {DiagramNode, Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import NodeTooltip from './NodeTooltip';
import {
	setClockNodeControlValue,
	setDiagramData
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {useRef} from 'react';
import {controlErrorTypes} from '../../../utils/control-errors';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

const wlp = await import(
	'../../../../../../../../cli/src/socs/max32690-wlp.json'
).then(module => module.default);

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
	it('Displays correct error message on tooltip when a control contains a value greater than the allowed', () => {
		const store = configurePreloadedStore(wlp as unknown as Soc);

		const {registers} =
			store.getState().appContextReducer.registersScreen;

		store.dispatch(
			setAppliedSignal({
				Pin: 'F4',
				Peripheral: 'MISC',
				Name: 'CLKEXT',
				registers
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
				type: 'Mux',
				name: 'SYS_OSC Mux',
				key: 'MUX',
				value: 'CLKEXT'
			})
		);

		store.dispatch(
			setClockNodeControlValue({
				type: 'Pin Input',
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

		cy.dataTest('tooltip:notification:error').should('be.visible');

		cy.dataTest('notification:message').contains(
			'Entered value is too high'
		);

		cy.get('ul > li[data-test="tooltip:body:error-value"]').contains(
			'200000000 (Max 80000000)'
		);

		cy.dataTest('notification:icon:conflict').should('be.visible');
	});

	it('Displays correct error message on tooltip when a control contains a value less than the allowed', () => {
		const store = configurePreloadedStore(wlp as unknown as Soc);

		const {registers} =
			store.getState().appContextReducer.registersScreen;

		store.dispatch(
			setAppliedSignal({
				Pin: 'F4',
				Peripheral: 'MISC',
				Name: 'CLKEXT',
				registers
			})
		);

		store.dispatch(
			setClockNodeControlValue({
				type: 'Pin Input',
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

		cy.get('ul > li[data-test="tooltip:body:error-value"]').contains(
			'0 (Min 1)'
		);

		cy.dataTest('notification:icon:conflict').should('be.visible');
	});

	it('Should display inputs and outputs when hovered node is a divider', () => {
		const store = configurePreloadedStore(wlp as unknown as Soc);

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
