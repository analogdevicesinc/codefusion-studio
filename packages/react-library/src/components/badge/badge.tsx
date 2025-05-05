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

import React from 'react';
import {VSCodeBadge} from '@vscode/webview-ui-toolkit/react';
import styles from './badge.module.scss';

type BadgeProps = React.ComponentProps<typeof VSCodeBadge> & {
	readonly dataTest?: string;
	readonly appearance?: 'primary' | 'secondary';
};

export default function Badge({
	className,
	dataTest,
	appearance = 'primary',
	children
}: BadgeProps) {
	return (
		<VSCodeBadge
			className={`${className} ${appearance === 'secondary' ? styles.secondary : undefined}`}
			{...(dataTest ? {'data-test': dataTest} : {})}
		>
			{children}
		</VSCodeBadge>
	);
}
