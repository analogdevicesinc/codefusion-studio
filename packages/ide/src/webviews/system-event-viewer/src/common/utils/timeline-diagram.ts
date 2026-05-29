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

import type {MutableRefObject, RefObject} from 'react';
import type {EChartsType} from 'echarts/core';
import type {SevEventSource} from '../types/events';
import {
	PAN_PERCENTAGE,
	INITIAL_DATA_ZOOM,
	EV_LIST_WIDTH_PROPERTY,
	DIAGRAM_CHART_ROW_ID,
	DATA_ROW_EMPHASIS_ATTR
} from '../constants/timeline';
import type {
	DataZoom,
	DataZoomEvent,
	RowInteraction,
	RowStateUpdate
} from '../types/timeline';

export function formatTimestampTooltip(
	eventSource: SevEventSource,
	dataIndex: number,
	colors: Record<string, string>
) {
	const timestamp = eventSource.timestamps.find(
		item => item.id === dataIndex
	);

	return `
		<div style="font-weight: 700; color: ${colors.editorWidgetForeground}; font-size: 13px;">${eventSource.name}</div>
		<div style="font-weight: 600; color: ${colors.descriptionForeground}; font-size: 11px;">${timestamp?.name}</div>
		<div style="font-weight: 600; color: ${colors.descriptionForeground}; font-size: 11px;">${timestamp?.value}s</div>
		<div style="font-weight: 600; color: ${colors.descriptionForeground}; font-size: 11px;">${timestamp?.description}</div>
	`;
}

export const setChartToWindow = (id: string, instance: any) => {
	// Test-only exposure
	const w = window as any;
	w.__timelineEcharts = w.__timelineEcharts || new Map<string, any>();

	w.__timelineEcharts.set(id, instance);
};

export const deleteChartFromWindow = (id: string) => {
	const w = window as any;
	if (w.__timelineEcharts) w.__timelineEcharts.delete(id);
};

export const addWheelListener = (instance: EChartsType) => {
	const dom = instance.getDom?.();
	const canvas = dom?.querySelector('canvas');

	if (!canvas) {
		return () => {
			void 0; // No-op cleanup
		};
	}

	// Handler for wheel events
	// 1. CTRL wheel or pinch trackpad => zoom (let ECharts handle it)
	// 2. wheel or vertical trackpad => scroll container
	// 3. SHIFT wheel or horizontal trackpad => pan timeline
	const onWheel = (ev: WheelEvent) => {
		if (ev.ctrlKey) return;

		const deltaX = ev.deltaX || 0;
		const deltaY = ev.deltaY || 0;
		// If Shift is held and deltaX is 0, treat deltaY as horizontal
		const horizontalDelta =
			ev.shiftKey && Math.abs(deltaX) === 0 ? deltaY : deltaX;
		const isHorizontal =
			ev.shiftKey || Math.abs(horizontalDelta) > Math.abs(deltaY);

		if (!isHorizontal) {
			ev.stopImmediatePropagation();

			return;
		}

		const option = instance.getOption() as any;
		const dataZoom: DataZoom =
			option?.dataZoom?.[0] || INITIAL_DATA_ZOOM;

		const windowSpan = dataZoom.end - dataZoom.start;
		if (windowSpan <= 0) return;

		// +1 pans right, -1 pans left
		const direction = Math.sign(horizontalDelta);
		const intensity = Math.min(1, Math.abs(horizontalDelta) / 100);
		const shift = direction * windowSpan * PAN_PERCENTAGE * intensity;

		let start = dataZoom.start + shift;
		let end = dataZoom.end + shift;

		if (start < 0) {
			end -= start;
			start = 0;
		}

		if (end > 100) {
			const overflow = end - 100;
			start -= overflow;
			end = 100;
		}

		dispatchDataZoomAction(instance, {start, end});
	};

	canvas.addEventListener('wheel', onWheel, {
		capture: true,
		passive: false
	});

	return () => {
		canvas.removeEventListener('wheel', onWheel);
	};
};

export const computeNewDataZoomValues = (
	params: DataZoomEvent
): DataZoom => {
	const data = params?.batch?.[0] ?? params;
	const start = typeof data?.start === 'number' ? data?.start : 0;
	const end = typeof data?.end === 'number' ? data?.end : 100;

	return {start, end};
};

/**
 * Single point to dispatch dataZoom action to an ECharts instance
 * @param instance
 * @param dataZoom
 */
export const dispatchDataZoomAction = (
	instance: EChartsType,
	dataZoom: DataZoom
) => {
	instance.dispatchAction({
		type: 'dataZoom',
		start: dataZoom.start,
		end: dataZoom.end,
		silent: true
	});
};

// Helpers to manage the floating card on drag and drop

/**
 * Get the width of the event sources list container.
 * @param container The container element.
 * @returns The width of the event sources list container.
 */
