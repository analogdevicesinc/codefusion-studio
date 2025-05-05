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
import {type PinStatus} from '../../../types/pins';
import type {
	PinSignal,
	PinCanvas,
	Pin
} from '@common/types/soc';
import {
	LEFT_LABEL_GROUP_IDX,
	RIGHT_LABEL_GROUP_IDX,
	TOP_LABEL_GROUP_IDX,
	BOTTOM_LABEL_GROUP_IDX
} from '../constants/package-display';

export function generateLabelGroups(canvas: PinCanvas | undefined) {
	if (canvas === undefined) {
		return {verticalLabelsGroup: [], horizontalLabelsGroup: []};
	}

	// We can have a maximum of 2 vertical label columns (left/right) and 2 horizontal label rows (top/bottom)
	// We categorize them into 2 groups: vertical and horizontal, each group with 2 columns/rows
	// using the canvas height/width, we determine the number of labels per column/row
	const verticalLabelsGroup: Array<Array<string | undefined>> =
		Array.from({length: 2}, () =>
			Array.from({length: canvas.Height}, () => undefined)
		);

	const horizontalLabelsGroup: Array<Array<string | undefined>> =
		Array.from({length: 2}, () =>
			Array.from({length: canvas.Width}, () => undefined)
		);

	// We traverse the labels array and place them into their corresponding group based on their x/y position
	// When either x or y === -1, the label will be either in the left or top
	// When either x or y === the canvas width/height, the label will be either in the right or bottom
	canvas.Labels.forEach(label => {
		const {X, Y} = label;

		if (X === -1) {
			verticalLabelsGroup[LEFT_LABEL_GROUP_IDX][Y] = label.Text;
		} else if (X === canvas.Width) {
			verticalLabelsGroup[RIGHT_LABEL_GROUP_IDX][Y] = label.Text;
		} else if (Y === -1) {
			horizontalLabelsGroup[TOP_LABEL_GROUP_IDX][X] = label.Text;
		} else if (Y === canvas.Height) {
			horizontalLabelsGroup[BOTTOM_LABEL_GROUP_IDX][X] = label.Text;
		}
	});

	return {verticalLabelsGroup, horizontalLabelsGroup};
}

export function createPinGridDataStructure(
	pins: Pin[],
	canvas: PinCanvas | undefined
) {
	if (canvas === undefined) {
		return [];
	}

	const twoDimArray: Array<Array<Pin | undefined>> = Array.from(
		{length: canvas.Height},
		() => Array.from({length: canvas.Width}, () => undefined)
	);

	pins.forEach(pin => {
		const {X, Y} = pin.Position;

		twoDimArray[Y][X] = pin;
	});

	return twoDimArray;
}

export function getPinStatus(
	signals: PinSignal[] | undefined
): PinStatus {
	if (signals?.length === 0 || signals === undefined) {
		return 'unassigned';
	}

	if (signals?.length > 1) {
		return 'conflict';
	}

	return 'assigned';

	// Potential conflict TBD
}
