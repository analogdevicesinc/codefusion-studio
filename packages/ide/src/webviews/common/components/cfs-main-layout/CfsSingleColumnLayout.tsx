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
import React from 'react';
import {memo, type ReactNode} from 'react';
import {isReactElement} from '../../utils';
import styles from './CfsSingleColumnLayout.module.scss';

type LayoutProps = {
	readonly children: ReactNode;
};

function CfsSingleColumnLayout({children}: LayoutProps) {
	const headerSlot: ReactNode[] = [];
	const mainPanelSlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props;

			if (slot === 'header') {
				headerSlot.push(child);
			} else {
				mainPanelSlot.push(child);
			}
		}
	});

	return (
		<div className={styles.container}>
			{headerSlot.length ? (
				<div className={styles.header}>{headerSlot}</div>
			) : null}
			<div className={styles.mainPanel}>{mainPanelSlot}</div>
		</div>
	);
}

export default memo(CfsSingleColumnLayout);
