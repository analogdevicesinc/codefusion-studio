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

import styles from './pincfg-peripheral-tooltip.module.scss';

type PinCfgPeripheralTooltipProps = {
	title: string;
	description: string;
};

export default function PinCfgPeripheralTooltip({
	title,
	description
}: Readonly<PinCfgPeripheralTooltipProps>) {
	const {
		top: itemTop = 0,
		bottom: itemBottom = 0,
		left: itemLeft = 0,
		height: itemHeight = 0
	} = document
		.getElementById(`pincfg-peripheral-${title}`)
		?.getBoundingClientRect() ?? {};

	const {top: containerTop = 0, bottom: containerBottom = 0} =
		document
			.getElementById('peripheral-navigation')
			?.getBoundingClientRect() ?? {};

	const notchHeight = 6;
	const tooltipHeight = 23;
	let top: number | undefined =
		itemTop - containerTop + itemHeight + notchHeight;
	let bottom: number | undefined;

	if (itemBottom + 2 * tooltipHeight > containerBottom) {
		top = undefined;
		bottom = containerBottom - itemTop + notchHeight;
	}

	return (
		<CfsTooltip
			isShowingNotch
			id={`pincfg-peripheral-${title}-tooltip`}
			classNames={styles.peripheralTooltipContainer}
			top={top}
			bottom={bottom}
			left={itemLeft}
		>
			<div>{description}</div>
		</CfsTooltip>
	);
}
