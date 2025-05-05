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
/* eslint-disable no-template-curly-in-string */
import {
	NOT_COMPUTED_MARKER,
	UNDEFINED_MARKER,
	UNCONFIGURED_TEXT
} from '../screens/clock-config/constants/clocks';
import {
	evaluateCondition,
	clockFrequencyDictionary,
	computeClockFrequency,
	type GlobalConfig
} from './rpn-expression-resolver';

Object.assign(clockFrequencyDictionary, {
	ERFO: 32000000,
	HFXOUT: 32000000,
	ERTCO: 32768,
	'32KOUT': 32768,
	IBRO: 7372800,
	ISO: 60000000,
	INRO: 8000,
	IPO: 120000000,
	ERFO_CLK: 32000000,
	ERTCO_CLK: 32768,
	NOT_COMPUTED: NOT_COMPUTED_MARKER
});

function TestComponent(props: {
	readonly currentCfg: Record<string, string>;
	readonly condition: string | undefined;
}) {
	const evaluate = evaluateCondition(
		props.currentCfg,
		props.condition
	);
	let resultText;

	if (evaluate === UNDEFINED_MARKER) {
		resultText = UNDEFINED_MARKER;
	} else if (evaluate === NOT_COMPUTED_MARKER) {
		resultText = NOT_COMPUTED_MARKER;
	} else {
		resultText = evaluate ? 'True' : 'False';
	}

	return <div data-test='result'>{resultText}</div>;
}

function ComputeFrequencyComponent(props: {
	readonly currentCfg: GlobalConfig;
	readonly condition: string;
}) {
	const computedResult = computeClockFrequency(
		props.currentCfg,
		props.condition
	);

	return (
		<>
			<div data-test='result'>{computedResult}</div>
			<div data-test='dict'>
				{JSON.stringify(clockFrequencyDictionary)}
			</div>
		</>
	);
}

