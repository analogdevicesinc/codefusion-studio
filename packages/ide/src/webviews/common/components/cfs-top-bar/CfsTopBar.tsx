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
import React, {type ReactNode} from 'react';
import {isReactElement} from '../../utils';

import styles from './CfsTopBar.module.scss';

type CfsTopBarProps = {
	readonly children: ReactNode;
};

export default function CfsTopBar({children}: CfsTopBarProps) {
	const startSlot: ReactNode[] = [];
	const centerSlot: ReactNode[] = [];
	const endSlot: ReactNode[] = [];
	const modalSlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props;

			if (slot === 'start') {
				startSlot.push(child);
			} else if (slot === 'center') {
				centerSlot.push(child);
			} else if (slot === 'end') {
				endSlot.push(child);
			} else if (slot === 'modal') {
				modalSlot.push(child);
			}
		}
	});

	return (
		<div
			className={styles.container}
			data-test='cfs-top-bar:container'
		>
			<div className={styles['start-slot']}>{startSlot}</div>
			<div className={styles.title}>{centerSlot}</div>
			<div className={styles['end-slot']}>{endSlot}</div>
			<div>{modalSlot}</div>
		</div>
	);
}
