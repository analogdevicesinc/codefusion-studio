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
} from '../../../../../common/constants/timeline';
import {
	formatTimeDiff,
	formatTimestamp,
	getAxisPoints,
	isLinePhase,
	isPreviewPhase
} from '../../../../../common/utils/measurement-tool';
import type {
	MeasurePhase,
	MeasurePoint,
	MeasureResolvedPoint,
	MeasureSnapCandidate,
	Unit,
	MeasurementState
} from '../../../../../common/types/timeline';
import type {EChartsType} from 'echarts/core';
import useLabelLayout from '../../../../../common/hooks/use-measure-label-layout';
import useMeasureLayoutViewport, {
	type LayoutViewport
} from '../../../../../common/hooks/use-measure-layout-viewport';
import type {SevEventSource} from '../../../../../common/types/events';

import MeasurementGuides from './measurement-guides';
import MeasurementLabels from './measurement-labels';
import MeasurementMarkers from './measurement-markers';

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
	eventSources: SevEventSource[];
	getChartInstance: (sourceId: string) => EChartsType | undefined;
}>;

/**
 * Repositions a resolved measurement point to the source row’s current Y value so committed markers stay aligned after row reorder or resize.
 */
const projectPointToCurrentRow = (
	point: MeasureResolvedPoint,
	viewport: LayoutViewport
): MeasureResolvedPoint => {
	if (point.sourceId === undefined || point.rowLocalY === undefined) {
		return point;
	}

	const rowTop = viewport.rowTopBySourceId.get(point.sourceId);
	if (rowTop === undefined) return point;

	const projectedY = rowTop - viewport.overlayTop + point.rowLocalY;
	if (projectedY === point.y) return point;

	return {...point, y: projectedY};
};

/**
 * Re-projects a committed point so its X tracks zoom/pan via the header chart
 * and its Y tracks the source row's live position after reorder or resize.
 */
const projectResolvedPoint = (
	point: MeasureResolvedPoint | undefined,
	chart: EChartsType | undefined,
	viewport: LayoutViewport
): MeasureResolvedPoint | undefined => {
	if (!point || point.timestamp === undefined || !chart) {
		return point;
	}

	const chartPx = chart.convertToPixel(
		{xAxisIndex: 0},
		point.timestamp
	);
	if (!Number.isFinite(chartPx)) return point;

	const projectedX =
		viewport.headerChartLeft - viewport.overlayLeft + chartPx;
	const pointWithProjectedX: MeasureResolvedPoint =
		projectedX === point.x ? point : {...point, x: projectedX};

	return projectPointToCurrentRow(pointWithProjectedX, viewport);
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
}: Omit<
	MeasurementOverlayProps,
	'headerChart' | 'eventSources' | 'getChartInstance'
>): MeasurementState {
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
	headerChart,
	eventSources,
	getChartInstance
}: MeasurementOverlayProps) {
	const overlayRef = useRef<HTMLDivElement>(null);
	const viewport = useMeasureLayoutViewport(
		overlayRef,
		headerChart,
		eventSources,
		getChartInstance
	);

	const projectedStartPoint = projectResolvedPoint(
		startResolvedPoint,
		headerChart,
		viewport
	);

	const projectedEndPoint =
		phase === MEASURE_PHASE.FIXED
			? projectResolvedPoint(endResolvedPoint, headerChart, viewport)
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
