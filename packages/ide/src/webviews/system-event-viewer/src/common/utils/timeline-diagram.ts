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
import type {SevEventSource, TimelineRow} from '../types/events';
import type {TimeMode} from './time-mode-formatters';
import {formatTimestampLabel} from './time-mode-formatters';
import {
	PAN_PERCENTAGE,
	INITIAL_DATA_ZOOM,
	DIAGRAM_CHART_ROW_ID,
	DATA_ROW_EMPHASIS_ATTR,
	DATA_ROW_DRAGGED_ATTR,
	TIMELINE_DRAG_ACTIVE,
	TIMELINE_MEASURE_ACTIVE,
	DROP_ZONE_EDGE_RATIO,
	DROP_ZONE,
	TIMELINE_DRAG_OUTSIDE,
	DATA_ROW_DROP_TARGET_ATTR,
	AUTO_SCROLL_EDGE_PX,
	AUTO_SCROLL_MIN_SPEED_PX_PER_FRAME,
	AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME,
	HEADER_HEIGHT,
	AUTO_SCROLL_BOUNDARY_EPSILON_PX
} from '../constants/timeline';
import type {
	DataZoom,
	DataZoomEvent,
	RowInteraction,
	RowStateUpdate,
	DropTarget,
	ActiveDropZone,
	HeaderChartHandle
} from '../types/timeline';
import {
	DEPTH_PADDING,
	ROOT_PADDING,
	ROW_SELECTOR
} from '../constants/events';

const escapeHtml = (value: string | number | undefined): string => {
	const text = String(value ?? '');

	return text.replace(/[&<>"']/g, character => {
		switch (character) {
			case '&':
				return '&amp;';
			case '<':
				return '&lt;';
			case '>':
				return '&gt;';
			case '"':
				return '&quot;';
			case "'":
				return '&#39;';
			default:
				return character;
		}
	});
};

