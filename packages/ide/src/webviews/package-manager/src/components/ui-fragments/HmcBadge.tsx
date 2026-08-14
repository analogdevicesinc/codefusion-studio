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

import type React from 'react';
import styles from './hmc-badge.module.scss';

type HmcBadgeProps = {
	readonly children?: React.ReactNode;
	readonly className?: string;
};

export default function HmcBadge({
	children,
	className
}: HmcBadgeProps) {
	return (
		<span
			className={`${styles.badge} ${className ?? styles.defaultText}`}
		>
			{children}
		</span>
	);
}
