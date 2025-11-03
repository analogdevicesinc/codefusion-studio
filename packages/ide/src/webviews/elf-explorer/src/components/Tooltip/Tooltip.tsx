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
import styles from './Tooltip.module.scss';
import {useState, useRef, useEffect} from 'react';
import type React from 'react';

type TooltipContent = {
	readonly title?: string;
	readonly description?: string;
};

type TooltipProps = {
	readonly content: TooltipContent;
	readonly containerPosition: 'absolute' | 'relative';
	readonly children: React.ReactNode;
};

type PositionType = {
	left: string | number;
	right: string | number;
	bottom: string;
	top: string;
};

export default function Tooltip({
	content,
	containerPosition,
	children
}: TooltipProps) {
	const [visible, setVisible] = useState(false);
	const tooltipRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<PositionType>({
		left: '50%',
		right: 'auto',
		bottom: 'auto',
		top: 'auto'
	});

	useEffect(() => {
		if (visible && tooltipRef.current) {
			const tooltipRect = tooltipRef.current.getBoundingClientRect();
			const viewportWidth = window.innerWidth;

			// Calculate if the tooltip goes out of the right viewport edge
			if (tooltipRect.right > viewportWidth) {
				setPosition(prev => ({
					...prev,
					left: 'auto',
					right: '50%'
				}));
			}

			if (tooltipRect.bottom > window.innerHeight) {
				setPosition(prev => ({
					...prev,
					top: 'auto',
					bottom: '50%'
				}));
			}
		}
	}, [visible]);

	return (
		<div
			data-test='tooltip:container'
			className={styles.tooltipContainer}
			style={{
				position: containerPosition ? containerPosition : 'absolute'
			}}
			onMouseEnter={() => {
				setVisible(true);
			}}
			onMouseLeave={() => {
				setVisible(false);
				setPosition({
					left: '50%',
					right: 'auto',
					bottom: 'auto',
					top: 'auto'
				});
			}}
		>
			{children}
			{visible && (
				<div
					ref={tooltipRef}
					className={styles.tooltipContent}
					style={{
						left: `${position.left}`,
						right: `${position.right}`,
						bottom: position.bottom,
						top: position.top
					}}
				>
					{content?.title && (
						<h3 data-test='tooltip:title'>{content?.title}</h3>
					)}
					{content?.description && (
						<div
							// Since the JSON is stored inside the code base there aren't security concerns
							// eslint-disable-next-line react/no-danger
							dangerouslySetInnerHTML={{__html: content?.description}}
						/>
					)}
				</div>
			)}
		</div>
	);
}
