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

import {
	forwardRef,
	memo,
	useCallback,
	useImperativeHandle,
	useState
} from 'react';

import ZoomButtonsFooter from './zoom-buttons-footer';
import TimelineSlider from './timeline-slider';
import TimelineFooterPanButton from './timeline-footer-pan-button';
import {
	INITIAL_DATA_ZOOM,
	PAN_PERCENTAGE
} from '../../../common/constants/timeline';
import type {DataZoom} from '../../../common/types/timeline';

import styles from './timeline-diagram.module.scss';
import {store} from '../../../state/store';

type TimelineFooterProps = Readonly<{
	timestampRange: {min: number; max: number};
	onDataZoomChange: (dataZoom: DataZoom) => void;
}>;

type FooterHandle = {
	setDataZoom: (dataZoom: DataZoom) => void;
};

const TimelineFooter = forwardRef<FooterHandle, TimelineFooterProps>(
	({timestampRange, onDataZoomChange}, ref) => {
		const persistedDataZoom =
			store.getState().timelineReducer?.dataZoom ?? INITIAL_DATA_ZOOM;

		const [dataZoom, setDataZoom] =
			useState<DataZoom>(persistedDataZoom);

		useImperativeHandle(
			ref,
			() => ({
				setDataZoom(newDataZoom: DataZoom) {
					setDataZoom(newDataZoom);
				}
			}),
			[]
		);

		const isPanLeftDisabled = useCallback(
			() => dataZoom.start <= 0,
			[dataZoom]
		);

		const isPanRightDisabled = useCallback(
			() => dataZoom.end >= 100,
			[dataZoom]
		);

		const panLeft = useCallback(() => {
			const {start, end} = dataZoom;
			const windowSize = end - start;
			const panStepPercent = windowSize * PAN_PERCENTAGE;

			const newStart = Math.max(start - panStepPercent, 0);
			const newEnd = newStart + windowSize;

			onDataZoomChange({
				start: newStart,
				end: newEnd
			});
		}, [dataZoom, onDataZoomChange]);

		const panRight = useCallback(() => {
			const {start, end} = dataZoom;
			const windowSize = end - start;
			const panStepPercent = windowSize * PAN_PERCENTAGE;

			const newStart = Math.min(
				start + panStepPercent,
				100 - windowSize
			);
			const newEnd = newStart + windowSize;

			onDataZoomChange({
				start: newStart,
				end: newEnd
			});
		}, [dataZoom, onDataZoomChange]);

		return (
			<div
				className={styles.timelineFooterContainer}
				data-test='timeline-diagram:footer'
			>
				<div className={styles.content}>
					<TimelineFooterPanButton
						isDisabled={isPanLeftDisabled()}
						direction='left'
						onClick={panLeft}
					/>

					<TimelineSlider
						min={0}
						max={100}
						start={dataZoom.start}
						end={dataZoom.end}
						onDataZoomChange={dataZoom => {
							onDataZoomChange(dataZoom);
						}}
					/>

					<TimelineFooterPanButton
						isDisabled={isPanRightDisabled()}
						direction='right'
						onClick={panRight}
					/>
				</div>

				<ZoomButtonsFooter
					dataZoom={dataZoom}
					timestampRange={timestampRange}
					onDataZoomChange={(dataZoom: DataZoom) => {
						onDataZoomChange({
							start: dataZoom.start,
							end: dataZoom.end
						});
					}}
				/>
			</div>
		);
	}
);

export default memo(TimelineFooter);
