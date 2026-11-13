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

import {MEASURE_PHASE} from '../../../../../common/constants/timeline';
import {
	getAxisPoints,
	isLinePhase,
	isPreviewPhase
} from '../../../../../common/utils/measurement-tool';
import {
	formatTimeDiff,
	formatTimestampLabel,
	type TimeMode
} from '../../../../../common/utils/time-mode-formatters';
import type {
	HeaderChartHandle,
	MeasurePhase,
	MeasurePoint,
	MeasureResolvedPoint,
	MeasureSnapCandidate,
	MeasurementState,
	PreparedMeasurementValue
} from '../../../../../common/types/timeline';
import useLabelLayout from '../../../../../common/hooks/use-measure-label-layout';
import type {LayoutViewport} from '../../../../../common/hooks/use-measure-layout-viewport';

import MeasurementGuides from './measurement-guides';
import MeasurementLabels from './measurement-labels';
import MeasurementMarkers from './measurement-markers';
import MeasurementDelta from './measurement-delta';

import styles from './measurement-overlay.module.scss';

type MeasurementOverlayProps = Readonly<{
	phase: MeasurePhase;
	timeMode: TimeMode;
	cursorPoint: MeasurePoint | undefined;
	cursorTimestamp: number | undefined;
	cursorPreparedValue?: PreparedMeasurementValue;
	previewSnapCandidate: MeasureSnapCandidate | undefined;
	startResolvedPoint: MeasureResolvedPoint | undefined;
	startTimestamp: number | undefined;
	endResolvedPoint: MeasureResolvedPoint | undefined;
	endTimestamp: number | undefined;
	headerChart: HeaderChartHandle | undefined;
	visibleAnchorRowIds: ReadonlyMap<string, string>;
	visibleChartRowIds: ReadonlySet<string>;
	viewport: LayoutViewport;
}>;

type MeasurementProjection = Readonly<{
	chart: HeaderChartHandle | undefined;
	viewport: LayoutViewport;
	visibleAnchorRowIds: ReadonlyMap<string, string>;
	visibleChartRowIds: ReadonlySet<string>;
}>;

/**
 * Keeps committed points aligned to the header chart or row after scrolling, reorder, or resize.
 */
const projectPointToCurrentAnchor = (
	point: MeasureResolvedPoint,
	viewport: LayoutViewport,
	visibleAnchorRowIds: ReadonlyMap<string, string>,
	visibleChartRowIds: ReadonlySet<string>
): MeasureResolvedPoint | undefined => {
	const visibleRowId =
		visibleAnchorRowIds.get(point.anchor.rowId) ?? point.anchor.rowId;

	if (
		point.anchor.kind === 'chart' &&
		!visibleChartRowIds.has(visibleRowId)
	) {
		return undefined;
	}

	const rowBounds = viewport.rowBoundsByRowId.get(visibleRowId);
	if (!rowBounds) return undefined;

	const projectedY = rowBounds.top + point.anchor.rowLocalY;
	if (projectedY === point.y) return point;

	return {...point, y: projectedY};
};

/**
 * Re-projects a committed point so its X tracks zoom/pan via the header chart
 * and its Y tracks the source row's live position after reorder or resize.
 */
const projectResolvedPoint = (
	point: MeasureResolvedPoint | undefined,
	{
		chart,
		viewport,
		visibleAnchorRowIds,
		visibleChartRowIds
	}: MeasurementProjection
): MeasureResolvedPoint | undefined => {
	if (!point) return undefined;

	const pointWithProjectedY = projectPointToCurrentAnchor(
		point,
		viewport,
		visibleAnchorRowIds,
		visibleChartRowIds
	);

	if (
		!pointWithProjectedY ||
		pointWithProjectedY.timestamp === undefined ||
		!chart
	) {
		return pointWithProjectedY;
	}

	const chartPx = chart.elapsedToPixel(pointWithProjectedY.timestamp);
	if (chartPx === undefined || !Number.isFinite(chartPx)) {
		return pointWithProjectedY;
	}

	const projectedX =
		viewport.headerChartLeft - viewport.overlayLeft + chartPx;

	return projectedX === pointWithProjectedY.x
		? pointWithProjectedY
		: {...pointWithProjectedY, x: projectedX};
};

