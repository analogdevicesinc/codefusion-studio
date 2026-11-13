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

import type {
	MeasurementState,
	MeasureLabelLayout
} from '../../../../../common/types/timeline';
import {
	HEADER_LABEL_TOP,
	TIMESTAMP_LABEL_HEIGHT
} from '../../../../../common/constants/timeline';
import TimestampLabel from './timestamp-label';

import styles from './measurement-labels.module.scss';

export default function MeasurementLabels({
	state,
	layout
}: Readonly<{
	state: MeasurementState;
	layout: MeasureLabelLayout;
}>) {
	return (
		<div
			className={styles.verticalLabelsContainer}
			style={{
				top: HEADER_LABEL_TOP,
				height: TIMESTAMP_LABEL_HEIGHT
			}}
		>
			{/* Start line label */}
			{layout.startLabelLeft !== undefined &&
				state.startLabelText && (
					<TimestampLabel
						ref={layout.startLabelRef}
						text={state.startLabelText}
						left={layout.startLabelLeft}
						top={0}
						dataTest='timeline-diagram:measurement-label:start'
					/>
				)}

			{/* End line label */}
			{layout.endLabelLeft !== undefined && state.endLabelText && (
				<TimestampLabel
					ref={layout.endLabelRef}
					text={state.endLabelText}
					left={layout.endLabelLeft}
					top={0}
					dataTest='timeline-diagram:measurement-label:end'
				/>
			)}

			{/* Cursor label */}
			{layout.cursorLabelLeft !== undefined &&
				state.cursorLabelText && (
					<TimestampLabel
						ref={layout.cursorLabelRef}
						text={state.cursorLabelText}
						left={layout.cursorLabelLeft}
						top={0}
						dataTest='timeline-diagram:measurement-label:cursor'
					/>
				)}
		</div>
	);
}
