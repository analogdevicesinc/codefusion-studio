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
	createAbsoluteCoordinates,
	parseAbsoluteContext,
	type AbsoluteTimeData,
	type TimeAxisCoordinates
} from './time-axis-coordinates';
import type {TimeContext} from '../types/events';

type AbsoluteTimeContext = Readonly<
	AbsoluteTimeData & {coordinates: TimeAxisCoordinates}
>;

let timeContext: Readonly<TimeContext> = {
	tickFrequency: 1,
	tickEpoch: ''
};
let absolute:
	| {
			tickEpoch: string | undefined;
			value: AbsoluteTimeContext | undefined;
	  }
	| undefined;

/** Replaces the raw document context; epoch changes invalidate the lazy ABS cache. */
export const configureTimeContext = (context: TimeContext): void => {
	if (timeContext.tickEpoch !== context.tickEpoch) {
		absolute = undefined;
	}

	timeContext = {
		tickFrequency: context.tickFrequency,
		tickEpoch: context.tickEpoch
	};
};

/** Returns the current raw snapshot without adding derived ABS fields. */
export const getTimeContext = (): Readonly<TimeContext> =>
	timeContext;

/**
 * Shares one lazily derived epoch snapshot between formatting and chart coordinates.
 * The caller supplies its epoch so captured formatter contexts remain valid after updates.
 * Missing and invalid epochs are cached too.
 */
export const getAbsoluteTimeContext = (
	tickEpoch: string | undefined
): AbsoluteTimeContext | undefined => {
	if (!absolute || absolute.tickEpoch !== tickEpoch) {
		const parsed = parseAbsoluteContext(tickEpoch);

		absolute = {
			tickEpoch,
			value: parsed
				? {...parsed, coordinates: createAbsoluteCoordinates(parsed)}
				: undefined
		};
	}

	return absolute.value;
};
