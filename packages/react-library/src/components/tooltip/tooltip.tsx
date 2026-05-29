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

import {
	ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState
} from 'react';
import styles from './tooltip.module.scss';

type TooltipProps = {
	readonly title: string;
	readonly children: ReactNode;
	/** Optional container element ID to which bounding box this tooltip reacts */
	readonly containerId?: string;
	readonly position?: 'top' | 'bottom' | 'left' | 'right';
	readonly width?: number;
	readonly type?: 'short' | 'long';
	readonly disabled?: boolean;
};

function Tooltip({
	title,
	children,
	position = 'top',
	containerId,
	width = 192,
	type = 'long',
	disabled = false
}: TooltipProps) {
	const [additionalClasses, setAdditionalClasses] =
		useState<string>('');

	const [tooltipContainerElement, setTooltipContainerElement] =
		useState<HTMLElement | null>();

	const [visible, setVisible] = useState(false);
	const [actualPosition, setActualPosition] = useState(position);
	const tooltipTimeoutRef = useRef<
		ReturnType<typeof setTimeout> | undefined
	>(undefined);

	useLayoutEffect(() => {
		if (!visible || !tooltipContainerElement) {
			setActualPosition(position);
			return;
		}

		const elementRect =
			tooltipContainerElement.getBoundingClientRect();

		const container = containerId
			? document.getElementById(containerId)
			: null;

		const containerRect = (
			container || document.body
		).getBoundingClientRect();

		let adjustedPosition = position;
		let classes = '';

		if (elementRect.top - 50 < containerRect.top) {
			if (position === 'top') adjustedPosition = 'bottom';
		} else if (containerRect.bottom - elementRect.bottom < 50) {
			if (position === 'bottom') adjustedPosition = 'top';
		}

		if (elementRect.left - width / 2 < containerRect.left) {
			if (position === 'left') adjustedPosition = 'right';
			if (position === 'top' || position === 'bottom') {
				classes = styles.leftAlign;
			}
		} else if (containerRect.right - elementRect.right < width / 2) {
			if (position === 'right') adjustedPosition = 'left';
			if (position === 'top' || position === 'bottom') {
				classes = styles.rightAlign;
			}
		}

		setAdditionalClasses(classes);
		setActualPosition(adjustedPosition);
	}, [
		visible,
		tooltipContainerElement,
		position,
		containerId,
		width
	]);

	const clearTooltipTimeout = () => {
		if (tooltipTimeoutRef.current) {
			clearTimeout(tooltipTimeoutRef.current);
			tooltipTimeoutRef.current = undefined;
		}
	};

	const handleMouseEnter = () => {
		tooltipTimeoutRef.current = setTimeout(() => {
			setVisible(true);
		}, 400);
	};

	const handleMouseLeave = () => {
		clearTooltipTimeout();
		setVisible(false);
	};

	useEffect(() => {
		return clearTooltipTimeout;
	}, []);

	return (
		<div
			className={styles.tooltipContainer}
			ref={el => setTooltipContainerElement(el)}
			onMouseEnter={handleMouseEnter}
			onMouseLeave={handleMouseLeave}
		>
			{children}
			{visible && !disabled && (
				<span
					style={type === 'short' ? {} : {width: `${width}px`}}
					className={`${styles.tooltip} ${additionalClasses} ${styles[actualPosition]} ${styles[type]}`}
				>
					{title}
				</span>
			)}
		</div>
	);
}

export default Tooltip;
