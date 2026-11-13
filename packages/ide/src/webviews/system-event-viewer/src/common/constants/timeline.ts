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

export const GRID = {
	left: 5,
	right: 5,
	bottom: 0
};

export const GRID_TIME_LABEL = {
	fontSize: 11,
	fontWeight: 500,
	edgeInset: 2,
	left: GRID.left + 10,
	right: GRID.right + 10
};

export const INITIAL_DATA_ZOOM = {
	start: 0,
	end: 100
};

export const MIN_TICK_INTERVAL = 1e-7; // 100ns tick step
export const MIN_ZOOM_WINDOW_TICKS = 4;

export const PAN_PERCENTAGE = 0.2;
export const ZOOM_PERCENTAGE = 0.2;
export const DROP_ZONE_EDGE_RATIO = 0.25;

export const AUTO_SCROLL_EDGE_PX = 40; // Height of the top/bottom hot zone inside the diagram container
export const AUTO_SCROLL_MIN_SPEED_PX_PER_FRAME = 2;
export const AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME = 12;
export const AUTO_SCROLL_BOUNDARY_EPSILON_PX = 0.5;

export const TIMELINE_LIST_MIN_WIDTH = 120;
export const TIMELINE_LIST_DEFAULT_WIDTH = 262;
export const TIMELINE_DIAGRAM_MIN_WIDTH = 600;

export const DRAG_OFFSET_X = 18; // Takes into account 8px padding + 10px drag icon width

export const EV_SOURCES_LIST_CONTENT_ID =
	'event-sources-list-content';
export const DIAGRAM_CHART_ROW_ID = 'timeline-diagram:chart-row';

export const EV_LIST_WIDTH_PROPERTY = '--ev-list-width';
export const DATA_TEST_S = 'data-test-dz-start';
export const DATA_TEST_E = 'data-test-dz-end';

export const TIMELINE_CONTAINER_ID = 'timeline-container';
export const DIAGRAM_CONTAINER_ID = 'timeline-diagram-container';
export const DATA_ROW_EMPHASIS_ATTR = 'data-row-emphasized';
export const DATA_ROW_DRAGGED_ATTR = 'data-row-dragged';
export const DATA_ROW_DROP_TARGET_ATTR = 'data-row-drop-target';
export const TIMELINE_DRAG_ACTIVE = 'timeline-drag-active';
export const TIMELINE_MEASURE_ACTIVE = 'timeline-measure-active';
export const TIMELINE_DRAG_OUTSIDE = 'timeline-drag-outside';

export const MEASURE_PHASE = {
	IDLE: 'idle',
	ARMED: 'armed',
	MEASURING: 'measuring',
	FIXED: 'fixed'
} as const;

export const DROP_ZONE = {
	BEFORE: 'before',
	CENTER: 'center',
	AFTER: 'after',
	OUTSIDE: 'outside'
} as const;

export const SNAP_RADIUS_X = 40;
export const SNAP_RADIUS_Y = 40;
export const MEASUREMENT_HEADER_CHART_ID = 'measurement:headerChart';
export const HEADER_HEIGHT = 56;
export const LABEL_GAP = 2;
export const TIMESTAMP_LABEL_HEIGHT = 20;
export const HEADER_LABEL_TOP = HEADER_HEIGHT / 2 + LABEL_GAP * 2;
export const HORIZONTAL_LABEL_MARGIN = 6;
export const HORIZONTAL_LINE_HEIGHT = 2;
