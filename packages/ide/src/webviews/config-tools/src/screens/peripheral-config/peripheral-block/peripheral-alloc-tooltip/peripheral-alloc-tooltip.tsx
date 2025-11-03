/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import styles from './peripheral-alloc-tooltip.module.scss';

type PeripheralTooltipProps = {
	title: string;
	description: string;
};

export default function PeripheralAllocTooltip({
	title,
	description
}: Readonly<PeripheralTooltipProps>) {
	const {
		top: itemTop = 0,
		bottom: itemBottom = 0,
		left: itemLeft = 0,
		height: itemHeight = 0
	} = document
		.getElementById(`peripheral-${title}`)
		?.getBoundingClientRect() ?? {};

	const {top: containerTop = 0, bottom: containerBottom = 0} =
		document
			.getElementById('peripheral-list-container')
			?.getBoundingClientRect() ?? {};

	// Take into account the height of the filter container because the `position: relative` is applied to the `.sidebarWrapper`
	const {height: filterContainerHeight = 0} =
		document
			.getElementById('side-peripheral-list:filterControlsContainer')
			?.getBoundingClientRect() ?? {};

	const notchHeight = 6;
	const tooltipHeight = 23;
	let top: number | undefined =
		itemTop -
		containerTop +
		itemHeight +
		notchHeight +
		filterContainerHeight;
	let bottom: number | undefined;

	if (itemBottom + 2 * tooltipHeight > containerBottom) {
		top = undefined;
		bottom = containerBottom - itemTop + notchHeight;
	}

	return (
		<CfsTooltip
			isShowingNotch
			id={`peripheral-block-${title}-tooltip`}
			classNames={styles.peripheralTooltipContainer}
			top={top}
			bottom={bottom}
			left={itemLeft}
		>
			<div>{description}</div>
		</CfsTooltip>
	);
}
