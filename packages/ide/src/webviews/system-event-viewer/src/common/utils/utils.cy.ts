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
import {formatAbsoluteDate, formatElapsedTime} from './status-time';
import {
	AUTO_SCROLL_EDGE_PX,
	AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME,
	AUTO_SCROLL_MIN_SPEED_PX_PER_FRAME,
	HEADER_HEIGHT
} from '../constants/timeline';
import {computeAutoScrollVelocity} from './timeline-diagram';
const createListRef = (top: number, height: number) =>
	({
		current: {
			getBoundingClientRect: () => new DOMRect(0, top, 0, height)
		}
	}) as unknown as React.RefObject<HTMLUListElement>;

function makeContainerRect(top: number, bottom: number): DOMRect {
	const rect: DOMRect = {
		top,
		bottom,
		left: 0,
		right: 400,
		x: 0,
		y: top,
		width: 400,
		height: bottom - top,
		toJSON: () => ({})
	};

	return rect;
}

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
	it('Should round partial minutes down', () => {
		const now = new Date('2026-04-08T10:00:00.000Z');

		const result = formatElapsedTime('2026-04-08T09:54:30.000Z', now);

		expect(result).to.equal('5 minutes ago');
	});

	it('Should format values at sixty minutes or above as hours only', () => {
		const now = new Date('2026-04-08T10:00:00.000Z');

		const result = formatElapsedTime('2026-04-08T08:55:00.000Z', now);

		expect(result).to.equal('1 hour ago');
	});

	it('Should format elapsed time below one minute as seconds', () => {
		const now = new Date('2026-04-08T10:00:30.000Z');

		const result = formatElapsedTime('2026-04-08T10:00:00.000Z', now);

		expect(result).to.equal('30 seconds ago');
	});

	it('Should format elapsed time at exactly one minute as minutes', () => {
		const now = new Date('2026-04-08T10:01:00.000Z');

		const result = formatElapsedTime('2026-04-08T10:00:00.000Z', now);

		expect(result).to.equal('1 minute ago');
	});

	it('Should return undefined for invalid values', () => {
		const result = formatElapsedTime('invalid-date');

		expect(result).to.equal(undefined);
	});

	it('Should format a valid ISO timestamp using browser locale date/time order', () => {
		const iso = '2026-05-20T10:00:00.000Z';
		const parsed = new Date(iso);

		const expectedDate = new Intl.DateTimeFormat(undefined, {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		}).format(parsed);

		const expectedTime = new Intl.DateTimeFormat(undefined, {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}).format(parsed);

		const result = formatAbsoluteDate(iso);

		expect(result).to.equal(expectedDate + ' at ' + expectedTime);
	});
});

describe('timeline auto-scroll', () => {
	it('Should compute auto-scroll velocity from the pointer edge zone', () => {
		const rect = makeContainerRect(100, 300);
		const contentTop = rect.top + HEADER_HEIGHT;
		const middleY = contentTop + (rect.bottom - contentTop) / 2;
		const topNearEdgeY = contentTop + AUTO_SCROLL_EDGE_PX - 1;
		const bottomNearEdgeY = rect.bottom - AUTO_SCROLL_EDGE_PX + 1;

		expect(computeAutoScrollVelocity(rect.top, rect)).to.equal(
			-AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME
		);
		expect(computeAutoScrollVelocity(rect.bottom, rect)).to.equal(
			AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME
		);
		expect(
			computeAutoScrollVelocity(topNearEdgeY, rect)
		).to.be.lessThan(-AUTO_SCROLL_MIN_SPEED_PX_PER_FRAME);
		expect(
			computeAutoScrollVelocity(bottomNearEdgeY, rect)
		).to.be.greaterThan(AUTO_SCROLL_MIN_SPEED_PX_PER_FRAME);
		expect(computeAutoScrollVelocity(middleY, rect)).to.equal(0);
		expect(
			computeAutoScrollVelocity(
				contentTop + AUTO_SCROLL_EDGE_PX,
				rect
			)
		).to.equal(0);
		expect(
			computeAutoScrollVelocity(
				rect.bottom - AUTO_SCROLL_EDGE_PX,
				rect
			)
		).to.equal(0);
		expect(computeAutoScrollVelocity(rect.top - 1, rect)).to.equal(
			-AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME
		);
		expect(computeAutoScrollVelocity(rect.bottom + 1, rect)).to.equal(
			AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME
		);
	});
});
