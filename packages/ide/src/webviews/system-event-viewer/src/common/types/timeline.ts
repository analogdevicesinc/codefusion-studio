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

import type {MEASURE_PHASE} from '../constants/timeline';

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

export type Unit = 's' | 'ms' | 'us' | 'ns';
export type Base = {
	s: number;
	ms: number;
	us: number;
};

export type EventSourcesListHandle = {
	commitDraggedReorder: () => void;
	cancelDraggedReorder: () => void;
};

export type RowStateUpdate = {
	rowIndex: number;
	isHovered?: boolean;
	isActive?: boolean;
};

export type RowInteraction = {
	hoveredRowIndex?: number;
	activeRowIndex?: number;
};

export type MeasurePhase =
	(typeof MEASURE_PHASE)[keyof typeof MEASURE_PHASE];

export type MeasurePoint = {
	x: number;
	y: number;
};

export type MeasureResolvedPoint = MeasurePoint & {
	timestamp?: number;
	sourceId?: string;
	eventIndex?: number;
	isSnapped: boolean;
};

export type MeasureSnapCandidate = MeasurePoint & {
	timestamp: number;
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
	horizontalLabelTop: number | undefined;
	horizontalLineTop: number | undefined;
	verticalLabelTop: number;
}>;