// eslint-disable-next-line complexity
function buildOverlayState({
	phase,
	timeMode,
	cursorPoint,
	cursorTimestamp,
	cursorPreparedValue,
	previewSnapCandidate,
	startResolvedPoint,
	startTimestamp,
	endResolvedPoint,
	endTimestamp
}: Omit<
	MeasurementOverlayProps,
	| 'headerChart'
	| 'visibleAnchorRowIds'
	| 'visibleChartRowIds'
	| 'viewport'
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

	const cursorValue = previewSnapCandidate
		? cursorTimestamp
		: (cursorPreparedValue ?? cursorTimestamp);
	const startValue = startResolvedPoint?.isSnapped
		? startTimestamp
		: (startResolvedPoint?.preparedValue ?? startTimestamp);
	const fixedEndValue = endResolvedPoint?.isSnapped
		? endTimestamp
		: (endResolvedPoint?.preparedValue ?? endTimestamp);
	const endValue = isFixedPhase ? fixedEndValue : cursorValue;

	if (startLine && endLine) {
		horizontalLine = {
			left: Math.min(startLine.x, endLine.x),
			top: endLine.y,
			width: Math.abs(endLine.x - startLine.x)
		};
	}

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
			? formatTimestampLabel(
					cursorValue,
					timeMode,
					previewSnapCandidate?.rawTicks
				)
			: undefined,
		startLabelText: startLine
			? formatTimestampLabel(
					startValue,
					timeMode,
					startResolvedPoint?.rawTicks
				)
			: undefined,
		endLabelText:
			isFixedPhase && endLine
				? formatTimestampLabel(
						endValue,
						timeMode,
						endResolvedPoint?.rawTicks
					)
				: undefined,
		horizontalDeltaText: linePhase
			? formatTimeDiff(
					startValue,
					endValue,
					timeMode,
					startResolvedPoint?.rawTicks,
					isFixedPhase
						? endResolvedPoint?.rawTicks
						: previewSnapCandidate?.rawTicks
				)
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
	timeMode,
	cursorPoint,
	cursorTimestamp,
	cursorPreparedValue,
	previewSnapCandidate,
	startResolvedPoint,
	startTimestamp,
	endResolvedPoint,
	endTimestamp,
	headerChart,
	visibleAnchorRowIds,
	visibleChartRowIds,
	viewport
}: MeasurementOverlayProps) {
	const projection = {
		chart: headerChart,
		viewport,
		visibleAnchorRowIds,
		visibleChartRowIds
	};
	const projectedStartPoint = projectResolvedPoint(
		startResolvedPoint,
		projection
	);

	const projectedEndPoint =
		phase === MEASURE_PHASE.FIXED
			? projectResolvedPoint(endResolvedPoint, projection)
			: endResolvedPoint;

	const state = buildOverlayState({
		phase,
		timeMode,
		cursorPoint,
		cursorTimestamp,
		cursorPreparedValue,
		previewSnapCandidate,
		startResolvedPoint: projectedStartPoint,
		startTimestamp,
		endResolvedPoint: projectedEndPoint,
		endTimestamp
	});

	const layout = useLabelLayout(state, viewport);

	return (
		<>
			<div className={styles.markerOverlay}>
				<MeasurementMarkers state={state} />
			</div>
			<div
				className={styles.measureOverlay}
				data-test='timeline-diagram:measurement-overlay'
			>
				<MeasurementGuides state={state} />
				<MeasurementLabels state={state} layout={layout} />
				<MeasurementDelta state={state} layout={layout} />
			</div>
		</>
	);
}

export default MeasurementOverlay;
