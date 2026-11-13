/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {NOTCH_POS} from '../../constants/tooltip';

type NotchPos = (typeof NOTCH_POS)[keyof typeof NOTCH_POS];

function computeTooltipStyling(
	offsetPx: number,
	top?: number,
	bottom?: number,
	notchPos?: NotchPos
): React.CSSProperties {
	return {
		top: top ? `-${offsetPx}px` : 'unset',
		bottom: bottom ? `-${offsetPx}px` : 'unset',
		transform: bottom ? 'rotate(180deg)' : 'unset',
		left: notchPos === NOTCH_POS.RIGHT ? 'unset' : '16px',
		right: notchPos === NOTCH_POS.RIGHT ? '16px' : 'unset'
	};
}

function CfsTooltip({
	id,
	header,
	top,
	bottom,
	left,
	classNames,
	children,
	isShowingNotch = true,
	notchPos = NOTCH_POS.LEFT
}: Readonly<{
	id: string;
	header?: ReactNode | string;
	top?: number;
	bottom?: number;
	left?: number;
	children?: ReactNode;
	classNames?: string;
	isShowingNotch?: boolean;
	notchPos?: NotchPos;
}>) {
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
			tooltipBody.style.left = `${
				viewportWidth - tooltipBodyRight - offset
			}px`;
		}
	}, []);

	return (
		<div
			ref={tooltipContainerRef}
			id={`tooltip-${id}`}
			className={`${styles.tooltipContainer}${
				classNames ? ` ${classNames}` : ''
			}`}
			style={{
				top: top ?? 'unset',
				left: left ?? 0,
				bottom: bottom ?? 'unset'
			}}
		>
			<div className={styles.tooltipLayout}>
				{isShowingNotch && (
					<>
						<div
							className={styles.notchBorder}
							style={computeTooltipStyling(12, top, bottom, notchPos)}
						/>
						<div
							className={styles.notch}
							style={computeTooltipStyling(11, top, bottom, notchPos)}
						/>
					</>
				)}
				<div ref={tooltipBodyRef} className={styles.contentWrapper}>
					{header && <div className={styles.header}>{header}</div>}
					<div className={styles.body}>{children}</div>
				</div>
			</div>
		</div>
	);
}

export default CfsTooltip;
