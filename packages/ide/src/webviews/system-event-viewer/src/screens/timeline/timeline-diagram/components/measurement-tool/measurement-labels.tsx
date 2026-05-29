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
import TimestampLabel from './timestamp-label';

export default function MeasurementLabels({
	state,
	layout
}: Readonly<{
	state: MeasurementState;
	layout: MeasureLabelLayout;
}>) {
	return (
		<>
			{/* Start line label */}
			{layout.startLabelLeft !== undefined &&
				state.startLabelText && (
					<TimestampLabel
						ref={layout.startLabelRef}
						text={state.startLabelText}
						left={layout.startLabelLeft}
						top={layout.verticalLabelTop}
						dataTest='timeline-diagram:measurement-label:start'
					/>
				)}

			{/* End line label */}
			{layout.endLabelLeft !== undefined && state.endLabelText && (
				<TimestampLabel
					ref={layout.endLabelRef}
					text={state.endLabelText}
					left={layout.endLabelLeft}
					top={layout.verticalLabelTop}
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
						top={layout.verticalLabelTop}
						dataTest='timeline-diagram:measurement-label:cursor'
					/>
				)}

			{/* Horizontal delta label */}
			{layout.horizontalLabelLeft !== undefined &&
				layout.horizontalLabelTop !== undefined &&
				state.horizontalDeltaText &&
				state.horizontalLine && (
					<TimestampLabel
						ref={layout.horizontalLabelRef}
						text={state.horizontalDeltaText}
						left={layout.horizontalLabelLeft}
						top={layout.horizontalLabelTop}
						dataTest='timeline-diagram:measurement-label:delta'
					/>
				)}
		</>
	);
}
