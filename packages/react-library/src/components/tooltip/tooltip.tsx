/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import {ReactNode, useMemo, useState} from 'react';
import styles from './tooltip.module.scss';

type TooltipProps = {
	readonly title: string;
	readonly children: ReactNode;
	/** Optional a container element to which bounding box this tooltip reacts */
	readonly containerElement?: HTMLElement | null;
	readonly position?: 'top' | 'bottom' | 'left' | 'right';
	readonly width?: number;
	readonly type?: 'short' | 'long';
};

function Tooltip({
	title,
	children,
	position = 'top',
	containerElement,
	width = 192,
	type = 'long'
}: TooltipProps) {
	const [additionalClasses, setAdditionalClasses] =
		useState<string>('');

	const [tooltipContainerElement, setTooltipContainerElement] =
		useState<HTMLElement | null>();

	const [visible, setVisible] = useState(false);

	const actualPosition = useMemo(() => {
		const elementRect =
			tooltipContainerElement?.getBoundingClientRect();
		if (!elementRect) {
			return position;
		}

		setAdditionalClasses('');

		const container = containerElement || document.body;
		const containerRect = container.getBoundingClientRect();

		let adjustedPosition = position;

		if (elementRect.top - 50 < containerRect.top) {
			if (position === 'top') adjustedPosition = 'bottom';
			if (position === 'left' || position === 'right') {
				// TODO add alignment classes for left and right
			}
		} else if (containerRect.bottom - elementRect.bottom < 50) {
			if (position === 'bottom') adjustedPosition = 'top';
			if (position === 'left' || position === 'right') {
				// TODO add alignment classes for left and right
			}
		}
		if (elementRect.left - width / 2 < containerRect.left) {
			if (position === 'left') adjustedPosition = 'right';
			if (position === 'top' || position === 'bottom') {
				setAdditionalClasses(styles.leftAlgin);
			}
		} else if (containerRect.right - elementRect.right < width / 2) {
			if (position === 'right') adjustedPosition = 'left';
			if (position === 'top' || position === 'bottom') {
				setAdditionalClasses(styles.rightAlgin);
			}
		}

		return adjustedPosition;
		// should recalculate when visible changes because the component position could have changed
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		position,
		containerElement,
		tooltipContainerElement,
		visible,
		width
	]);

	return (
		<div
			className={styles.tooltipContainer}
			ref={el => setTooltipContainerElement(el)}
			onMouseEnter={() => setVisible(true)}
			onMouseLeave={() => setVisible(false)}
		>
			{children}
			<span
				style={type === 'short' ? {} : {width: `${width}px`}}
				className={`${styles.tooltip} ${additionalClasses} ${styles[actualPosition]} ${styles[type]}`}
			>
				{title}
			</span>
		</div>
	);
}

export default Tooltip;
