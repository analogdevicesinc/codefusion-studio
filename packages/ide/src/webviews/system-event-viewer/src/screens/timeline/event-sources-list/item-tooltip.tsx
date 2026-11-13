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

import {useLayoutEffect, useState} from 'react';
import CfsTooltip from '@common/components/cfs-tooltip/CfsTooltip';

import styles from './event-sources-list.module.scss';

type ItemTooltipProps = Readonly<{
	id: string;
	anchorRef: React.RefObject<HTMLElement>;
	children: React.ReactNode;
}>;

type TooltipPosition = {
	top?: number;
	bottom?: number;
	left: number;
};

/** Positions a tooltip outside the clipped row content, relative to its list. */
export default function ItemTooltip({
	id,
	anchorRef,
	children
}: ItemTooltipProps): React.JSX.Element {
	const [position, setPosition] = useState<TooltipPosition>({
		top: 0,
		left: 0
	});

	useLayoutEffect(() => {
		const anchor = anchorRef.current;
		const list = anchor?.closest('ul');
		const tooltip = document.getElementById(`tooltip-${id}`);
		if (!anchor || !list || !tooltip) return;

		const anchorRect = anchor.getBoundingClientRect();
		const listRect = list.getBoundingClientRect();
		const tooltipRect = tooltip.getBoundingClientRect();
		let visibleTop = 0;
		let visibleBottom = window.innerHeight;
		let ancestor = list.parentElement;

		// The list can be taller than the visible, scrollable timeline.
		while (ancestor) {
			if (getComputedStyle(ancestor).overflowY !== 'visible') {
				const rect = ancestor.getBoundingClientRect();

				visibleTop = Math.max(visibleTop, rect.top);
				visibleBottom = Math.min(visibleBottom, rect.bottom);
			}

			ancestor = ancestor.parentElement;
		}

		const gap = 6;
		const spaceBelow = visibleBottom - anchorRect.bottom;
		const spaceAbove = anchorRect.top - visibleTop;
		const showAbove =
			spaceBelow < tooltipRect.height + gap &&
			spaceAbove > spaceBelow;
		const left = Math.max(
			8,
			Math.min(
				anchorRect.left,
				window.innerWidth - tooltipRect.width - 8
			)
		);

		setPosition({
			top: showAbove
				? undefined
				: anchorRect.bottom - listRect.top + gap,
			bottom: showAbove
				? listRect.bottom - anchorRect.top + gap
				: undefined,
			left: left - listRect.left
		});
	}, [anchorRef, children, id]);

	return (
		<CfsTooltip
			isShowingNotch
			id={id}
			classNames={styles.tooltip}
			top={position.top}
			bottom={position.bottom}
			left={position.left}
		>
			{children}
		</CfsTooltip>
	);
}
