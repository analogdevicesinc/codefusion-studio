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

import {
	MEASURE_PHASE,
	SNAP_RADIUS_X,
	SNAP_RADIUS_Y,
	UNITS_ID as UNITS,
	UNITS_LABEL as LABELS
} from '../constants/timeline';
import type {
	DataZoom,
	MeasurePhase,
	MeasurePoint,
	MeasureResolvedPoint,
	MeasureSnapCandidate,
	Unit,
	Range
} from '../types/timeline';
import type {EChartsType} from 'echarts/core';
import {computeUnit, getVisibleTimeWindow} from './x-axis-ticks';

type TimeParts = Readonly<{
	s: number;
	ms: number;
	us: number;
	ns: number;
}>;

export const isMeasureModeActive = (measurePhase: MeasurePhase) =>
	measurePhase !== MEASURE_PHASE.IDLE;

export const isPointWithinBounds = (
	point: MeasurePoint,
	width: number,
	height: number
) =>
	point.x >= 0 &&
	point.y >= 0 &&
	point.x <= width &&
	point.y <= height;

export const isPointInsideHeaderStrip = (
	point: MeasurePoint,
	headerHeight: number
) => point.y >= 0 && point.y <= headerHeight;

export const isPointInsideSnapCandidateArea = (
	point: MeasurePoint,
	candidate: MeasureSnapCandidate
) =>
	Math.abs(point.x - candidate.x) <= SNAP_RADIUS_X / 2 &&
	Math.abs(point.y - candidate.y) <= SNAP_RADIUS_Y / 2;

export const findNearestSnapCandidate = (
	point: MeasurePoint,
	candidates: MeasureSnapCandidate[]
): MeasureSnapCandidate | undefined => {
	let nearest: MeasureSnapCandidate | undefined;
	let nearestDistanceSq = Number.POSITIVE_INFINITY;

	candidates.forEach(candidate => {
		if (!isPointInsideSnapCandidateArea(point, candidate)) return;

		const deltaX = point.x - candidate.x;
		const deltaY = point.y - candidate.y;
		const distanceSq = deltaX * deltaX + deltaY * deltaY;

		if (distanceSq >= nearestDistanceSq) return;

		nearest = candidate;
		nearestDistanceSq = distanceSq;
	});

	return nearest;
};

export const resolvePointFromCandidate = (
	candidate: MeasureSnapCandidate
): MeasureResolvedPoint => ({
	x: candidate.x,
	y: candidate.y,
	timestamp: candidate.timestamp,
	sourceId: candidate.sourceId,
	eventIndex: candidate.eventIndex,
	isSnapped: true
});

export const resolvePointFromBackground = (
	point: MeasurePoint,
	timestamp: number | undefined
): MeasureResolvedPoint => ({
	x: point.x,
	y: point.y,
	timestamp,
	isSnapped: false
});

export const computeMeasurementUnit = (
	timestamps: Range,
	dataZoom: DataZoom,
	headerChart?: EChartsType
): Unit => {
	const {visibleStart, visibleEnd, visibleSpanSec} =
		getVisibleTimeWindow(timestamps, dataZoom);
	let visibleAxisWidthPx: number | undefined;

	if (headerChart) {
		const startPx = headerChart.convertToPixel(
			{xAxisIndex: 0},
			visibleStart
		);

		const endPx = headerChart.convertToPixel(
			{xAxisIndex: 0},
			visibleEnd
		);

		visibleAxisWidthPx = Math.abs(endPx - startPx);
	}

	return computeUnit(visibleSpanSec, visibleAxisWidthPx);
};

// For a given zoom level, return the relevant time unit to display on the measurement labels
export const formatTimestamp = (
	timestamp: number | undefined,
	unit: Unit
): string | undefined => {
	if (timestamp === undefined) return undefined;

	const parts = toTimeParts(timestamp);
	const timeUnits = filterUnits(unit);

	return timeUnits
		.map(unit => `${parts[unit]}${LABELS[unit]}`)
		.join(' ');
};

export const formatTimeDiff = (
	startTimestamp: number | undefined,
	endTimestamp: number | undefined,
	unit: Unit
): string | undefined => {
	if (startTimestamp === undefined || endTimestamp === undefined) {
		return undefined;
	}

	const deltaNs = Math.round((endTimestamp - startTimestamp) * 1e9);
	const sign = deltaNs < 0 ? '-' : '';
	const parts = toTimeParts(Math.abs(deltaNs) / 1e9);
	const timeUnits = filterUnits(unit);
	const values = timeUnits.map(unit => parts[unit]);

	return `${sign}${compactTimeValues(values, timeUnits)}`;
};

export const clampLabelLeft = (
	lineX: number,
	labelWidth: number,
	overlayWidth: number
) => {
	if (labelWidth <= 0 || overlayWidth <= 0) {
		return lineX;
	}

	const proposedX = lineX - labelWidth / 2;

	return Math.max(0, Math.min(proposedX, overlayWidth - labelWidth));
};

const toTimeParts = (timestamp: number): TimeParts => {
	const totalNs = Math.max(0, Math.round(timestamp * 1e9));
	const s = Math.floor(totalNs / 1e9);
	const afterS = totalNs - s * 1e9;
	const ms = Math.floor(afterS / 1e6);
	const afterMs = afterS - ms * 1e6;
	const us = Math.floor(afterMs / 1e3);
	const ns = afterMs - us * 1e3;

	return {s, ms, us, ns};
};

// For a given zoom level, return the relevant time units to display based on the visible span
// it can be [s, ms] or [s, ms, us] or [s, ms, us, ns]
const filterUnits = (unit: Unit): Unit[] => {
	if (unit === UNITS.S) return [UNITS.S, UNITS.MS] as const;
	if (unit === UNITS.MS)
		return [UNITS.S, UNITS.MS, UNITS.US] as const;

	return [UNITS.S, UNITS.MS, UNITS.US, UNITS.NS] as const;
};

// Takes an array of time values and their corresponding units
// and returns a compact string representation, removing leading zero units and trailing zero units
// [0s, 0ms, 5us] => "5µs"
const compactTimeValues = (
	values: number[],
	units: Unit[]
): string => {
	const firstNonZeroIndex = values.findIndex(value => value > 0);

	if (firstNonZeroIndex === -1) {
		const smallestUnit = units[units.length - 1];

		return `0${LABELS[smallestUnit]}`;
	}

	let lastNonZeroIndex = values.length - 1;

	while (
		lastNonZeroIndex > firstNonZeroIndex &&
		values[lastNonZeroIndex] === 0
	) {
		lastNonZeroIndex -= 1;
	}

	return units
		.slice(firstNonZeroIndex, lastNonZeroIndex + 1)
		.map(
			(unit, index) =>
				`${values[firstNonZeroIndex + index]}${LABELS[unit]}`
		)
		.join(' ');
};

export const getAxisPoints = (
	point: MeasureResolvedPoint | MeasureSnapCandidate | undefined
): MeasurePoint | undefined => {
	if (!point) return undefined;

	return {
		x: point.x,
		y: point.y
	};
};

export const isPreviewPhase = (phase: MeasurePhase): boolean =>
	phase === MEASURE_PHASE.ARMED || phase === MEASURE_PHASE.MEASURING;
export const isLinePhase = (phase: MeasurePhase): boolean =>
	phase === MEASURE_PHASE.MEASURING || phase === MEASURE_PHASE.FIXED;
