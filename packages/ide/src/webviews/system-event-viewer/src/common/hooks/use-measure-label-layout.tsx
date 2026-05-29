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

import {useLayoutEffect, useRef, useState} from 'react';
import {
	HEADER_HEIGHT,
	HEADER_LABEL_TOP,
	HORIZONTAL_LABEL_MARGIN,
	HORIZONTAL_LINE_HEIGHT,
	TIMESTAMP_LABEL_HEIGHT
} from '../../common/constants/timeline';
import {clampLabelLeft} from '../../common/utils/measurement-tool';
import type {
	MeasureLabelLayout,
	MeasurementState
} from '../types/timeline';
import type {LayoutViewport} from './use-measure-layout-viewport';

type LabelWidths = Readonly<{
	cursor: number;
	start: number;
	end: number;
	horizontal: number;
}>;

type HorizontalSide = 'left' | 'inside' | 'right';

type LineVisibility = Readonly<{
	isStartLineVisible: boolean;
	isEndLineVisible: boolean;
	isHorizontalLineVisible: boolean;
	isCursorVisible: boolean;
}>;

function clampBetween(
	value: number,
	minValue: number,
	maxValue: number
) {
	const lowerBound = Math.min(minValue, maxValue);
	const upperBound = Math.max(minValue, maxValue);

	return Math.max(lowerBound, Math.min(value, upperBound));
}

const isLineVisible = (lineX: number, overlayWidth: number) =>
	lineX >= 0 && lineX <= overlayWidth;

const getHorizontalSide = (
	lineX: number,
	overlayWidth: number
): HorizontalSide => {
	if (lineX < 0) return 'left';

	if (lineX > overlayWidth) return 'right';

	return 'inside';
};

const isHorizontalLineVisible = (
	state: MeasurementState,
	overlayWidth: number
): boolean => {
	if (!state.startLine || !state.endLine) {
		return false;
	}

	const startGuide = getHorizontalSide(
		state.startLine.x,
		overlayWidth
	);
	const endGuide = getHorizontalSide(state.endLine.x, overlayWidth);
	const areOutsideOnSameSide =
		startGuide === endGuide && startGuide !== 'inside';

	return !areOutsideOnSameSide;
};

const getLineVisibility = (
	state: MeasurementState,
	overlayWidth: number
): LineVisibility => {
	const isStartLineVisible =
		state.startLine === undefined
			? false
			: isLineVisible(state.startLine.x, overlayWidth);
	const isEndLineVisible =
		state.endLine === undefined
			? false
			: isLineVisible(state.endLine.x, overlayWidth);
	const isArmedPhase =
		!state.isFixedPhase && state.startLine === undefined;
	const isCursorVisible =
		isArmedPhase ||
		(state.cursorGuide
			? isLineVisible(state.cursorGuide.x, overlayWidth)
			: false);

	return {
		isStartLineVisible,
		isEndLineVisible,
		isHorizontalLineVisible: isHorizontalLineVisible(
			state,
			overlayWidth
		),
		isCursorVisible
	};
};

const getHorizontalLayout = (
	state: MeasurementState,
	viewport: LayoutViewport,
	isHorizontalLineVisible: boolean
): {
	horizontalLabelTop: number | undefined;
	horizontalLineTop: number | undefined;
} => {
	let horizontalLabelTop: number | undefined;
	let horizontalLineTop: number | undefined;

	if (
		state.horizontalLine &&
		state.horizontalDeltaText &&
		isHorizontalLineVisible
	) {
		const rawLabelTop =
			state.horizontalLine.top -
			TIMESTAMP_LABEL_HEIGHT -
			HORIZONTAL_LABEL_MARGIN;
		const minLabelTop = viewport.viewportTop + HEADER_HEIGHT;

		if (viewport.viewportBottom > viewport.viewportTop) {
			const maxLabelTop =
				viewport.viewportBottom -
				TIMESTAMP_LABEL_HEIGHT -
				HORIZONTAL_LABEL_MARGIN -
				HORIZONTAL_LINE_HEIGHT;

			horizontalLabelTop = clampBetween(
				rawLabelTop,
				minLabelTop,
				maxLabelTop
			);
		} else {
			horizontalLabelTop = rawLabelTop;
		}

		horizontalLineTop =
			horizontalLabelTop +
			TIMESTAMP_LABEL_HEIGHT +
			HORIZONTAL_LABEL_MARGIN;
	}

	return {horizontalLabelTop, horizontalLineTop};
};

export default function useLabelLayout(
	state: MeasurementState,
	viewport: LayoutViewport
): MeasureLabelLayout {
	const cursorLabelRef = useRef<HTMLDivElement>(null);
	const startLabelRef = useRef<HTMLDivElement>(null);
	const endLabelRef = useRef<HTMLDivElement>(null);
	const horizontalLabelRef = useRef<HTMLDivElement>(null);
	const [widths, setWidths] = useState<LabelWidths>({
		cursor: 0,
		start: 0,
		end: 0,
		horizontal: 0
	});

	useLayoutEffect(() => {
		const nextWidths = {
			cursor: cursorLabelRef.current?.offsetWidth ?? 0,
			start: startLabelRef.current?.offsetWidth ?? 0,
			end: endLabelRef.current?.offsetWidth ?? 0,
			horizontal: horizontalLabelRef.current?.offsetWidth ?? 0
		};

		setWidths(prev => {
			if (
				prev.cursor === nextWidths.cursor &&
				prev.start === nextWidths.start &&
				prev.end === nextWidths.end &&
				prev.horizontal === nextWidths.horizontal
			) {
				return prev;
			}

			return nextWidths;
		});
	}, [
		state.cursorLabelText,
		state.startLabelText,
		state.endLabelText,
		state.horizontalDeltaText
	]);

	const {
		isStartLineVisible,
		isEndLineVisible,
		isHorizontalLineVisible,
		isCursorVisible
	} = getLineVisibility(state, viewport.overlayWidth);

	const cursorLabelLeft =
		state.cursorGuide && state.cursorLabelText && isCursorVisible
			? clampLabelLeft(
					state.cursorGuide.x,
					widths.cursor,
					viewport.overlayWidth
				)
			: undefined;
	const startLabelLeft =
		state.startLine && state.startLabelText && isStartLineVisible
			? clampLabelLeft(
					state.startLine.x,
					widths.start,
					viewport.overlayWidth
				)
			: undefined;
	const endLabelLeft =
		state.endLine && state.endLabelText && isEndLineVisible
			? clampLabelLeft(
					state.endLine.x,
					widths.end,
					viewport.overlayWidth
				)
			: undefined;

	const horizontalLabelLeft =
		state.horizontalLine &&
		state.horizontalDeltaText &&
		isHorizontalLineVisible
			? clampLabelLeft(
					state.horizontalLine.left + state.horizontalLine.width / 2,
					widths.horizontal,
					viewport.overlayWidth
				)
			: undefined;

	const {horizontalLabelTop, horizontalLineTop} = getHorizontalLayout(
		state,
		viewport,
		isHorizontalLineVisible
	);

	return {
		cursorLabelRef,
		startLabelRef,
		endLabelRef,
		horizontalLabelRef,
		cursorLabelLeft,
		startLabelLeft,
		endLabelLeft,
		horizontalLabelLeft,
		horizontalLabelTop,
		horizontalLineTop,
		verticalLabelTop: viewport.viewportTop + HEADER_LABEL_TOP
	};
}
