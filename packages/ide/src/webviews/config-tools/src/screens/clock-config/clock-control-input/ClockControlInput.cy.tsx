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
import type {Soc} from '@common/types/soc';
import {configurePreloadedStore} from '../../../state/store';
import ClockControlInput from './ClockControlInput';
import {
	setClockNodeControlValue,
	setClockNodeDetailsTargetNode
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {controlErrorTypes} from '@common/utils/control-errors';
import {setAppliedSignal} from '../../../state/slices/pins/pins.reducer';

const wlp = await import('@socs/max32690-wlp.json').then(
	module => module.default
);

describe('Clock Control Input', () => {
	it('Should format correctly the error message when the input value is greater than the maximum value', () => {
		const reduxStore = configurePreloadedStore(wlp as unknown as Soc);

		reduxStore.dispatch(
			setAppliedSignal({
				Pin: 'F4',
				Peripheral: 'MISC',
				Name: 'CLKEXT'
			})
		);

		reduxStore.dispatch(
			setClockNodeControlValue({
				name: 'P0.23',
				key: 'P0_23_FREQ',
				value: '100000000',
				error: controlErrorTypes.maxVal
			})
		);

		reduxStore.dispatch(setClockNodeDetailsTargetNode('P0.23'));

		cy.mount(
			<ClockControlInput
				controlCfg={{
					key: 'P0_23_FREQ',
					type: 'integer',
					minVal: 1,
					maxVal: 80000000,
					unit: ''
				}}
				isDisabled={false}
				label='Test Label'
			/>,
			reduxStore
		);

		cy.dataTest('P0_23_FREQ-P0.23-error').should(
			'contain',
			'Value exceeds the range 1 to 80000000'
		);
	});

	it('Should format correctly the error message when the input value is less than the minimum value', () => {
		const reduxStore = configurePreloadedStore(wlp as unknown as Soc);

		reduxStore.dispatch(
			setClockNodeControlValue({
				name: 'P0.23',
				key: 'P0_23_FREQ',
				value: '0',
				error: controlErrorTypes.minVal
			})
		);

		reduxStore.dispatch(setClockNodeDetailsTargetNode('P0.23'));

		cy.mount(
			<ClockControlInput
				controlCfg={{
					key: 'P0_23_FREQ',
					type: 'integer',
					minVal: 1,
					maxVal: 80000000,
					unit: ''
				}}
				isDisabled={false}
				label='Test Label'
			/>,
			reduxStore
		);

		cy.dataTest('P0_23_FREQ-P0.23-error').should(
			'contain',
			'Value is lower than the allowed range 1 to 80000000'
		);
	});

	it('Should only allow positive integers as inputs', () => {
		const reduxStore = configurePreloadedStore(wlp as unknown as Soc);

		reduxStore.dispatch(setClockNodeDetailsTargetNode('P0.23'));

		cy.mount(
			<ClockControlInput
				controlCfg={{
					key: 'P0_23_FREQ',
					type: 'integer',
					minVal: 1,
					maxVal: 80000000,
					unit: ''
				}}
				isDisabled={false}
				label='Test Label'
			/>,
			reduxStore
		);

		const focusInput = () => {
			cy.dataTest('P0_23_FREQ-P0.23-control-input')
				.shadow()
				.find('input')
				.focus();
		};

		focusInput();

		cy.realType('!.-  +/');

		cy.dataTest('P0_23_FREQ-P0.23-control-input')
			.should('have.value', '')
			.then(() => {
				focusInput();

				cy.realType('abc');

				cy.dataTest('P0_23_FREQ-P0.23-control-input')
					.should('have.value', '')
					.then(() => {
						focusInput();

						cy.realType('-1');

						cy.dataTest('P0_23_FREQ-P0.23-control-input').should(
							'have.value',
							'1'
						);
					});
			});
	});
});
