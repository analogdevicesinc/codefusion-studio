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
import {type ReactNode, useLayoutEffect, useRef} from 'react';
import styles from './tooltip.module.scss';

function CfsTooltip({
	id,
	header,
	top,
	bottom,
	left,
	classNames,
	children
}: {
	readonly id: string;
	readonly header: ReactNode | string;
	readonly top?: number;
	readonly bottom?: number;
	readonly left?: number;
	readonly children?: ReactNode;
	readonly classNames?: string;
}) {
	const tooltipBodyRef = useRef<HTMLDivElement>(null);
	const tooltipContainerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const tooltipBody = tooltipBodyRef.current;
		const tooltipContainer = tooltipContainerRef.current;

		if (!tooltipBody || !tooltipContainer) return;

		const {right: tooltipBodyRight} =
			tooltipBody.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const offset = 16;

		if (tooltipBodyRight > viewportWidth) {
			tooltipBody.style.left = `${viewportWidth - tooltipBodyRight - offset}px`;
		}
	}, []);

	return (
		<div
			ref={tooltipContainerRef}
			id={`tooltip-${id}`}
			className={`${styles.tooltipContainer}${classNames ? ` ${classNames}` : ''}`}
			style={{
				top: top ?? 'unset',
				left: left ?? 0,
				bottom: bottom ?? 'unset'
			}}
		>
			<div className={styles.tooltipLayout}>
				<div
					className={styles.notchBorder}
					style={{
						top: top ? '-12px' : 'unset',
						bottom: bottom ? '-12px' : 'unset',
						transform: bottom ? 'rotate(180deg)' : 'unset'
					}}
				/>
				<div
					className={styles.notch}
					style={{
						top: top ? '-11px' : 'unset',
						bottom: bottom ? '-11px' : 'unset',
						transform: bottom ? 'rotate(180deg)' : 'unset'
					}}
				/>
				<div ref={tooltipBodyRef} className={styles.contentWrapper}>
					<div className={styles.header}>{header}</div>
					<div className={styles.body}>{children}</div>
				</div>
			</div>
		</div>
	);
}

export default CfsTooltip;
