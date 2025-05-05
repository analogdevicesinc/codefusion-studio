/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import {VSCodeProgressRing} from '@vscode/webview-ui-toolkit/react';
import styles from './progress-ring.module.scss';

type ProgressRingProps = React.ComponentProps<
	typeof VSCodeProgressRing
> & {
	readonly dataTest?: string;
	readonly position?: 'start' | 'center';
};

export default function ProgressRing({
	className,
	dataTest,
	position = 'start',
	...props
}: ProgressRingProps) {
	return (
		<div
			className={styles.container}
			style={
				position === 'center' ? {justifyContent: 'center'} : undefined
			}
		>
			<VSCodeProgressRing
				className={className}
				{...(dataTest ? {'data-test': dataTest} : {})}
				{...props}
			/>
		</div>
	);
}
