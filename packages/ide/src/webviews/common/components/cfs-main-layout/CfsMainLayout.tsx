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
import {memo, type ReactNode, type ReactElement} from 'react';
import styles from './CfsMainLayout.module.scss';

type LayoutProps = {
	readonly children: ReactNode;
};

// TO DO: Detele this from here and use isReactElement from utils within /common
const isReactElement = (
	child: ReactNode
): child is ReactElement<any, string> => React.isValidElement(child);

function CfsTwoColumnLayout({children}: LayoutProps) {
	const headerSlot: ReactNode[] = [];
	const sidePanelSlot: ReactNode[] = [];
	const mainPanelSlot: ReactNode[] = [];

	React.Children.forEach(children, child => {
		if (isReactElement(child)) {
			const {slot} = child.props;

			if (slot === 'header') {
				headerSlot.push(child);
			} else if (slot === 'side-panel') {
				sidePanelSlot.push(child);
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
			<div className={styles.sidePanel}>{sidePanelSlot}</div>
			<div className={styles.mainPanel}>{mainPanelSlot}</div>
		</div>
	);
}

export default memo(CfsTwoColumnLayout);
