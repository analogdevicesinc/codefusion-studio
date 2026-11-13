/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import {formatSocAddress} from './firewall';

describe('formatSocAddress', () => {
	it('should return undefined when there is no value', () => {
		expect(formatSocAddress(undefined)).to.equal(undefined);
	});

	it('should format a number as a lower-case prefixed address', () => {
		expect(formatSocAddress(0xabcd)).to.equal('0xabcd');
	});

	it('should lower-case the digits of an already prefixed address', () => {
		expect(formatSocAddress('0xABCD')).to.equal('0xabcd');
	});

	it('should normalize an upper-case 0X prefix', () => {
		expect(formatSocAddress('0XABCD')).to.equal('0xabcd');
	});

	it('should add the prefix to an unprefixed address', () => {
		expect(formatSocAddress('ABCD')).to.equal('0xabcd');
	});

	it('should leave an already normalized address unchanged', () => {
		expect(formatSocAddress('0xabcd')).to.equal('0xabcd');
	});

	it('should produce equal strings for every casing of one address', () => {
		// Region lookup compares addresses with exact string equality, so the
		// casing the data model happens to use must not affect the result.
		const variants = ['0xABCD', '0XABCD', '0xAbCd', 'abcd', 0xabcd];

		const formatted = new Set(
			variants.map(variant => formatSocAddress(variant))
		);

		expect(Array.from(formatted)).to.deep.equal(['0xabcd']);
	});
});
