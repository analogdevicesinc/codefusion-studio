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
	MeasureLabelLayout,
	MeasurementState
} from '../../../../../common/types/timeline';

import styles from '../../measurement-overlay.module.scss';

export default function MeasurementGuides({
	state,
	layout
}: Readonly<{
	state: MeasurementState;
	layout: MeasureLabelLayout;
}>) {
	return (
		<>
			{state.cursorGuide && (
				<div
					className={`${styles.measureGuide} ${styles.dashedLine}`}
					style={{left: state.cursorGuide.x}}
				/>
			)}

			{state.startLine && (
				<div
					className={`${styles.measureGuide} ${styles.solidLine}`}
					style={{left: state.startLine.x}}
				/>
			)}

			{state.endLine && (
				<div
					className={`${styles.measureGuide} ${
						state.isFixedPhase ? styles.solidLine : styles.dashedLine
					}`}
					style={{left: state.endLine.x}}
				/>
			)}

			{state.horizontalLine &&
				layout.horizontalLineTop !== undefined && (
					<div
						className={styles.horizontalLine}
						style={{
							...state.horizontalLine,
							top: layout.horizontalLineTop
						}}
					/>
				)}
		</>
	);
}
