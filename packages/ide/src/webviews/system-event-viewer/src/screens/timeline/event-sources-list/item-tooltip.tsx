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

import CfsTooltip from '@common/components/cfs-tooltip/CfsTooltip';
import {EV_SOURCES_LIST_CONTENT_ID as CONTENT_LIST_ID} from '../../../common/constants/timeline';

import styles from './event-sources-list.module.scss';

type ItemTooltipProps = Readonly<{
	index: number;
	name: string;
}>;

export default function ItemTooltip({index, name}: ItemTooltipProps) {
	const {
		top: itemTop = 0,
		left: itemLeft = 0,
		bottom: itemBottom = 0,
		height: itemHeight = 0
	} = document
		.getElementById(`event-source-item-container:${index}`)
		?.getBoundingClientRect() ?? {};

	const {
		top: listTop = 0,
		left: listLeft = 0,
		bottom: listBottom = 0
	} = document
		.getElementById(`${CONTENT_LIST_ID}`)
		?.getBoundingClientRect() ?? {};

	const notchHeight = 6;
	const tooltipHeight = 23;
	let top: number | undefined =
		itemTop - listTop + itemHeight + notchHeight;
	const left = itemLeft - listLeft;
	let bottom: number | undefined;

	if (itemBottom + 2 * tooltipHeight > listBottom) {
		top = undefined;
		bottom = listBottom - itemTop + notchHeight;
	}

	return (
		<CfsTooltip
			isShowingNotch
			id={`event-source-item-tooltip:${index}`}
			classNames={styles.tooltip}
			top={top}
			bottom={bottom}
			left={left}
		>
			<h5 className={styles.name}>{name}</h5>
		</CfsTooltip>
	);
}
