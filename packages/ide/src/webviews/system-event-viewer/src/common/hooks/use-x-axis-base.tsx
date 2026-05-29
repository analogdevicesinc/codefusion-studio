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

import {useEffect, useMemo, useRef} from 'react';

import {store, useAppDispatch} from '../../state/store';
import {setTickValue} from '../../state/slices/timeline/timeline.reducer';

import {UNITS_ID as UNITS} from '../constants/timeline';
import {
	computeUnit,
	destructureLeftBase,
	computeTickValue
} from '../utils/x-axis-ticks';

import type {Base, DataZoom, Unit} from '../types/timeline';

/**
 * Subscribes to Redux dataZoom changes and keeps the latest
 * unit, base and leftValInSeconds in refs without causing re-renders.
 * Also dispatches the derived tickValue on changes.
 */
const useXAxisBase = (timestampRange: {min: number; max: number}) => {
	const dispatch = useAppDispatch();

	const unitRef = useRef<Unit>(UNITS.S);
	const baseRef = useRef<Base>({s: 0, ms: 0, us: 0});
	const leftValRef = useRef<number>(timestampRange.min);
	const lastTickRef = useRef<string>('');

	const computeFromDataZoom = useMemo(
		() => (dataZoom: DataZoom) => {
			const rangeInSeconds = timestampRange.max - timestampRange.min;
			const dataZoomSpanPct = Math.max(
				0,
				dataZoom.end - dataZoom.start
			);
			const visibleSpanInSeconds =
				rangeInSeconds * (dataZoomSpanPct / 100);
			const leftValInSeconds =
				timestampRange.min + rangeInSeconds * (dataZoom.start / 100);

			const unit = computeUnit(visibleSpanInSeconds);
			const base = destructureLeftBase(leftValInSeconds);

			unitRef.current = unit;
			baseRef.current = base;
			leftValRef.current = leftValInSeconds;

			const tick = computeTickValue(
				dataZoom,
				unit,
				base,
				leftValInSeconds
			);

			if (tick !== lastTickRef.current) {
				lastTickRef.current = tick;
				dispatch(setTickValue(tick));
			}
		},
		[dispatch, timestampRange.max, timestampRange.min]
	);

	useEffect(() => {
		const initialState = store.getState();
		computeFromDataZoom(initialState.timelineReducer.dataZoom);

		const unsubscribe = store.subscribe(() => {
			const state = store.getState();

			computeFromDataZoom(state.timelineReducer.dataZoom);
		});

		return unsubscribe;
	}, [
		computeFromDataZoom,
		dispatch,
		timestampRange.max,
		timestampRange.min
	]);

	return {
		unit: unitRef.current,
		base: baseRef.current,
		leftValInSeconds: leftValRef.current
	};
};

export default useXAxisBase;
