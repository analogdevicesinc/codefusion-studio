/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import {
	HEADER_HEIGHT,
	HORIZONTAL_LABEL_MARGIN,
	HORIZONTAL_LINE_HEIGHT,
	TIMESTAMP_LABEL_HEIGHT
} from '../../../../../common/constants/timeline';
import type {
	MeasureLabelLayout,
	MeasurementState
} from '../../../../../common/types/timeline';

import TimestampLabel from './timestamp-label';

import styles from './measurement-delta.module.scss';

export default function MeasurementDelta({
	state,
	layout
}: Readonly<{
	state: MeasurementState;
	layout: MeasureLabelLayout;
}>) {
	if (
		!state.horizontalLine ||
		!state.horizontalDeltaText ||
		layout.horizontalLabelLeft === undefined ||
		layout.horizontalLineLeft === undefined ||
		layout.horizontalLineWidth === undefined
	) {
		return null;
	}

	const horizontalLineTop =
		TIMESTAMP_LABEL_HEIGHT + HORIZONTAL_LABEL_MARGIN;
	const deltaHeight = horizontalLineTop + HORIZONTAL_LINE_HEIGHT;
	const labelTop = Math.max(
		0,
		state.horizontalLine.top - horizontalLineTop
	);

	return (
		<div className={styles.deltaContainer}>
			<div aria-hidden style={{height: labelTop}} />
			<div
				className={styles.deltaGroup}
				style={{
					top: HEADER_HEIGHT,
					bottom: 0,
					height: deltaHeight
				}}
			>
				<TimestampLabel
					ref={layout.horizontalLabelRef}
					text={state.horizontalDeltaText}
					left={layout.horizontalLabelLeft}
					top={0}
					dataTest='timeline-diagram:measurement-label:delta'
				/>

				<div
					className={styles.horizontalLine}
					data-test='timeline-diagram:measurement-delta-line'
					style={{
						left: layout.horizontalLineLeft,
						width: layout.horizontalLineWidth,
						top: horizontalLineTop
					}}
				/>

				{layout.deltaStemLeft !== undefined && (
					<div
						className={styles.deltaStem}
						data-test='timeline-diagram:measurement-stem'
						style={{
							left: layout.deltaStemLeft,
							top: TIMESTAMP_LABEL_HEIGHT,
							height: HORIZONTAL_LABEL_MARGIN + HORIZONTAL_LINE_HEIGHT
						}}
					/>
				)}
			</div>
		</div>
	);
}
