/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import {useTooltipDebouncedHover} from '../../../../hooks/use-tooltip-debounced-hover';

import styles from './pincfg-signal-label.module.scss';

export type PinCfgSignalLabelProps = Readonly<{
	containerId: string;
	label: string;
	description: string;
}>;

export default function PinCfgSignalLabel({
	containerId,
	label,
	description
}: PinCfgSignalLabelProps) {
	const {isHovered, displayTooltip, hideTooltip} =
		useTooltipDebouncedHover(800);

	const {
		top: itemTop = 0,
		left: itemLeft = 0,
		bottom: itemBottom = 0,
		height: itemHeight = 0
	} = document
		.getElementById(`pincfg-signal-${label}`)
		?.getBoundingClientRect() ?? {};

	const {
		top: containerTop = 0,
		left: containerLeft = 0,
		bottom: containerBottom = 0
	} = document.getElementById(containerId)?.getBoundingClientRect() ??
	{};

	const notchHeight = 6;
	const tooltipHeight = 23;
	let top: number | undefined =
		itemTop - containerTop + itemHeight + notchHeight + 8;
	const left = itemLeft - containerLeft;
	let bottom: number | undefined = undefined;

	if (itemBottom + 2 * tooltipHeight > containerBottom) {
		top = undefined;
		bottom = containerBottom - itemTop + notchHeight;
	}

	return (
		<div
			className={styles.pinLabelContainer}
			onMouseEnter={() => {
				displayTooltip();
			}}
			onMouseLeave={() => {
				hideTooltip();
			}}
		>
			<div className={styles.label} id={`pincfg-signal-${label}`}>
				{label}
			</div>
			{isHovered && description && (
				<CfsTooltip
					isShowingNotch
					id={`pincfg-signal-${label}-tooltip`}
					classNames={styles.peripheralTooltipContainer}
					top={top}
					bottom={bottom}
					left={left}
				>
					<div>{description}</div>
				</CfsTooltip>
			)}
		</div>
	);
}
