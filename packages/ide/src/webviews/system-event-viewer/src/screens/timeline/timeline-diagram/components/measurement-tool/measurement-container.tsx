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
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
import type {ReactNode, MouseEvent, RefObject} from 'react';
import type {EChartsType} from 'echarts/core';

import MeasurementOverlay from './measurement-overlay';
import {
	useDataZoom,
	useMeasurePhase
} from '../../../../../state/slices/timeline/timeline.selector';
import {useMeasurementRowProjection} from '../../../../../state/slices/event-sources/event-sources.selector';
import {setMeasurePhase} from '../../../../../state/slices/timeline/timeline.reducer';
import {useAppDispatch} from '../../../../../state/store';
import {
	isMeasureModeActive,
	isPreviewPhase
} from '../../../../../common/utils/measurement-tool';
import {prepareMeasurementValue} from '../../../../../common/utils/time-mode-formatters';
import {getVisibleRange} from '../../../../../common/utils/axis-scale';
import {useTimeMode} from '../../../../../state/slices/timeline/timeline.selector';
import {
	DIAGRAM_CONTAINER_ID,
	MEASUREMENT_HEADER_CHART_ID,
	MEASURE_PHASE,
	TIMELINE_MEASURE_ACTIVE
} from '../../../../../common/constants/timeline';
import {clearAllRowEmphasis} from '../../../../../common/utils/timeline-diagram';
import {useMeasurePointResolver} from '../../../../../common/hooks/use-measure-point-resolver';
import useAppliedChartProjection from '../../../../../common/hooks/use-applied-chart-projection';
import useMeasureLayoutViewport from '../../../../../common/hooks/use-measure-layout-viewport';

import type {
	HeaderChartHandle,
	MeasurePoint,
	MeasureResolvedPoint,
	MeasureSnapCandidate,
	PreparedMeasurementValue,
	Range
} from '../../../../../common/types/timeline';
import type {SevEventSource} from '../../../../../common/types/events';

import styles from './measurement-container.module.scss';

type CursorMeasurement = Readonly<{
	timestamp: number | undefined;
	preparedValue: PreparedMeasurementValue | undefined;
}>;

type MeasurementContainerProps = Readonly<{
	children: (measurementViewport: ReactNode) => ReactNode;
	eventSources: SevEventSource[];
	timestampRange: Range;
	measurementContainerRef: RefObject<HTMLElement>;
	getChartInstance: (sourceId: string) => EChartsType | undefined;
	getHeaderChartInstance: () => HeaderChartHandle | undefined;
}>;

/**
 * The purpose of this component is to wrap the timeline diagram and provide the measurement tool functionality.
 * It manages the state related to the measurement tool.
 * It also handles mouse events to update the measurement points and phase accordingly.
 * The actual rendering of the measurement overlay is delegated to the MeasurementOverlay component
 */