export const getListWidth = (container: HTMLDivElement) => {
	const host = container.parentElement;
	if (!host) return 0;

	const val = getComputedStyle(host).getPropertyValue(
		EV_LIST_WIDTH_PROPERTY
	);
	const parsed = parseFloat(val || '0');

	return Number.isFinite(parsed) ? parsed : 0;
};

export const setTransparentDragImage = (e: React.DragEvent) => {
	const canvas = document.createElement('canvas');
	canvas.width = 1;
	canvas.height = 1;

	const img = new Image();
	img.src = canvas.toDataURL();

	e.dataTransfer?.setDragImage(img, 0, 0);
};

export const getChartSnapshot = (evSourceId: string) => {
	const rowEl = document.querySelector(
		`[data-test='${DIAGRAM_CHART_ROW_ID}:${evSourceId}']`
	);
	const rowRect = rowEl?.getBoundingClientRect();
	const rowHeight = rowRect?.height ?? 0;

	const canvas =
		rowEl?.querySelector('canvas') ??
		rowEl?.querySelector('div canvas');

	let canvasSrc;

	if (canvas instanceof HTMLCanvasElement) {
		canvasSrc = canvas.toDataURL('image/png');
	}

	return {canvasSrc, rowHeight};
};

// Helpers to manage the active/hovered state of the rows (list item and chart rows)

export const onRowStateChange = (
	{rowIndex, isHovered, isActive}: RowStateUpdate,
	rowInteractionRef: MutableRefObject<RowInteraction>,
	diagramContainerRef: RefObject<HTMLDivElement>
) => {
	const prevHovered = rowInteractionRef.current.hoveredRowIndex;
	const prevActive = rowInteractionRef.current.activeRowIndex;

	if (isHovered) {
		rowInteractionRef.current.hoveredRowIndex = rowIndex;
	} else if (
		isHovered === false &&
		rowInteractionRef.current.hoveredRowIndex === rowIndex
	) {
		rowInteractionRef.current.hoveredRowIndex = undefined;
	}

	if (isActive) {
		rowInteractionRef.current.activeRowIndex = rowIndex;
	} else if (
		isActive === false &&
		rowInteractionRef.current.activeRowIndex === rowIndex
	) {
		rowInteractionRef.current.activeRowIndex = undefined;
	}

	const nextHovered = rowInteractionRef.current.hoveredRowIndex;
	const nextActive = rowInteractionRef.current.activeRowIndex;

	const affectedIndexes = new Set<number>([rowIndex]);

	if (prevHovered !== undefined) affectedIndexes.add(prevHovered);
	if (prevActive !== undefined) affectedIndexes.add(prevActive);
	if (nextHovered !== undefined) affectedIndexes.add(nextHovered);
	if (nextActive !== undefined) affectedIndexes.add(nextActive);

	affectedIndexes.forEach(index => {
		applyRowEmphasis(index, rowInteractionRef, diagramContainerRef);
	});
};

export const resetRowInteraction = (
	rowInteractionRef: MutableRefObject<RowInteraction>,
	diagramContainerRef: RefObject<HTMLDivElement>
) => {
	const root = diagramContainerRef.current;
	const {hoveredRowIndex, activeRowIndex} = rowInteractionRef.current;

	if (root) {
		[hoveredRowIndex, activeRowIndex].forEach(index => {
			root
				.querySelectorAll<HTMLElement>(`[data-row-index='${index}']`)
				.forEach(el => {
					el.removeAttribute(DATA_ROW_EMPHASIS_ATTR);
				});
		});
	}

	rowInteractionRef.current.hoveredRowIndex = undefined;
	rowInteractionRef.current.activeRowIndex = undefined;
};

const applyRowEmphasis = (
	rowIndex: number,
	rowInteractionRef: React.MutableRefObject<RowInteraction>,
	diagramContainerRef: RefObject<HTMLDivElement>
) => {
	const {hoveredRowIndex, activeRowIndex} = rowInteractionRef.current;

	const isEmphasized =
		hoveredRowIndex === rowIndex || activeRowIndex === rowIndex;

	setRowEmphasisByIndex(rowIndex, isEmphasized, diagramContainerRef);
};

const setRowEmphasisByIndex = (
	rowIndex: number,
	isEmphasized: boolean,
	diagramContainerRef: RefObject<HTMLDivElement>
) => {
	const root = diagramContainerRef.current;
	if (!root) return;

	const elems = root.querySelectorAll<HTMLElement>(
		`[data-row-index='${rowIndex}']`
	);

	elems.forEach(el => {
		if (isEmphasized) {
			el.setAttribute(DATA_ROW_EMPHASIS_ATTR, 'true');
		} else {
			el.removeAttribute(DATA_ROW_EMPHASIS_ATTR);
		}
	});
};
