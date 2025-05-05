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
import CfsTooltip from '@common/components/cfs-tooltip/CfsTooltip';
import type {HoveredClockInfo} from '../types/canvas';
import {gap, notchHeight, tipOffset} from '../constants/tooltip';
import {getFormattedClockFrequency} from '../utils/format-schematic-data';
import {getClockFrequencyDictionary} from '../../../utils/rpn-expression-resolver';
import {getClockConfig} from '../../../utils/clock-nodes';

import styles from './ClockTooltip.module.scss';

type PositionedClockTooltipProps = {
	readonly hoveredClockInfo: HoveredClockInfo;
	readonly containerRef: React.RefObject<HTMLDivElement>;
	readonly mousePosition: {x: number; y: number};
};

function ClockTooltip({
	hoveredClockInfo,
	containerRef,
	mousePosition
}: PositionedClockTooltipProps) {
	const hoveredEl = document.getElementById(
		hoveredClockInfo?.id ?? ''
	);

	const hoveredPathPosition = hoveredEl
		?.querySelector('path')
		?.getBoundingClientRect();

	const containerPosition =
		containerRef.current?.getBoundingClientRect();

	if (
		hoveredClockInfo === undefined ||
		hoveredPathPosition === undefined ||
		!containerPosition
	)
		return null;

	const {startPoint, endPoint} = hoveredClockInfo;
	const isVertical = startPoint.x === endPoint.x;
	const mouseX = mousePosition.x - containerPosition.left;
	const mouseY = mousePosition.y - containerPosition.top;

	const x = isVertical
		? hoveredPathPosition.left -
			containerPosition.left -
			(tipOffset + notchHeight)
		: mouseX - tipOffset;

	const y = isVertical
		? mouseY + gap
		: hoveredPathPosition.bottom -
			containerPosition.top +
			(notchHeight + gap);

	const headerString = `${getClockConfig(hoveredClockInfo.clock)?.Description ?? ''} (${hoveredClockInfo.clock})`;

	return (
		<CfsTooltip
			id={headerString}
			classNames={styles.root}
			header={headerString}
			top={y}
			left={x}
		>
			{getFormattedClockFrequency(
				getClockFrequencyDictionary()[hoveredClockInfo.clock] ?? ' '
			)}
		</CfsTooltip>
	);
}

export default ClockTooltip;
