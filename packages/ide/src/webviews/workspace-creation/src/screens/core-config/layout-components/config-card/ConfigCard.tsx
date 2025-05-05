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
import type {ReactNode} from 'react';
import {isReactElement} from '@common/utils';

import styles from './ConfigCard.module.scss';

type TConfigCardProps = {
	readonly children: ReactNode;
};

export default function ConfigCard({children}: TConfigCardProps) {
	const titleSlot: ReactNode[] = [];
	const bodySlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props;

			if (slot === 'title') {
				titleSlot.push(child);
			} else bodySlot.push(child);
		}
	});

	return (
		<div className={styles['config-card-container']}>
			{titleSlot.length ? (
				<h3 className={styles['config-card-title']}>{titleSlot}</h3>
			) : null}
			<div className={styles['config-card-content']}>{bodySlot}</div>
		</div>
	);
}
