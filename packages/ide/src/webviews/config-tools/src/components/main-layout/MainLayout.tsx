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
import {memo} from 'react';
import styles from './MainLayout.module.scss';

type LayoutProps = {
	readonly header?: React.ReactNode;
	readonly sidePanel?: React.ReactNode;
	readonly mainPanel?: React.ReactNode;
	readonly sidePanelId?: string;
};

function TwoColumnLayout({
	header,
	sidePanel,
	mainPanel,
	sidePanelId
}: LayoutProps) {
	return (
		<div className={styles.container}>
			<div className={styles.header}>{header}</div>
			<div id={sidePanelId} className={styles.sidePanel}>
				{sidePanel}
			</div>
			<div className={styles.mainPanel}>{mainPanel}</div>
		</div>
	);
}

export default memo(TwoColumnLayout);
