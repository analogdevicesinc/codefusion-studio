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

import {memo, useCallback, useMemo} from 'react';
import {Button} from 'cfs-react-library';
import ResetZoomIcon from '@common/icons/ZoomReset';
import ZoomInIcon from '@common/icons/ZoomIn';
import ZoomOutIcon from '@common/icons/ZoomOut';
import useCanZoomIn from '../../../common/hooks/use-can-zoom-in';
import {
	INITIAL_DATA_ZOOM,
	ZOOM_PERCENTAGE
} from '../../../common/constants/timeline';
import type {DataZoom} from '../../../common/types/timeline';

import styles from './timeline-diagram.module.scss';

type ZoomButtonsFooterProps = Readonly<{
	dataZoom: DataZoom;
	timestampRange: {min: number; max: number};
	onDataZoomChange: (dataZoom: DataZoom) => void;
}>;

function ZoomButtonsFooter({
	dataZoom,
	timestampRange,
	onDataZoomChange
}: ZoomButtonsFooterProps) {
	const canZoomIn = useCanZoomIn(dataZoom, timestampRange);

	const isDisabled = useMemo(
		() => dataZoom.start === 0 && dataZoom.end === 100,
		[dataZoom]
	);

	const handleZoomOutClick = useCallback(() => {
		if (!isDisabled) {
			const span = dataZoom.end - dataZoom.start;
			const center = (dataZoom.start + dataZoom.end) / 2;
			const scaleOut = 1 / (1 - ZOOM_PERCENTAGE);

			const newSpan = span * scaleOut;
			const newStart = center - newSpan / 2;
			const newEnd = center + newSpan / 2;

			onDataZoomChange({
				start: Math.max(newStart, 0),
				end: Math.min(newEnd, 100)
			});
		}
	}, [dataZoom, onDataZoomChange, isDisabled]);

	const handleZoomResetClick = useCallback(() => {
		if (dataZoom.start !== 0 || dataZoom.end !== 100) {
			onDataZoomChange(INITIAL_DATA_ZOOM);
		}
	}, [dataZoom, onDataZoomChange]);

	const handleZoomInClick = useCallback(() => {
		const span = dataZoom.end - dataZoom.start;
		const center = (dataZoom.start + dataZoom.end) / 2;
		const scaleIn = 1 - ZOOM_PERCENTAGE;

		const newSpan = span * scaleIn;
		const newStart = center - newSpan / 2;
		const newEnd = center + newSpan / 2;

		if (dataZoom.start < dataZoom.end) {
			onDataZoomChange({
				start: Math.max(newStart, 0),
				end: Math.min(newEnd, 100)
			});
		}
	}, [dataZoom, onDataZoomChange]);

	return (
		<div
			className={styles.ctaButtonsContainer}
			data-test='timeline-diagram:footer:zoom-buttons'
		>
			<Button
				type='button'
				appearance='icon'
				className={styles.zoomOutBtn}
				dataTest='timeline-diagram:footer:zoom-buttons:zoom-out'
				disabled={isDisabled}
				onClick={() => {
					handleZoomOutClick();
				}}
			>
				<ZoomOutIcon />
			</Button>

			<Button
				type='button'
				appearance='icon'
				className={styles.zoomResetBtn}
				dataTest='timeline-diagram:footer:zoom-buttons:zoom-reset'
				disabled={isDisabled}
				onClick={() => {
					handleZoomResetClick();
				}}
			>
				<ResetZoomIcon />
			</Button>

			<Button
				type='button'
				appearance='icon'
				className={styles.zoomInBtn}
				dataTest='timeline-diagram:footer:zoom-buttons:zoom-in'
				disabled={!canZoomIn}
				onClick={() => {
					handleZoomInClick();
				}}
			>
				<ZoomInIcon />
			</Button>
		</div>
	);
}

export default memo(ZoomButtonsFooter);
