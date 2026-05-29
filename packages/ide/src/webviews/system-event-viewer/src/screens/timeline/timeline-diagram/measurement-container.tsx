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
import type {ReactNode, MouseEvent} from 'react';
import type {EChartsType} from 'echarts/core';

import MeasurementOverlay from './measurement-overlay';
import {
	useDataZoom,
	useMeasurePhase
} from '../../../state/slices/timeline/timeline.selector';
import {setMeasurePhase} from '../../../state/slices/timeline/timeline.reducer';
import {useAppDispatch} from '../../../state/store';
import {
	computeMeasurementUnit,
	isMeasureModeActive,
	isPreviewPhase
} from '../../../common/utils/measurement-tool';
import {MEASURE_PHASE} from '../../../common/constants/timeline';
import {useMeasurePointResolver} from '../../../common/hooks/use-measure-point-resolver';

import type {
	MeasurePoint,
	MeasureResolvedPoint,
	MeasureSnapCandidate,
	Range
} from '../../../common/types/timeline';
import type {SevEventSource} from '../../../common/types/events';

import styles from './timeline-diagram.module.scss';

type MeasurementContainerProps = Readonly<{
	children: ReactNode;
	eventSources: SevEventSource[];
	timestampRange: Range;
	getChartInstance: (sourceId: string) => EChartsType | undefined;
	getHeaderChartInstance: () => EChartsType | undefined;
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
	getChartInstance,
	getHeaderChartInstance
}: MeasurementContainerProps) {
	const dispatch = useAppDispatch();
	const dataZoom = useDataZoom();
	const measurePhase = useMeasurePhase();
	const isMeasureActive = isMeasureModeActive(measurePhase);
	const headerChart = getHeaderChartInstance();
	const diagramRef = useRef<HTMLElement>(null);
	// Raw pointer position for preview
	const [pointerPoint, setPointerPoint] = useState<
		MeasurePoint | undefined
	>(undefined);
	// State for the "committed" measurement points and timestamps; can be clamped/snapped
	const [cursorPoint, setCursorPoint] = useState<
		MeasurePoint | undefined
	>(undefined);
	const [cursorTimestamp, setCursorTimestamp] = useState<
		number | undefined
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

	const measureUnit = useMemo(
		() =>
			computeMeasurementUnit(timestampRange, dataZoom, headerChart),
		[dataZoom, headerChart, timestampRange]
	);

	// This custom hook encapsulates the logic to resolve a mouse event to a point on the chart
	// considering snapping, bounds checking and live preview updates.
	const {
		resolvePoint,
		resolvePreviewFromMouseEvent,
		resolvePreviewFromLocalPointer
	} = useMeasurePointResolver({
		eventSources,
		getChartInstance,
		getHeaderChartInstance
	});

	const handleMouseMove = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			if (!isMeasureActive) return;

			const rect = event.currentTarget.getBoundingClientRect();
			const rawPoint = {
				x: event.clientX - rect.left,
				y: event.clientY - rect.top
			};
			const preview = resolvePreviewFromMouseEvent(event);

			setPointerPoint(rawPoint);
			setCursorPoint(preview.guidePoint);
			setCursorTimestamp(preview.timestamp);
			setPreviewSnapCandidate(preview.snappedCandidate);
		},
		[isMeasureActive, resolvePreviewFromMouseEvent]
	);

	const handleMouseLeave = useCallback(() => {
		setPointerPoint(undefined);
		setCursorPoint(undefined);
		setCursorTimestamp(undefined);
		setPreviewSnapCandidate(undefined);
	}, []);

	const handleClick = useCallback(
		(event: MouseEvent<HTMLElement>) => {
			if (!isMeasureActive) return;

			const resolvedPoint = resolvePoint(event);
			if (!resolvedPoint) return;

			setCursorTimestamp(undefined);
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

	// Purpose: derive the "live" state, on zoom/pan when the mouse is stationary
	const computeDerivedPreview = () => {
		if (
			!isMeasureActive ||
			!isPreviewPhase(measurePhase) ||
			!pointerPoint
		) {
			return undefined;
		}

		const containerRect = diagramRef.current?.getBoundingClientRect();
		if (!containerRect) return undefined;

		return resolvePreviewFromLocalPointer(
			pointerPoint,
			containerRect
		);
	};

	const derivedPreview = computeDerivedPreview();

	useEffect(() => {
		if (!isMeasureActive) {
			setPointerPoint(undefined);
			setCursorPoint(undefined);
			setCursorTimestamp(undefined);
			setPreviewSnapCandidate(undefined);
			setPoints({
				start: undefined,
				end: undefined
			});
		}
	}, [isMeasureActive]);

	const overlayProps = useMemo(
		() => ({
			phase: measurePhase,
			unit: measureUnit,
			cursorPoint: derivedPreview?.guidePoint ?? cursorPoint,
			cursorTimestamp: derivedPreview?.timestamp ?? cursorTimestamp,
			previewSnapCandidate:
				derivedPreview?.snappedCandidate ?? previewSnapCandidate,
			startResolvedPoint: points.start,
			startTimestamp: points.start?.timestamp,
			endResolvedPoint: points.end,
			endTimestamp: points.end?.timestamp,
			headerChart
		}),
		[
			measurePhase,
			measureUnit,
			derivedPreview,
			cursorPoint,
			cursorTimestamp,
			previewSnapCandidate,
			points.end,
			points.start,
			headerChart
		]
	);

	return (
		<section
			ref={diagramRef}
			className={`${styles.diagram} ${
				isMeasureActive ? styles.measureActiveCursor : ''
			}`}
			onMouseMove={handleMouseMove}
			onMouseLeave={handleMouseLeave}
			onClick={handleClick}
		>
			{children}

			{isMeasureActive && <MeasurementOverlay {...overlayProps} />}
		</section>
	);
}

export default memo(MeasurementContainer);
