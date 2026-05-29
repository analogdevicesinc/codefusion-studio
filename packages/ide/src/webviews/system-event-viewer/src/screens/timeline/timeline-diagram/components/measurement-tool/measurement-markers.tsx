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
	MeasurePoint
} from '../../../../../common/types/timeline';

import styles from '../../measurement-overlay.module.scss';

const markerPoint = (point: MeasurePoint, dataTest: string) => (
	<div
		className={styles.markerPointContainer}
		style={{left: point.x, top: point.y}}
		data-test={`timeline-diagram:measurement-point:${dataTest}`}
	>
		<div className={styles.handle}>
			<div className={styles.inner}>
				<div className={styles.middle} />
			</div>
		</div>
	</div>
);

export default function MeasurementMarkers({
	state
}: Readonly<{state: MeasurementState}>) {
	return (
		<>
			{state.previewMarkerPoint &&
				markerPoint(state.previewMarkerPoint, 'preview')}
			{state.startLine &&
				state.startMarkerSnapped &&
				markerPoint(state.startLine, 'start')}
			{state.endMarkerPoint &&
				state.endMarkerSnapped &&
				markerPoint(state.endMarkerPoint, 'end')}
		</>
	);
}
