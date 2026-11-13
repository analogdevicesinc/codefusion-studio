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
	clampLabelLeft,
	resolveVisibleHorizontalLine
} from '../../common/utils/measurement-tool';
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

type HorizontalLineGeometry = Readonly<{
	horizontalLineLeft: number | undefined;
	horizontalLineWidth: number | undefined;
}>;

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

/**
 * Returns true when the delta label should be rendered.
 */
const isDeltaLabelVisible = (
	state: MeasurementState,
	isHorizontalLineInViewport: boolean
): boolean => {
	if (!state.horizontalLine || !state.horizontalDeltaText) {
		return false;
	}

	return state.isFixedPhase || isHorizontalLineInViewport;
};

/**
 * Computes the left position and width of the horizontal measurement line.
 */
const resolveHorizontalLineGeometry = (
	state: MeasurementState,
	isDeltaLabelVisible: boolean,
	deltaStemLeft: number | undefined,
	overlayWidth: number
): HorizontalLineGeometry => {
	if (!isDeltaLabelVisible || !state.horizontalLine) {
		return {
			horizontalLineLeft: undefined,
			horizontalLineWidth: undefined
		};
	}

	const rawLineLeft = state.horizontalLine.left;
	const rawLineRight =
		state.horizontalLine.left + state.horizontalLine.width;
	const segment = resolveVisibleHorizontalLine(
		rawLineLeft,
		rawLineRight,
		deltaStemLeft,
		overlayWidth
	);

	return {
		horizontalLineLeft: segment.left,
		horizontalLineWidth: segment.width
	};
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

	const isDeltaLabel = isDeltaLabelVisible(
		state,
		isHorizontalLineVisible
	);

	const horizontalLabelCenterX = state.horizontalLine
		? state.horizontalLine.left + state.horizontalLine.width / 2
		: 0;
	const horizontalLabelLeft: number | undefined = isDeltaLabel
		? clampLabelLeft(
				horizontalLabelCenterX,
				widths.horizontal,
				viewport.overlayWidth
			)
		: undefined;

	const deltaStemLeft =
		horizontalLabelLeft !== undefined && widths.horizontal > 0
			? horizontalLabelLeft + widths.horizontal / 2
			: undefined;

	const {horizontalLineLeft, horizontalLineWidth} =
		resolveHorizontalLineGeometry(
			state,
			isDeltaLabel,
			deltaStemLeft,
			viewport.overlayWidth
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
		horizontalLineLeft,
		horizontalLineWidth,
		deltaStemLeft
	};
}
