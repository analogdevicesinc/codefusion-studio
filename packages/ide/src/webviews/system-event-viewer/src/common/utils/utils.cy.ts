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

import {clampYWithinList} from './floating-card';
import {formatElapsedTime} from './status-time';
import {
	DEFAULT_VISIBLE_WIDTH_PX,
	UNITS_ID as UNITS
} from '../constants/timeline';
import {computeUnit} from './x-axis-ticks';

const createListRef = (top: number, height: number) =>
	({
		current: {
			getBoundingClientRect: () => new DOMRect(0, top, 0, height)
		}
	}) as unknown as React.RefObject<HTMLUListElement>;

describe('floating-card', () => {
	it('Should clamp clientY to the minimum allowed value', () => {
		const listRef = createListRef(100, 200);
		const rowHeight = 40;

		const result = clampYWithinList(listRef, 90, rowHeight);

		expect(result).to.equal(120);
	});

	it('Should clamp clientY to the maximum allowed value', () => {
		const listRef = createListRef(100, 200);
		const rowHeight = 40;

		const result = clampYWithinList(listRef, 320, rowHeight);

		expect(result).to.equal(280);
	});
});

describe('Status', () => {
	it('Should round partial minutes up', () => {
		const now = new Date('2026-04-08T10:00:00.000Z');

		const result = formatElapsedTime('2026-04-08T09:54:30.000Z', now);

		expect(result).to.equal('6 min');
	});

	it('Should format values above sixty minutes as hours and minutes', () => {
		const now = new Date('2026-04-08T10:00:00.000Z');

		const result = formatElapsedTime('2026-04-08T08:55:00.000Z', now);

		expect(result).to.equal('1 h 5 min');
	});

	it('Should return undefined for invalid values', () => {
		const result = formatElapsedTime('invalid-date');

		expect(result).to.equal(undefined);
	});
});

describe('x-axis-ticks', () => {
	describe('computeUnit', () => {
		it('Should switch to seconds at 1ms per pixel boundary', () => {
			expect(computeUnit(1, 1000)).to.equal(UNITS.S);
		});

		it('Should switch to milliseconds at 1us per pixel boundary', () => {
			expect(computeUnit(1e-3, 1000)).to.equal(UNITS.MS);
		});

		it('Should switch to microseconds at 1ns per pixel boundary', () => {
			expect(computeUnit(1.001e-6, 1000)).to.equal(UNITS.US);
		});

		it('Should switch to nanoseconds below 1ns per pixel', () => {
			expect(computeUnit(1e-7, 1000)).to.equal(UNITS.NS);
		});

		it('Should estimate seconds-per-pixel with default width when width is unavailable', () => {
			expect(computeUnit(1)).to.equal(UNITS.S);
			expect(computeUnit(1e-3)).to.equal(UNITS.MS);
			expect(computeUnit(1.001e-6)).to.equal(UNITS.US);
			expect(computeUnit(1e-7)).to.equal(UNITS.NS);
		});

		it('Should return seconds for non-positive visible spans', () => {
			expect(computeUnit(0, DEFAULT_VISIBLE_WIDTH_PX)).to.equal(
				UNITS.S
			);
			expect(computeUnit(-1, DEFAULT_VISIBLE_WIDTH_PX)).to.equal(
				UNITS.S
			);
		});
	});
});
