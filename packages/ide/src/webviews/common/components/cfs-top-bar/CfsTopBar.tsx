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
import React, {type ReactNode, type ReactElement} from 'react';
import styles from './CfsTopBar.module.scss';

type CfsTopBarProps = {
	readonly children: ReactNode;
	readonly title: string | ReactNode;
};

const isReactElement = (
	child: ReactNode
): child is ReactElement<any, string> => React.isValidElement(child);

export default function CfsTopBar({children, title}: CfsTopBarProps) {
	const startSlot: ReactNode[] = [];
	const endSlot: ReactNode[] = [];
	const modalSlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props;

			if (slot === 'start') {
				startSlot.push(child);
			} else if (slot === 'end') {
				endSlot.push(child);
			} else if (slot === 'modal') {
				modalSlot.push(child);
			}
		}
	});

	return (
		<div className={styles.container}>
			<div className={styles['start-slot']}>{startSlot}</div>
			<div className={styles.title}>{title}</div>
			<div className={styles['end-slot']}>{endSlot}</div>
			<div>{modalSlot}</div>
		</div>
	);
}
