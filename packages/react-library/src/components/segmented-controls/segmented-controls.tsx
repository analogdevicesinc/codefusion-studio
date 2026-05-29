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

import React from 'react';
import styles from './segmented-controls.module.scss';
import Tooltip from '../tooltip/tooltip';

export type SegmentOption = {
	readonly key: string;
	readonly content: React.ReactNode;
	readonly tooltip?: string;
	readonly disabled?: boolean;
	readonly onClick: () => void;
	readonly ariaLabel?: string;
};

type SegmentedControlsProps = {
	readonly options: SegmentOption[];
	readonly dataTest?: string;
	readonly className?: string;
	readonly ariaLabel?: string;
};

export default function SegmentedControls({
	options,
	dataTest = 'segmented-controls',
	className,
	ariaLabel
}: SegmentedControlsProps) {
	return (
		<div
			className={`${styles.container} ${className ?? ''}`}
			{...(dataTest ? {'data-test': dataTest} : {})}
			role='toolbar'
			aria-label={ariaLabel ?? 'Action toolbar'}
		>
			{options.map((option, i) => {
				const button = (
					<button
						key={option.key}
						data-test={`${dataTest}:${option.key}`}
						className={`${styles.segmentButton} ${i === 0 ? styles.first : ''} ${i === options.length - 1 ? styles.last : ''}`}
						onClick={option.onClick}
						disabled={option.disabled}
						type='button'
						aria-label={option.ariaLabel}
					>
						{option.content}
					</button>
				);

				return option.tooltip ? (
					<Tooltip
						key={option.key}
						title={option.tooltip}
						type='short'
					>
						{button}
					</Tooltip>
				) : (
					button
				);
			})}
		</div>
	);
}
