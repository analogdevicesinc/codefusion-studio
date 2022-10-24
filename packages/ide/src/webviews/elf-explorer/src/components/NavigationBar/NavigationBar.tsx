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
import styles from './NavigationBar.module.scss';

type TNavigationBarProps = {
	readonly children: ReactNode;
	readonly title: string;
};

const isReactElement = (
	child: ReactNode
): child is ReactElement<any, string> => React.isValidElement(child);

export default function CfsHeaderBar({
	children,
	title
}: TNavigationBarProps) {
	const startSlot: ReactNode[] = [];
	const endSlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props;

			if (slot === 'start') {
				startSlot.push(child);
			} else if (slot === 'end') {
				endSlot.push(child);
			}
		}
	});

	return (
		<div className={styles['navigation-bar']}>
			<div className={styles['start-slot']}>{startSlot}</div>
			<article className={styles.title}>
				<h1>{title}</h1>
			</article>
			<div className={styles['end-slot']}>{endSlot}</div>
		</div>
	);
}
