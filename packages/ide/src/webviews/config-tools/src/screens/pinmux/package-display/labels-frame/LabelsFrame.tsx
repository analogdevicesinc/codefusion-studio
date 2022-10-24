/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
/* eslint-disable react/no-array-index-key */
import {memo} from 'react';
import {
	BOTTOM_LABEL_GROUP_IDX,
	LEFT_LABEL_GROUP_IDX,
	RIGHT_LABEL_GROUP_IDX,
	TOP_LABEL_GROUP_IDX
} from '../../constants/package-display';

import styles from './labelsFrame.module.scss';

type LabelGroup = Array<Array<string | undefined>>;

function LabelsFrame({
	labelGroups,
	children
}: {
	readonly labelGroups: {
		horizontalLabelsGroup: LabelGroup;
		verticalLabelsGroup: LabelGroup;
	};
	readonly children: React.ReactNode;
}) {
	const {horizontalLabelsGroup, verticalLabelsGroup} = labelGroups;

	return (
		<div
			id='horizontal-labels-container'
			className={styles.horizontalLabelsContainer}
		>
			<div
				id='horizontal-labels-top'
				className={styles.horizontalLabels}
			>
				{horizontalLabelsGroup[TOP_LABEL_GROUP_IDX].map(
					(label, i) => (
						<div key={`gridLabel-top-${i}`}>{label}</div>
					)
				)}
			</div>
			<div
				id='vertical-labels-container'
				className={styles.verticalLabelsContainer}
			>
				<div
					id='vertical-labels-left'
					className={styles.verticalLabels}
				>
					{verticalLabelsGroup[LEFT_LABEL_GROUP_IDX].map(
						(label, i) => (
							<div key={`keyLable-left-${i}`}>{label}</div>
						)
					)}
				</div>
				{/* Pin Grid Display */}
				{children}
				<div
					id='vertical-labels-right'
					className={styles.verticalLabels}
				>
					{verticalLabelsGroup[RIGHT_LABEL_GROUP_IDX].map(
						(label, i) => (
							<div key={`gridLabel-right-${i}`}>{label}</div>
						)
					)}
				</div>
			</div>
			<div
				id='horizontal-labels-bottom'
				className={styles.horizontalLabels}
			>
				{horizontalLabelsGroup[BOTTOM_LABEL_GROUP_IDX].map(
					(label, i) => (
						<div key={`gridLable-bottom-${i}`}>{label}</div>
					)
				)}
			</div>
		</div>
	);
}

export default memo(LabelsFrame);