describe('RPN Expression Resolver', () => {
	it('Should evaluate flat string conditions correctly', () => {
		const condition = '${Control:MODE} ${String:IN} =';
		const pinCfg = {MODE: 'IN', PWR: 'VDDIO', PS: 'DIS'};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate not equal condition correctly', () => {
		const condition = '${Control:MODE} ${String:OUT} !=';
		const pinCfg = {MODE: 'IN', PWR: 'VDDIO', PS: 'DIS'};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate multiple conditions with AND operator correctly', () => {
		const condition =
			'${Control:MODE} ${String:IN} = ${Control:PWR} ${String:VDDIO} = &';
		const pinCfg = {MODE: 'IN', PWR: 'VDDIO', PS: 'DIS'};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate multiple conditions with OR operator correctly', () => {
		const condition =
			'${Control:MODE} ${String:IN} = ${Control:MODE} ${String:OUT} = |';
		const pinCfg = {MODE: 'OUT', PWR: 'VDDIO', PS: 'DIS'};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate nested conditions with both AND and OR correctly', () => {
		const condition =
			'${Control:MODE} ${String:IN} = ${Control:PWR} ${String:VDDIO} = ${Control:PS} ${String:DIS} = | &';
		const pinCfg = {MODE: 'IN', PWR: 'VDDIO', PS: 'DIS'};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic expression with + correctly', () => {
		const condition = '3 2 + 5 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic expression with - correctly', () => {
		const condition = '3 2 - 1 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic expression with * correctly', () => {
		const condition = '3 2 * 6 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic expression with / correctly', () => {
		const condition = '5 3 / 1 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic expression with !== correctly', () => {
		const condition = '5 3 / 2 !=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should return true if condition is missing', () => {
		const condition = undefined;
		const pinCfg = {MODE: 'IN', PWR: 'VDDIO', PS: 'DIS'};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate greater than condition correctly', () => {
		const condition = '5 3 >';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate less than condition correctly', () => {
		const condition = '3 5 <';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate greater than or equal to condition correctly', () => {
		const condition = '5 5 >=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate less than or equal to condition correctly', () => {
		const condition = '3 5 <=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic and greater than comparison correctly', () => {
		const condition = '3 2 + 4 >';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic and less than comparison correctly', () => {
		const condition = '3 2 + 6 <';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic and greater than or equal to comparison correctly', () => {
		const condition = '3 2 + 5 >=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic and less than or equal to comparison correctly', () => {
		const condition = '3 2 + 5 <=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic and not equal comparison correctly', () => {
		const condition = '3 2 + 6 !=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic, comparison, and AND correctly', () => {
		const condition = '3 2 + 5 = 4 2 + 7 = &';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'False');
	});

	it('Should evaluate selection operator where condition is true', () => {
		const condition = '5 5 = 4 2 ? 4 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate selection operator where condition is false', () => {
		const condition = '5 6 = 4 2 ? 2 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate selection operator followed by comparison', () => {
		const condition = '5 6 = 4 2 ? 2 >=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate selection operator where condition is true', () => {
		const condition = '5 5 = 4 2 ? 4 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate selection operator where condition is false', () => {
		const condition = '5 6 = 4 2 ? 2 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate selection operator followed by comparison', () => {
		const condition = '5 6 = 4 2 ? 2 >=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic with hex and decimal correctly', () => {
		const condition = '0xA 5 + 15 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate comparison with hex and decimal correctly', () => {
		const condition = '0x10 16 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic, comparison, and AND correctly with hex and decimal', () => {
		const condition = '0x3 2 + 5 = 0x4 2 + 6 = &';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate selection operator with hex and decimal where condition is false', () => {
		const condition = '0x5 6 = 0x4 2 ? 2 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate string and comparison operators', () => {
		const condition = '${String:FISH} ${String:FISH} =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic operators', () => {
		const condition = '2 2 2 2 2 2 2 2 * * * * * * * 256 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate arithmetic operators containing both strings and numbers', () => {
		const condition = '${String:FISH} ${String:FOWL} != 3 4 < =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate string concatenation', () => {
		const condition =
			'${String:FISH} ${String:FOWL} + ${String:FISHFOWL} =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate regexp match', () => {
		const condition = '${String:FISHFOWL} ${String:S.FP?} match';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate regexp not match', () => {
		const condition = '${String:FISHFOWL} ${String:^FOWL} match !';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate left shift operator', () => {
		const condition = '1 2 << 4 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate right shift operator with hex numbers', () => {
		const condition = '0x1f 2 >> 0x7 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate left shift operator with hex numbers', () => {
		const condition = '0x1f 4 << 0x1f0 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate complex shift operations with multiple operators', () => {
		const condition = '0x1f 2 >> 2 << 1 !=';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate unsigned right shift with hex numbers', () => {
		const condition = '0xffffffff 4 >> 0xfffffff =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate unsigned left shift with hex numbers', () => {
		const condition = '0xffffffff 4 << 0xfffffff0 =';
		const pinCfg = {};

		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);

		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate equality with int and String', () => {
		const condition = '${String:4454} int 4454 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate equality with int and hexadecimal String', () => {
		const condition = '${String:0x1f} int 31 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate equality with int and large hexadecimal String', () => {
		const condition = '${String:0xfffffff0} int 0xfffffff0 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate equality with int and different bases', () => {
		const condition = '${String:30} int 0x1e =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate addition with int and String', () => {
		const condition = '${String:20} int 20 + 40 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate subtraction with int and String', () => {
		const condition = '${String:60} int 20 - 40 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate right shift with int', () => {
		const condition = '${String:64} int 2 >> 16 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate equality with negative numbers', () => {
		const condition = '${String:-20} int -20 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate equality with zero', () => {
		const condition = '${String:0} int 0 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should handle undef with int condition', () => {
		const condition = '${' + UNDEFINED_MARKER + '} int 4 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', UNDEFINED_MARKER);
	});

	it('Should propagate undef through comparison', () => {
		const condition = '1 ${' + UNDEFINED_MARKER + '} =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', UNDEFINED_MARKER);
	});

	it('Should propagate undef through addition', () => {
		const condition = '1 ${' + UNDEFINED_MARKER + '} + 5 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', UNDEFINED_MARKER);
	});

	it('Should handle mixed conditions with undef, where the other operand is chosen', () => {
		const condition = '1 5 ${' + UNDEFINED_MARKER + '} ? 5 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should handle mixed conditions with undef, where undef is chosen', () => {
		const condition = '1 ${' + UNDEFINED_MARKER + '} 10 ? 10 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', UNDEFINED_MARKER);
	});

	it('Should evaluate bitwise AND with equality', () => {
		const condition = '0xf0 0x73 & 0x70 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True'); // 0xf0 & 0x73 results in 0x70, which equals 0x70
	});

	it('Should evaluate bitwise OR with equality', () => {
		const condition = '0xf0 0x73 | 0xf3 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True'); // 0xf0 | 0x73 results in 0xf3, which equals 0xf3
	});

	it('Should evaluate bitwise XOR with equality', () => {
		const condition = '0xf0 0x73 ^ 0x83 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True'); // 0xf0 ^ 0x73 results in 0x83, which equals 0x83
	});

	it('Should evaluate bitwise NOT with equality', () => {
		const condition = '0xf0 ~ 0xffffff0f =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate multiple bitwise NOT operations with equality', () => {
		const condition = '0xf0 ~ ~ ~ ~ ~ ~ 0xf0 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate string equality and logical NOT with multiple equality checks', () => {
		const condition =
			'${String:FISH} ${String:FISH} = ! ${String:FISH} ${String:FOWL} = =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate logical NOT and equality with one and zero', () => {
		const condition = '1 ! 0 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate logical NOT and equality with non-zero number', () => {
		const condition = '3422 ! 0 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate logical NOT and equality with zero and one', () => {
		const condition = '0 ! 1 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should evaluate double logical NOT and equality with a non-zero number', () => {
		const condition = '3546456 ! ! 1 =';
		const pinCfg = {};
		cy.mount(
			<TestComponent currentCfg={pinCfg} condition={condition} />
		);
		cy.dataTest('result').should('have.text', 'True');
	});

	it('Should interpret the value of a control as a clock when evaluating the clk operator', () => {
		const valueCondition = '${Control:MUX} clk';

		const currentConfig = {
			clockconfig: {
				'ERTCO Mux': {
					Name: 'ERTCO Mux',
					Description: 'Mux for ERTCO bypass',
					Type: 'Mux',
					Outputs: [
						{
							Name: 'ERTCO',
							Description: 'Mux for ERTCO bypass',
							Value: '${Control:MUX} clk'
						}
					],
					controlValues: {
						MUX: 'ERTCO_CLK'
					}
				},
				'32KIN': {
					Name: '32KIN',
					Outputs: [
						{
							Name: 'ERTCO_CLK',
							Description: '32KIN Pin Input',
							Value: '32768'
						}
					],
					Config: {},
					ConfigUIOrder: [],
					controlValues: {}
				}
			},
			currentNode: 'ERTCO Mux'
		};

		cy.mount(
			<ComputeFrequencyComponent
				currentCfg={currentConfig}
				condition={valueCondition}
			/>
		);

		const expectedDictEntry = {
			ERTCO_CLK: 32768
		};

		cy.dataTest('result').should('have.text', 32768);

		cy.dataTest('dict').should($el => {
			const text = $el.text();
			const dict = JSON.parse(text);
			expect(dict).to.include(expectedDictEntry);
		});
	});

	it('Should use the current value of a clock to compute clock frequencies', () => {
		const valueCondition =
			'${Control:MUX} clk ${Control:EN_DIV} int /';

		const currentConfig = {
			clockconfig: {
				ADC: {
					Name: 'ADC',
					Outputs: [
						{
							Name: 'ADC',
							Description: 'ADC Peripheral',
							Value: '${Control:MUX} clk ${Control:EN_DIV} int /'
						}
					],
					controlValues: {
						ENABLE: 'True',
						MUX: 'IBRO',
						EN_DIV: '2'
					}
				},
				IBRO: {
					Name: 'IBRO',
					Description: 'Internal Baud Rate Oscillator',
					Type: 'Oscillator',
					Inputs: [],
					Outputs: [
						{
							Name: 'IBRO',
							Description: 'Internal Baud Rate Oscillator',
							Value: '7372800'
						}
					],
					Config: {},
					ConfigUIOrder: []
				}
			},
			currentNode: 'ADC'
		};

		cy.mount(
			<ComputeFrequencyComponent
				currentCfg={currentConfig}
				condition={valueCondition}
			/>
		);

		// As this is a global object, it would take the value computed on the last test.
		const expectedDictEntry = {
			ERTCO_CLK: 32768,
			IBRO: 7372800
		};

		cy.dataTest('result').should('have.text', 3686400);

		cy.dataTest('dict').should($el => {
			const text = $el.text();
			const dict = JSON.parse(text);

			Object.entries(expectedDictEntry).forEach(([key, value]) => {
				expect(dict).to.have.property(key, value);
			});
		});
	});

	it('Should process template strings that reference other control values withing the same tool', () => {
		const selector = '${Control:SYS_OSC Mux:MUX}';

		const currentConfig = {
			clockconfig: {
				'SYS_OSC Mux': {
					Name: 'SYS_OSC Mux',
					Outputs: [
						{
							Name: 'SYS_OSC',
							Description: 'Mux for SYS_OSC',
							Value: '${Control:MUX} clk'
						}
					],
					controlValues: {
						MUX: 'IBRO'
					}
				}
			},
			currentNode: 'x'
		};

		cy.mount(
			<ComputeFrequencyComponent
				currentCfg={currentConfig}
				condition={selector}
			/>
		);

		cy.dataTest('result').should('have.text', 'IBRO');
	});

	it('Should evaluate conditions that contain referenced control values', () => {
		const condition =
			'1 ${Control:SYS_OSC Mux:MUX} ${String:IPO} = &';

		const currentConfig = {
			'SYS_OSC Mux': {
				Name: 'SYS_OSC Mux',
				Outputs: [
					{
						Name: 'SYS_OSC',
						Description: 'Mux for SYS_OSC',
						Value: '${Control:MUX} clk'
					}
				],
				controlValues: {
					MUX: 'IPO'
				}
			}
		};

		cy.mount(
			<ComputeFrequencyComponent
				condition={condition}
				currentCfg={{clockconfig: currentConfig}}
			/>
		);

		cy.dataTest('result').should('have.text', '1');
	});

	it('Should evaluate as "not computed" when evaluating a condition that contains an uncomputed clock value', () => {
		const condition = '${Clock:NOT_COMPUTED} 16 /';

		cy.mount(<TestComponent currentCfg={{}} condition={condition} />);

		cy.dataTest('result').should('have.text', NOT_COMPUTED_MARKER);
	});

	it('Should evaluate as "unconfigured" if the user has not entered a value in the control', () => {
		const condition = '${Control:FREQ}';

		cy.mount(
			<ComputeFrequencyComponent
				currentCfg={{
					clockconfig: {
						'P3.5': {
							Name: 'P3.5',
							// Outputs: [
							// 	{
							// 		Name: 'LPTMR0_CLK',
							// 		Description: 'P3.5 Pin Input',
							// 		Value: '${Control:FREQ}'
							// 	}
							// ],
							controlValues: {
								FREQ: ''
							}
						}
					},
					currentNode: 'P3.5'
				}}
				condition={condition}
			/>
		);

		cy.dataTest('result').should('have.text', UNCONFIGURED_TEXT);
	});
});