function MeasurementContainer({
	children,
	eventSources,
	timestampRange,
	measurementContainerRef,
	getChartInstance,
	getHeaderChartInstance
}: MeasurementContainerProps) {
	const dispatch = useAppDispatch();
	const dataZoom = useDataZoom();
	const timeMode = useTimeMode();
	const measurePhase = useMeasurePhase();

	const {
		visibleRowIds,
		visibleChartRowIds,
		visibleGroupRowIds,
		visibleAnchorRowIds
	} = useMeasurementRowProjection();
	const isMeasureActive = isMeasureModeActive(measurePhase);
	const headerChart = getHeaderChartInstance();
	const visibleRange = useMemo(
		() => getVisibleRange(timestampRange, dataZoom),
		[timestampRange, dataZoom]
	);
	const measurementViewportRef = useRef<HTMLDivElement>(null);
	const measurementChartRowIds = useMemo(
		() =>
			new Set([...visibleChartRowIds, MEASUREMENT_HEADER_CHART_ID]),
		[visibleChartRowIds]
	);
	const viewport = useMeasureLayoutViewport(
		measurementViewportRef,
		measurementContainerRef,
		headerChart?.chart,
		visibleRowIds,
		isMeasureActive
	);
	const appliedChartProjection = useAppliedChartProjection(
		headerChart,
		timestampRange
	);

	const hasAppliedProjection =
		appliedChartProjection.minPixel !== undefined &&
		appliedChartProjection.maxPixel !== undefined;

	const prepareBackgroundValue = useCallback(
		(value: number | undefined) => {
			if (
				!hasAppliedProjection ||
				value === undefined ||
				!Number.isFinite(value)
			) {
				return undefined;
			}

			return prepareMeasurementValue(value, visibleRange, timeMode);
		},
		[visibleRange, timeMode, hasAppliedProjection]
	);
	// Client coordinates keep the preview under a stationary pointer after layout changes
	const [pointerPoint, setPointerPoint] = useState<
		MeasurePoint | undefined
	>(undefined);
	// State for the "committed" measurement points and timestamps; can be clamped/snapped
	const [cursorPoint, setCursorPoint] = useState<
		MeasurePoint | undefined
	>(undefined);
	const [cursorMeasurement, setCursorMeasurement] = useState<
		CursorMeasurement | undefined
	>(undefined);
	const [previewSnapCandidate, setPreviewSnapCandidate] = useState<
		MeasureSnapCandidate | undefined
	>(undefined);
	const [points, setPoints] = useState<{
		start: MeasureResolvedPoint | undefined;
		end: MeasureResolvedPoint | undefined;
	}>({
		start: undefined,
		end: undefined
	});

	// This custom hook encapsulates the logic to resolve a mouse event to a point on the chart
	// considering snapping, bounds checking and live preview updates.
	const {resolvePoint, resolvePreviewFromLocalPointer} =
		useMeasurePointResolver({
			eventSources,
			getChartInstance,
			getHeaderChartInstance,
			prepareBackgroundValue,
			rowBoundsByRowId: viewport.rowBoundsByRowId,
			visibleAnchorRowIds,
			visibleGroupRowIds
		});

	const handleMouseMove = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			if (!isMeasureActive) return;

			const rect =
				measurementViewportRef.current?.getBoundingClientRect();
			if (!rect) return;
			const rawPoint = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
			const preview = resolvePreviewFromLocalPointer(rawPoint, rect);

			setPointerPoint({x: event.clientX, y: event.clientY});
			setCursorPoint(preview.guidePoint);
			setCursorMeasurement({
				timestamp: preview.timestamp,
				preparedValue: preview.preparedValue
			});
			setPreviewSnapCandidate(preview.snappedCandidate);
		},
		[isMeasureActive, resolvePreviewFromLocalPointer]
	);

	const handleMouseLeave = useCallback(() => {
		setPointerPoint(undefined);
		setCursorPoint(undefined);
		setCursorMeasurement(undefined);
		setPreviewSnapCandidate(undefined);
	}, []);

	const handleClick = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			if (!isMeasureActive) return;

			const rect =
				measurementViewportRef.current?.getBoundingClientRect();
			if (!rect) return;

			const resolvedPoint = resolvePoint(
				{
					x: event.clientX - rect.left,
					y: event.clientY - rect.top
				},
				rect
			);
			if (!resolvedPoint) return;

			setCursorMeasurement(undefined);
			setPreviewSnapCandidate(undefined);

			if (!points.start) {
				setPoints({
					start: resolvedPoint,
					end: undefined
				});
				dispatch(setMeasurePhase(MEASURE_PHASE.MEASURING));

				return;
			}

			if (!points.end) {
				setPoints({
					...points,
					end: resolvedPoint
				});
				dispatch(setMeasurePhase(MEASURE_PHASE.FIXED));

				return;
			}

			setPoints({
				start: undefined,
				end: undefined
			});

			dispatch(setMeasurePhase(MEASURE_PHASE.ARMED));
		},
		[dispatch, isMeasureActive, points, resolvePoint]
	);

	// Derive the live state again once ECharts has applied a zoom/pan, even
	// when the pointer remains stationary.
	const derivedPreview = useMemo(() => {
		if (
			appliedChartProjection.minPixel === undefined ||
			appliedChartProjection.maxPixel === undefined ||
			!isMeasureActive ||
			!isPreviewPhase(measurePhase) ||
			!pointerPoint
		) {
			return undefined;
		}

		const containerRect =
			measurementViewportRef.current?.getBoundingClientRect();
		if (!containerRect) return undefined;

		// Use the measured height before React updates the viewport element.
		containerRect.height = viewport.overlayHeight;

		return resolvePreviewFromLocalPointer(
			{
				x: pointerPoint.x - containerRect.left,
				y: pointerPoint.y - containerRect.top
			},
			containerRect
		);
	}, [
		appliedChartProjection.minPixel,
		appliedChartProjection.maxPixel,
		isMeasureActive,
		measurePhase,
		viewport.overlayHeight,
		pointerPoint,
		resolvePreviewFromLocalPointer
	]);

	useEffect(() => {
		const body = measurementContainerRef.current?.ownerDocument?.body;

		if (isMeasureActive) {
			body?.classList.add(TIMELINE_MEASURE_ACTIVE);

			clearAllRowEmphasis(
				measurementContainerRef.current?.ownerDocument?.getElementById(
					DIAGRAM_CONTAINER_ID
				) ?? undefined
			);
		} else {
			setPointerPoint(undefined);
			setCursorPoint(undefined);
			setCursorMeasurement(undefined);
			setPreviewSnapCandidate(undefined);
			setPoints({
				start: undefined,
				end: undefined
			});

			body?.classList.remove(TIMELINE_MEASURE_ACTIVE);
		}

		return () => {
			body?.classList.remove(TIMELINE_MEASURE_ACTIVE);
		};
	}, [isMeasureActive, measurementContainerRef]);

	// Listens to ESC key to allow user to close the measurement tool
	useEffect(() => {
		if (!isMeasureActive) return undefined;

		const handleEscapeKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				dispatch(setMeasurePhase(MEASURE_PHASE.IDLE));
			}
		};

		window.addEventListener('keydown', handleEscapeKeyDown);

		return () => {
			window.removeEventListener('keydown', handleEscapeKeyDown);
		};
	}, [dispatch, isMeasureActive]);

	const overlayProps = useMemo(
		() => ({
			phase: measurePhase,
			timeMode,
			cursorPoint: derivedPreview?.guidePoint ?? cursorPoint,
			cursorTimestamp: derivedPreview
				? derivedPreview.timestamp
				: cursorMeasurement?.timestamp,
			cursorPreparedValue: derivedPreview
				? derivedPreview.preparedValue
				: cursorMeasurement?.preparedValue,
			previewSnapCandidate: derivedPreview
				? derivedPreview.snappedCandidate
				: previewSnapCandidate,
			startResolvedPoint: points.start,
			startTimestamp: points.start?.timestamp,
			endResolvedPoint: points.end,
			endTimestamp: points.end?.timestamp,
			headerChart,
			visibleAnchorRowIds,
			visibleChartRowIds: measurementChartRowIds,
			viewport
		}),
		[
			measurePhase,
			timeMode,
			derivedPreview,
			cursorPoint,
			cursorMeasurement,
			previewSnapCandidate,
			points.end,
			points.start,
			headerChart,
			visibleAnchorRowIds,
			measurementChartRowIds,
			viewport
		]
	);

	return (
		<section
			ref={measurementContainerRef}
			className={`${styles.diagram} ${
				isMeasureActive ? styles.measureActiveCursor : ''
			}`}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			onClick={handleClick}
		>
			{children(
				<div
					ref={measurementViewportRef}
					className={styles.measurementViewport}
					style={{
						height: isMeasureActive ? viewport.overlayHeight : 0
					}}
				>
					{isMeasureActive && (
						<MeasurementOverlay {...overlayProps} />
					)}
				</div>
			)}
		</section>
	);
}

export default memo(MeasurementContainer);
