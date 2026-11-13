/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import type {DROP_ZONE, MEASURE_PHASE} from '../constants/timeline';
import type {EChartsType} from 'echarts/core';

export type HeaderChartHandle = Readonly<{
	chart: EChartsType;
	elapsedToPixel: (elapsedSeconds: number) => number | undefined;
	pixelToElapsed: (pixelX: number) => number | undefined;
}>;

export type DataZoom = {start: number; end: number};

export type DragType = 'left' | 'right' | 'range' | undefined;

export type DragState = {
	type: DragType;
	initialClientX: number;
	initialStart: number;
	initialEnd: number;
	windowSize: number;
	sliderRectWidth: number;
	active: boolean;
};

// ECharts dataZoom event type
// because echarts does not export it, we define our own here
export type DataZoomEvent = {
	type?: 'datazoom';
	start?: number;
	end?: number;
	startValue?: number | string | Date;
	endValue?: number | string | Date;
	batch?: Array<{
		type?: 'datazoom';
		start?: number;
		end?: number;
		startValue?: number | string | Date;
		endValue?: number | string | Date;
	}>;
};

export type Range = {min: number; max: number};

export type RowStateUpdate = {
	rowIndex: number;
	isHovered?: boolean;
	isActive?: boolean;
};

export type RowInteraction = {
	hoveredRowIndex?: number;
	activeRowIndex?: number;
	draggedRowIndexes?: number[];
};

export type DropZone = (typeof DROP_ZONE)[keyof typeof DROP_ZONE];

// Can be either a valid drop zone with a target node, or an "outside" drop zone
export type DropOutcome =
	| Readonly<{
			zone: Exclude<DropZone, typeof DROP_ZONE.OUTSIDE>;
			targetNodeId: string;
	  }>
	| Readonly<{zone: typeof DROP_ZONE.OUTSIDE}>;

export type ActiveDropZone = Exclude<
	DropZone,
	typeof DROP_ZONE.OUTSIDE
>;

export type DropTarget = Readonly<{
	zone: ActiveDropZone;
	targetNodeId: string;
	indicator?: Readonly<{
		clientY: number;
		depth: number;
	}>;
}>;

export type DragOverlayRow = Readonly<{
	id: string;
	name: string;
	height: number;
}>;

export type MeasurePhase =
	(typeof MEASURE_PHASE)[keyof typeof MEASURE_PHASE];

export type MeasurePoint = {
	x: number;
	y: number;
};

export type MeasurePointAnchor = Readonly<{
	rowId: string;
	rowLocalY: number;
	kind: 'chart' | 'group';
}>;

/** Whole seconds and bounded integer nanoseconds (0 <= nanoseconds < 1e9). */
export type TimeParts = Readonly<{
	seconds: number;
	nanoseconds: number;
}>;

/** A chart coordinate with exact elapsed parts for prepared time measurements. */
export type PreparedMeasurementValue = Readonly<{
	value: number;
	parts?: TimeParts;
}>;

export type MeasurePointResolution = MeasurePoint & {
	timestamp?: number;
	preparedValue?: PreparedMeasurementValue;
	rawTicks?: number;
	sourceId?: string;
	eventIndex?: number;
	isSnapped: boolean;
};

export type MeasureResolvedPoint = MeasurePointResolution & {
	anchor: MeasurePointAnchor;
};

export type MeasureSnapCandidate = MeasurePoint & {
	timestamp: number;
	rawTicks?: number;
	sourceId: string;
	eventIndex: number;
};

export type MeasurementState = Readonly<{
	isFixedPhase: boolean;
	cursorGuide: MeasurePoint | undefined;
	startLine: MeasurePoint | undefined;
	endLine: MeasurePoint | undefined;
	horizontalLine: HorizontalLine | undefined;
	previewMarkerPoint: MeasurePoint | undefined;
	startMarkerSnapped: boolean;
	endMarkerPoint: MeasurePoint | undefined;
	endMarkerSnapped: boolean;
	cursorLabelText: string | undefined;
	startLabelText: string | undefined;
	endLabelText: string | undefined;
	horizontalDeltaText: string | undefined;
}>;

type HorizontalLine = Readonly<{
	left: number;
	top: number;
	width: number;
}>;

export type MeasureLabelLayout = Readonly<{
	cursorLabelRef: React.RefObject<HTMLDivElement>;
	startLabelRef: React.RefObject<HTMLDivElement>;
	endLabelRef: React.RefObject<HTMLDivElement>;
	horizontalLabelRef: React.RefObject<HTMLDivElement>;
	cursorLabelLeft: number | undefined;
	startLabelLeft: number | undefined;
	endLabelLeft: number | undefined;
	horizontalLabelLeft: number | undefined;
	horizontalLineLeft: number | undefined;
	horizontalLineWidth: number | undefined;
	deltaStemLeft: number | undefined;
}>;

export type RowBounds = Readonly<{
	canSnap: boolean;
	top: number;
	height: number;
}>;
