/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {expect} from 'chai';
import {generateValidationErrorType} from './validate-inputs';
import {computeErrorPerControl} from './dynamic-form-svc';

describe('generateValidationErrorType', () => {
	it('accepts numeric zero for decimal integer controls', () => {
		expect(
			generateValidationErrorType({
				content: '0',
				controlType: 'integer',
				minVal: 0,
				maxVal: 8,
				base: 'Decimal'
			})
		).to.equal(undefined);
	});

	it('accepts numeric zero for hexadecimal integer controls', () => {
		expect(
			generateValidationErrorType({
				content: '0',
				controlType: 'integer',
				minVal: '0x0',
				maxVal: '0x3ff',
				base: 'Hexadecimal'
			})
		).to.equal(undefined);
	});

	it('does not treat numeric zero as an empty form value', () => {
		expect(
			computeErrorPerControl({
				id: 'TARGET0_ADDR',
				type: 'integer',
				value: 0,
				minVal: '0x0',
				maxVal: '0x3ff',
				base: 'Hexadecimal'
			})
		).to.equal(undefined);
	});
});
