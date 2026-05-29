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

import type {Unit} from '../types/timeline';

export const GRID = {
	left: 5,
	right: 5,
	bottom: 0
};

export const INITIAL_DATA_ZOOM = {
	start: 0,
	end: 100
};

export const MIN_TICK_INTERVAL = 1e-7; // 100ns tick step
export const MIN_ZOOM_WINDOW_TICKS = 4;
export const MIN_VALUE_SPAN =
	MIN_TICK_INTERVAL * MIN_ZOOM_WINDOW_TICKS;

export const PAN_PERCENTAGE = 0.2;
export const ZOOM_PERCENTAGE = 0.2;

export const TIMELINE_LIST_MIN_WIDTH = 120;
export const TIMELINE_LIST_DEFAULT_WIDTH = 262;
export const TIMELINE_DIAGRAM_MIN_WIDTH = 600;

export const EV_SOURCES_LIST_CONTENT_ID =
	'event-sources-list-content';
export const DIAGRAM_CHART_ROW_ID = 'timeline-diagram:chart-row';

export const EV_LIST_WIDTH_PROPERTY = '--ev-list-width';
export const DATA_TEST_S = 'data-test-dz-start';
export const DATA_TEST_E = 'data-test-dz-end';

export const TIMELINE_CONTAINER_ID = 'timeline-container';
export const DIAGRAM_CONTAINER_ID = 'timeline-diagram-container';
export const DATA_ROW_EMPHASIS_ATTR = 'data-row-emphasized';

export const UNITS_ID: Record<'S' | 'MS' | 'US' | 'NS', Unit> = {
	S: 's',
	MS: 'ms',
	US: 'us',
	NS: 'ns'
};

export const UNITS_LABEL: Record<Unit, string> = {
	s: 's',
	ms: 'ms',
	us: 'µs',
	ns: 'ns'
};

// Unit selection cutoffs expressed in seconds-per-pixel.
// example S: 1e-3 means switch to seconds when each pixel covers >= 1ms.
export const UNIT_SEC_PER_PX = {
	S: 1e-3,
	MS: 1e-6,
	US: 1e-9
} as const;

// Used when chart pixel width is not available yet to estimate seconds-per-pixel.
export const DEFAULT_VISIBLE_WIDTH_PX = 1000;

export const MEASURE_PHASE = {
	IDLE: 'idle',
	ARMED: 'armed',
	MEASURING: 'measuring',
	FIXED: 'fixed'
} as const;

export const SNAP_RADIUS_X = 40;
export const SNAP_RADIUS_Y = 40;
export const HEADER_HEIGHT = 28;
export const TIMESTAMP_LABEL_HEIGHT = 20;
export const HEADER_LABEL_TOP =
	(HEADER_HEIGHT - TIMESTAMP_LABEL_HEIGHT) / 2;
export const HORIZONTAL_LABEL_MARGIN = 6;
export const HORIZONTAL_LINE_HEIGHT = 2;
