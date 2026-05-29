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

import {useRef} from 'react';

import {
	MEASURE_PHASE,
	UNITS_ID
} from '../../../common/constants/timeline';
import {
	formatTimeDiff,
	formatTimestamp,
	getAxisPoints,
	isLinePhase,
	isPreviewPhase
} from '../../../common/utils/measurement-tool';
import type {
	MeasurePhase,
	MeasurePoint,
	MeasureResolvedPoint,
	MeasureSnapCandidate,
	Unit,
	MeasurementState
} from '../../../common/types/timeline';
import type {EChartsType} from 'echarts/core';
import useLabelLayout from '../../../common/hooks/use-measure-label-layout';
import useMeasureLayoutViewport from '../../../common/hooks/use-measure-layout-viewport';

import MeasurementGuides from './components/measurement-tool/measurement-guides';
import MeasurementLabels from './components/measurement-tool/measurement-labels';
import MeasurementMarkers from './components/measurement-tool/measurement-markers';

import styles from './measurement-overlay.module.scss';

type MeasurementOverlayProps = Readonly<{
	phase: MeasurePhase;
	unit: Unit;
	cursorPoint: MeasurePoint | undefined;
	cursorTimestamp: number | undefined;
	previewSnapCandidate: MeasureSnapCandidate | undefined;
	startResolvedPoint: MeasureResolvedPoint | undefined;
	startTimestamp: number | undefined;
	endResolvedPoint: MeasureResolvedPoint | undefined;
	endTimestamp: number | undefined;
	headerChart: EChartsType | undefined;
}>;

/**
 * This ensures that the guides, labels, and markers are accurately positioned on the overlay
 * when zooming or panning
 */
const projectResolvedPoint = (
	point: MeasureResolvedPoint | undefined,
	chart: EChartsType | undefined,
	headerChartLeft: number,
	overlayLeft: number
): MeasureResolvedPoint | undefined => {
	if (!point || point.timestamp === undefined || !chart) {
		return point;
	}

	const chartPx = chart.convertToPixel(
		{xAxisIndex: 0},
		point.timestamp
	);

	if (!Number.isFinite(chartPx)) return point;

	const projectedX = headerChartLeft - overlayLeft + chartPx;

	if (projectedX === point.x) return point;

	return {
		...point,
		x: projectedX
	};
};

// eslint-disable-next-line complexity
function buildOverlayState({
	phase,
	unit,
	cursorPoint,
	cursorTimestamp,
	previewSnapCandidate,
	startResolvedPoint,
	startTimestamp,
	endResolvedPoint,
	endTimestamp
}: Omit<MeasurementOverlayProps, 'headerChart'>): MeasurementState {
	// Measurement phase state
	const previewPhase = isPreviewPhase(phase);
	const linePhase = isLinePhase(phase);
	const isFixedPhase = phase === MEASURE_PHASE.FIXED;

	// Points state
	const previewSnapPoint = getAxisPoints(previewSnapCandidate);
	const startPoint = getAxisPoints(startResolvedPoint);
	const endPoint = getAxisPoints(endResolvedPoint);

	// Guide and line state
	const cursorGuide = previewPhase ? cursorPoint : undefined;
	const startLine = linePhase ? startPoint : undefined;
	let endLine;
	let horizontalLine;

	if (linePhase) {
		endLine = isFixedPhase ? endPoint : cursorPoint;
	}

	const endGuideTimestamp = isFixedPhase
		? endTimestamp
		: cursorTimestamp;

	if (startLine && endLine) {
		horizontalLine = {
			left: Math.min(startLine.x, endLine.x),
			top: endLine.y,
			width: Math.abs(endLine.x - startLine.x)
		};
	}

	const cursorTimestampUnit = previewSnapCandidate
		? UNITS_ID.NS
		: unit;
	const startTimestampUnit = startResolvedPoint?.isSnapped
		? UNITS_ID.NS
		: unit;
	const endTimestampUnit = endResolvedPoint?.isSnapped
		? UNITS_ID.NS
		: unit;
	const deltaUnit =
		startResolvedPoint?.isSnapped &&
		(endResolvedPoint?.isSnapped ?? previewSnapCandidate)
			? UNITS_ID.NS
			: unit;

	return {
		isFixedPhase,
		cursorGuide,
		startLine,
		endLine,
		horizontalLine,
		previewMarkerPoint: previewPhase ? previewSnapPoint : undefined,
		startMarkerSnapped:
			linePhase && startResolvedPoint?.isSnapped === true,
		endMarkerPoint: isFixedPhase ? endPoint : undefined,
		endMarkerSnapped:
			isFixedPhase && endResolvedPoint?.isSnapped === true,
		cursorLabelText: previewPhase
			? formatTimestamp(cursorTimestamp, cursorTimestampUnit)
			: undefined,
		startLabelText: startLine
			? formatTimestamp(startTimestamp, startTimestampUnit)
			: undefined,
		endLabelText:
			isFixedPhase && endLine
				? formatTimestamp(endGuideTimestamp, endTimestampUnit)
				: undefined,
		horizontalDeltaText: linePhase
			? formatTimeDiff(startTimestamp, endGuideTimestamp, deltaUnit)
			: undefined
	};
}

/**
 * MeasurementOverlay component is responsible with the visual representation
 * and with composing the overlay state and the layout for the guides, labels, and markers.
 * It displays guides, labels, and markers based on the current measurement state.
 */
function MeasurementOverlay({
	phase,
	unit,
	cursorPoint,
	cursorTimestamp,
	previewSnapCandidate,
	startResolvedPoint,
	startTimestamp,
	endResolvedPoint,
	endTimestamp,
	headerChart
}: MeasurementOverlayProps) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const viewport = useMeasureLayoutViewport(overlayRef, headerChart);

	const projectedStartPoint = projectResolvedPoint(
		startResolvedPoint,
		headerChart,
		viewport.headerChartLeft,
		viewport.overlayLeft
	);

	const projectedEndPoint =
		phase === MEASURE_PHASE.FIXED
			? projectResolvedPoint(
					endResolvedPoint,
					headerChart,
					viewport.headerChartLeft,
					viewport.overlayLeft
				)
			: endResolvedPoint;

	const state = buildOverlayState({
		phase,
		unit,
		cursorPoint,
		cursorTimestamp,
		previewSnapCandidate,
		startResolvedPoint: projectedStartPoint,
		startTimestamp,
		endResolvedPoint: projectedEndPoint,
		endTimestamp
	});

	const layout = useLabelLayout(state, viewport);

	return (
		<div
			ref={overlayRef}
			className={styles.measureOverlay}
			data-test='timeline-diagram:measurement-overlay'
		>
			<MeasurementGuides state={state} layout={layout} />
			<MeasurementLabels state={state} layout={layout} />
			<MeasurementMarkers state={state} />
		</div>
	);
}

export default MeasurementOverlay;
