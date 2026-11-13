/**
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
 */

import {
	NS_PER_SECOND,
	splitSeconds
} from './absolute-relative-shared-utils';
import type {TimeParts} from '../types/timeline';

export type AbsoluteTimeData = Readonly<{
	epoch: TimeParts;
	originSeconds: number;
}>;

export type TimeAxisCoordinates = Readonly<{
	toAxis: (elapsedSeconds: number) => number;
	toElapsed: (axisSeconds: number) => number;
}>;

/** Reads the original epoch and fixes the chart origin at that date's local midnight. */
export const parseAbsoluteContext = (
	tickEpoch?: string
): AbsoluteTimeData | undefined => {
	if (!tickEpoch) return undefined;

	const date = new Date(tickEpoch);

	if (!Number.isFinite(date.getTime())) return undefined;

	const seconds = Math.floor(date.getTime() / 1000);
	const digits = tickEpoch.match(/\.(\d+)/)?.[1] ?? '';
	const nanoseconds = Number(digits.padEnd(9, '0').slice(0, 9));
	date.setHours(0, 0, 0, 0);

	return {
		epoch: {seconds, nanoseconds},
		originSeconds: date.getTime() / 1000
	};
};

/** Keeps elapsed values unchanged for REL, TICKS, and documents without an epoch. */
export const ELAPSED_COORDINATES: TimeAxisCoordinates = {
	toAxis: value => value,
	toElapsed: value => value
};

/** Converts only the ABS header, retaining fractional precision when reversing the offset. */
export const createAbsoluteCoordinates = (
	absolute: AbsoluteTimeData | undefined
): TimeAxisCoordinates => {
	if (!absolute) return ELAPSED_COORDINATES;

	const seconds = absolute.epoch.seconds - absolute.originSeconds;
	const nanoseconds = absolute.epoch.nanoseconds;
	const offset = seconds + nanoseconds / NS_PER_SECOND;

	return {
		toAxis: value => value + offset,
		toElapsed: value => {
			const parts = splitSeconds(value);

			return (
				parts.seconds -
				seconds +
				(parts.nanoseconds - nanoseconds) / NS_PER_SECOND
			);
		}
	};
};
