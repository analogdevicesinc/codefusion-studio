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
import { type ReactNode, useLayoutEffect, useRef } from 'react';
import styles from './streamTooltip.module.scss';

function StreamTooltip({
	id,
	header,
	top,
	bottom,
	left,
	classNames,
	children,
	zoomLevel,
}: {
	readonly id: string;
	readonly header?: ReactNode | string;
	readonly top?: number;
	readonly bottom?: number;
	readonly left?: number;
	readonly children?: ReactNode;
	readonly classNames?: string;
	readonly zoomLevel?: number;
}) {
	const tooltipBodyRef = useRef<HTMLDivElement>(null);
	const tooltipContainerRef = useRef<HTMLDivElement>(null);

	useLayoutEffect(() => {
		const tooltipBody = tooltipBodyRef.current;
		const tooltipContainer = tooltipContainerRef.current;

		if (!tooltipBody || !tooltipContainer) return;

		const { right: tooltipBodyRight } =
			tooltipBody.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const offset = 16;

		if (tooltipBodyRight > viewportWidth) {
			tooltipBody.style.left = `${(viewportWidth - tooltipBodyRight - offset) / (zoomLevel ?? 1)}px`;
		}
	}, [zoomLevel]);

	return (
		<div
			ref={tooltipContainerRef}
			id={`stream-tooltip-${id}`}
			className={`${styles.tooltipContainer}${classNames ? ` ${classNames}` : ''}`}
			style={{
				top: top ?? 'unset',
				left: left ?? 0,
				bottom: bottom ?? 'unset'
			}}
		>
			<div className={styles.tooltipLayout}>
				<div ref={tooltipBodyRef} className={styles.contentWrapper}>
					{header && <div data-test="tooltip-header" className={styles.header}>{header}</div>}
					<div className={styles.body} data-test="tooltip-body">{children}</div>
				</div>
			</div>
		</div>
	);
}

export default StreamTooltip;