export function formatTimestampTooltip(
	eventSource: SevEventSource,
	timeMode: TimeMode,
	dataIndex: number,
	colors: Record<string, string>
) {
	const timestamp = eventSource.timestamps[dataIndex];

	const eventName = escapeHtml(
		timestamp?.evSourceName ?? eventSource.name
	);
	const timestampValue = escapeHtml(
		formatTimestampLabel(
			timestamp?.value,
			timeMode,
			timestamp?.rawTicks
		)
	);
	const timestampDescription = escapeHtml(timestamp?.description);

	return `
		<div data-test="timeline-diagram:timestamp-tooltip">
			<div style="font-weight: 700; color: ${colors.editorWidgetForeground}; font-size: 13px;">${eventName}</div>
			<div style="font-weight: 600; color: ${colors.descriptionForeground}; font-size: 11px;">${timestampValue}</div>
			<div style="font-weight: 600; color: ${colors.descriptionForeground}; font-size: 11px;">${timestampDescription}</div>
		</div>
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

export const getChartSnapshot = (evSourceId: string) => {
	const rowEl = Array.from(
		document.querySelectorAll<HTMLElement>(ROW_SELECTOR)
	).find(
		row =>
			row.dataset.rowId === evSourceId &&
			row.dataset.test?.startsWith(`${DIAGRAM_CHART_ROW_ID}:`)
	);

	const canvas =
		rowEl?.querySelector('canvas') ??
		rowEl?.querySelector('div canvas');

	let canvasSrc;
	let canvasWidth = 0;

	if (canvas instanceof HTMLCanvasElement) {
		canvasSrc = canvas.toDataURL('image/png');
		canvasWidth = canvas.getBoundingClientRect().width;
	}

	return {canvasSrc, canvasWidth};
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
	const {
		hoveredRowIndex,
		activeRowIndex,
		draggedRowIndexes = []
	} = rowInteractionRef.current;

	if (root) {
		[hoveredRowIndex, activeRowIndex, ...draggedRowIndexes].forEach(
			index => {
				if (index === undefined) return;

				root
					.querySelectorAll<HTMLElement>(
						`[data-row-index='${index}']`
					)
					.forEach(el => {
						el.removeAttribute(DATA_ROW_EMPHASIS_ATTR);
						el.removeAttribute(DATA_ROW_DRAGGED_ATTR);
					});
			}
		);
	}

	rowInteractionRef.current.hoveredRowIndex = undefined;
	rowInteractionRef.current.activeRowIndex = undefined;
	rowInteractionRef.current.draggedRowIndexes = undefined;
};

export const clearAllRowEmphasis = (
	root: HTMLElement | undefined
) => {
	if (!root) return;

	root
		.querySelectorAll<HTMLElement>(`[${DATA_ROW_EMPHASIS_ATTR}]`)
		.forEach(el => {
			el.removeAttribute(DATA_ROW_EMPHASIS_ATTR);
		});
};

export const clearAllRowDragged = (
	root: HTMLDivElement | undefined
) => {
	if (!root) return;

	root
		.querySelectorAll<HTMLElement>(`[${DATA_ROW_DRAGGED_ATTR}]`)
		.forEach(el => {
			el.removeAttribute(DATA_ROW_DRAGGED_ATTR);
		});
};

export const applyRowsDragged = (
	rowIndexes: number[],
	rowInteractionRef: MutableRefObject<RowInteraction>,
	diagramContainerRef: RefObject<HTMLDivElement>
) => {
	const root = diagramContainerRef.current;
	if (!root) return;

	rowInteractionRef.current.draggedRowIndexes = rowIndexes;

	rowIndexes.forEach(rowIndex => {
		root
			.querySelectorAll<HTMLElement>(`[data-row-index='${rowIndex}']`)
			.forEach(el => {
				el.setAttribute(DATA_ROW_DRAGGED_ATTR, 'true');
			});
	});
};

const applyRowEmphasis = (
	rowIndex: number,
	rowInteractionRef: React.MutableRefObject<RowInteraction>,
	diagramContainerRef: RefObject<HTMLDivElement>
) => {
	const body = diagramContainerRef.current?.ownerDocument?.body;
	const isInteractionSuppressed =
		(body?.classList.contains(TIMELINE_DRAG_ACTIVE) ?? false) ||
		(body?.classList.contains(TIMELINE_MEASURE_ACTIVE) ?? false);

	if (isInteractionSuppressed) return;

	const {hoveredRowIndex, activeRowIndex} = rowInteractionRef.current;

	const isEmphasized =
		hoveredRowIndex === rowIndex || activeRowIndex === rowIndex;

	setRowEmphasisByIndex(rowIndex, isEmphasized, diagramContainerRef);
};

const getDropZone = (
	clientY: number,
	rowRect: DOMRect
): ActiveDropZone => {
	const rowOffset = clientY - rowRect.top;
	const rowRatio = rowOffset / rowRect.height;

	if (rowRatio < DROP_ZONE_EDGE_RATIO) return DROP_ZONE.BEFORE;
	if (rowRatio <= 1 - DROP_ZONE_EDGE_RATIO) return DROP_ZONE.CENTER;

	return DROP_ZONE.AFTER;
};

const clearDropIndicator = (
	dropIndicatorRef: RefObject<HTMLDivElement>
) => {
	const indicator = dropIndicatorRef.current;
	if (!indicator) return;

	indicator.hidden = true;
	indicator.style.removeProperty('transform');
	indicator.style.removeProperty('inset-inline-start');
};

const applyDropIndicator = (
	dropIndicatorRef: RefObject<HTMLDivElement>,
	top: number,
	inlineStart: number
) => {
	const indicator = dropIndicatorRef.current;
	if (!indicator) return;

	indicator.hidden = false;
	indicator.style.transform = `translateY(${top}px)`;
	indicator.style.insetInlineStart = `${inlineStart}px`;
};

const getDropIndicatorInlineStart = (depth: number): number =>
	depth === 0 ? 0 : ROOT_PADDING + depth * DEPTH_PADDING;

const clearDropTargetHighlight = (root: HTMLElement | undefined) => {
	if (!root) return;

	root
		.querySelectorAll<HTMLElement>(`[${DATA_ROW_DROP_TARGET_ATTR}]`)
		.forEach(row => {
			row.removeAttribute(DATA_ROW_DROP_TARGET_ATTR);
		});
};

const applyDropTargetHighlight = (
	root: HTMLElement,
	targetNodeId: string
) => {
	const currentTarget = root.querySelector<HTMLElement>(
		`[${DATA_ROW_DROP_TARGET_ATTR}]`
	);

	if (currentTarget?.dataset.rowId === targetNodeId) return;

	clearDropTargetHighlight(root);

	root.querySelectorAll<HTMLElement>(ROW_SELECTOR).forEach(row => {
		if (row.dataset.rowId === targetNodeId) {
			row.setAttribute(DATA_ROW_DROP_TARGET_ATTR, 'true');
		}
	});
};

/** Clears both edge and center-zone drop feedback. */
export const clearDropFeedback = (
	diagramContainerRef: RefObject<HTMLDivElement>,
	dropIndicatorRef: RefObject<HTMLDivElement>
) => {
	clearDropIndicator(dropIndicatorRef);
	clearDropTargetHighlight(diagramContainerRef.current ?? undefined);
};

const clampDropIndicatorTop = (
	rawTop: number,
	indicatorHeight: number,
	containerHeight: number
) => {
	const maxTop = Math.max(containerHeight - indicatorHeight, 0);

	return Math.min(Math.max(rawTop, 0), maxTop);
};

/**
 * Finds a row or root-append strip at the pointer coordinates.
 * @param root The root element to search within.
 * @param clientX The X coordinate of the mouse pointer.
 * @param clientY The Y coordinate of the mouse pointer.
 * @returns The drop element at the given point, or undefined if none is found.
 */
const findRowAtPoint = (
	root: HTMLElement,
	clientX: number,
	clientY: number
): HTMLElement | undefined => {
	const list = root.ownerDocument.elementsFromPoint(clientX, clientY);

	for (const elem of list) {
		const row = elem.closest<HTMLElement>(
			'[data-row-index], [data-root-drop-target]'
		);

		if (row && root.contains(row)) return row;
	}

	return undefined;
};

/**
 * Resolves the move destination and feedback geometry beneath the pointer.
 * An expanded group's lower zone inserts before its first child.
 * The bottom strip appends after the last root node.
 * Returns undefined when there is no valid drop element beneath the pointer.
 */
export const resolveDropTarget = (
	client: {x: number; y: number},
	root: HTMLElement,
	draggedNodeId: string,
	rows: readonly TimelineRow[]
): DropTarget | undefined => {
	const targetRow = findRowAtPoint(root, client.x, client.y);
	const rootTargetNodeId = targetRow?.dataset.rootDropTarget;
	const targetNodeId = rootTargetNodeId ?? targetRow?.dataset.rowId;

	if (
		!targetRow ||
		!targetNodeId ||
		targetNodeId === draggedNodeId ||
		targetRow.hasAttribute(DATA_ROW_DRAGGED_ATTR)
	) {
		return undefined;
	}

	if (rootTargetNodeId) {
		return {
			targetNodeId,
			zone: DROP_ZONE.AFTER,
			indicator: {
				clientY: targetRow.getBoundingClientRect().top,
				depth: 0
			}
		};
	}

	const rowIndex = Number(targetRow.dataset.rowIndex);
	const row = rows[rowIndex];

	if (!row || row.id !== targetNodeId) return undefined;

	const rowRect = targetRow.getBoundingClientRect();
	const zone = getDropZone(client.y, rowRect);

	const isZoneAfterExpandedGroup =
		zone === DROP_ZONE.AFTER &&
		row.type === 'group' &&
		row.isExpanded;

	if (isZoneAfterExpandedGroup) {
		const nextRow = rows[rowIndex + 1];
		const firstChild =
			nextRow?.depth === row.depth + 1 ? nextRow : undefined;

		if (firstChild?.id === draggedNodeId) return undefined;

		return {
			targetNodeId: firstChild?.id ?? row.id,
			// Appending to an empty group also inserts at position zero.
			zone: firstChild ? DROP_ZONE.BEFORE : DROP_ZONE.CENTER,
			indicator: {
				clientY: rowRect.bottom,
				depth: row.depth + 1
			}
		};
	}

	const indicator =
		zone === DROP_ZONE.CENTER
			? undefined
			: {
					clientY:
						zone === DROP_ZONE.BEFORE ? rowRect.top : rowRect.bottom,
					depth: row.depth
				};

	return {
		targetNodeId,
		zone,
		indicator
	};
};

/**
 * Refreshes edge or center-zone feedback for the drop target beneath the pointer.
 */
export const refreshDropFeedback = (
	client: {x: number; y: number},
	diagramContainerRef: RefObject<HTMLDivElement>,
	dropIndicatorRef: RefObject<HTMLDivElement>,
	dragContext: Readonly<{
		rows: readonly TimelineRow[];
		draggedNodeId: string;
	}>
) => {
	const diagramRoot = diagramContainerRef.current;
	const indicatorContainer = dropIndicatorRef.current?.parentElement;

	if (!diagramRoot || !indicatorContainer) {
		clearDropFeedback(diagramContainerRef, dropIndicatorRef);

		return;
	}

	const target = resolveDropTarget(
		client,
		diagramRoot,
		dragContext.draggedNodeId,
		dragContext.rows
	);

	if (!target) {
		clearDropFeedback(diagramContainerRef, dropIndicatorRef);

		return;
	}

	if (!target.indicator) {
		clearDropIndicator(dropIndicatorRef);
		applyDropTargetHighlight(diagramRoot, target.targetNodeId);

		return;
	}

	clearDropTargetHighlight(diagramRoot);

	const indicator = dropIndicatorRef.current;
	const indicatorHeight = indicator?.offsetHeight || 2;
	const containerRect = indicatorContainer.getBoundingClientRect();
	const rawTop =
		target.indicator.clientY -
		containerRect.top -
		indicatorHeight / 2;
	const top = clampDropIndicatorTop(
		rawTop,
		indicatorHeight,
		indicatorContainer.clientHeight
	);

	applyDropIndicator(
		dropIndicatorRef,
		top,
		getDropIndicatorInlineStart(target.indicator.depth)
	);
};

const computeScrollSpeed = (
	distanceFromEdge: number,
	effectiveEdgePx: number
): number => {
	const speedRange =
		AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME -
		AUTO_SCROLL_MIN_SPEED_PX_PER_FRAME;

	const edgeProximity = 1 - distanceFromEdge / effectiveEdgePx;

	return (
		AUTO_SCROLL_MIN_SPEED_PX_PER_FRAME + edgeProximity * speedRange
	);
};

/**
 * Compute the vertical auto-scroll velocity (in pixels-per-frame) for the
 * diagram container while a row is being dragged.
 *
 * Returns a negative value to scroll up, a positive value to scroll down,
 * and zero when the pointer is between the top and bottom auto-scroll zones.
 * Once the pointer moves beyond a container edge, the speed stays at max.
 */
export const computeAutoScrollVelocity = (
	clientY: number,
	containerRect: DOMRect
): number => {
	const distanceFromContentTop =
		clientY - containerRect.top - HEADER_HEIGHT;
	const distanceFromBottom = containerRect.bottom - clientY;

	if (distanceFromContentTop < 0) {
		return -AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME;
	}

	if (distanceFromBottom < 0) {
		return AUTO_SCROLL_MAX_SPEED_PX_PER_FRAME;
	}

	// Compute the effective edge height for cases where the container height is smaller than the default target zone height.
	// we want to split the container into three zones: top, middle, bottom. The top and bottom zones should be equal in height, and the middle zone should take up the remaining space.
	const effectiveEdgePx = Math.min(
		AUTO_SCROLL_EDGE_PX,
		(containerRect.height - HEADER_HEIGHT) / 3
	);

	if (distanceFromContentTop < effectiveEdgePx) {
		return -computeScrollSpeed(
			distanceFromContentTop,
			effectiveEdgePx
		);
	}

	if (distanceFromBottom < effectiveEdgePx) {
		return computeScrollSpeed(distanceFromBottom, effectiveEdgePx);
	}

	return 0;
};

const getAutoScrollMaxScrollTop = (
	diagramContainer: HTMLElement,
	scrollContent?: HTMLElement
): number => {
	const contentHeight =
		scrollContent?.getBoundingClientRect().height ??
		diagramContainer.scrollHeight;

	return Math.max(contentHeight - diagramContainer.clientHeight, 0);
};

export const shouldStopAutoScrollAtBoundary = (
	velocity: number,
	diagramContainer: HTMLElement,
	scrollContent?: HTMLElement
): boolean => {
	if (velocity === 0) return true;

	if (velocity < 0) {
		return (
			diagramContainer.scrollTop <= AUTO_SCROLL_BOUNDARY_EPSILON_PX
		);
	}

	const maxScrollTop = getAutoScrollMaxScrollTop(
		diagramContainer,
		scrollContent
	);

	return (
		diagramContainer.scrollTop >=
		maxScrollTop - AUTO_SCROLL_BOUNDARY_EPSILON_PX
	);
};

export const getNextAutoScrollTop = (
	velocity: number,
	diagramContainer: HTMLElement,
	scrollContent?: HTMLElement
): number => {
	const maxScrollTop = getAutoScrollMaxScrollTop(
		diagramContainer,
		scrollContent
	);

	return Math.min(
		Math.max(diagramContainer.scrollTop + velocity, 0),
		maxScrollTop
	);
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

export const removeDragCSSClass = () => {
	document.body.classList.remove(
		TIMELINE_DRAG_ACTIVE,
		TIMELINE_DRAG_OUTSIDE
	);
};

export const reorder = <EventSource>(
	list: EventSource[],
	from: number,
	to: number
): EventSource[] => {
	if (from === to) return list;

	const copy = [...list];
	const [removed] = copy.splice(from, 1);

	copy.splice(to, 0, removed);

	return copy;
};

/* Handles the conversion between elapsed time and pixel coordinates for the time chart. */
export const handleHeaderChart = (
	chart: EChartsType,
	appliedCoordinates: RefObject<any>
): HeaderChartHandle => {
	return {
		chart,
		elapsedToPixel: value => {
			const pixel: unknown = chart.convertToPixel(
				{xAxisIndex: 0},
				appliedCoordinates.current.toAxis(value)
			);

			return typeof pixel === 'number' && Number.isFinite(pixel)
				? pixel
				: undefined;
		},
		pixelToElapsed: pixel => {
			const value: unknown = chart.convertFromPixel(
				{xAxisIndex: 0},
				pixel
			);

			return typeof value === 'number' && Number.isFinite(value)
				? appliedCoordinates.current.toElapsed(value)
				: undefined;
		}
	};
};
