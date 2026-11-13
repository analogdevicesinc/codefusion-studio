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
	LABEL_GAP
} from '../constants/timeline';
import type {
	MeasurePhase,
	MeasurePoint,
	MeasurePointResolution,
	MeasureSnapCandidate
} from '../types/timeline';

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
): MeasurePointResolution => ({
	x: candidate.x,
	y: candidate.y,
	timestamp: candidate.timestamp,
	rawTicks: candidate.rawTicks,
	sourceId: candidate.sourceId,
	eventIndex: candidate.eventIndex,
	isSnapped: true
});

export const resolvePointFromBackground = (
	point: MeasurePoint,
	timestamp: number | undefined
): MeasurePointResolution => ({
	x: point.x,
	y: point.y,
	timestamp,
	isSnapped: false
});

export const clampLabelLeft = (
	centerX: number,
	labelWidth: number,
	overlayWidth: number
) => {
	if (labelWidth <= 0 || overlayWidth <= 0) {
		return centerX;
	}
	const proposedLeft = centerX - labelWidth / 2;
	const maxLabelLeft = overlayWidth - labelWidth - LABEL_GAP;

	return Math.max(LABEL_GAP, Math.min(proposedLeft, maxLabelLeft));
};

export const resolveVisibleHorizontalLine = (
	lineLeft: number,
	lineRight: number,
	stemX: number | undefined,
	overlayWidth: number
) => {
	const segmentLeft = Math.max(
		0,
		Math.min(lineLeft, stemX ?? lineLeft)
	);
	const segmentRight = Math.min(
		Math.max(0, overlayWidth),
		Math.max(lineRight, stemX ?? lineRight)
	);

	return {
		left: segmentLeft,
		width: Math.max(0, segmentRight - segmentLeft)
	};
};

export const getAxisPoints = (
	point: MeasurePointResolution | MeasureSnapCandidate | undefined
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
