/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import styles from './WorkspaceCreationLayout.module.scss';
import SingleColumnLayout from '../../../../config-tools/src/components/secondary-layout/SecondaryLayout';

function WorkspaceCreationLayout(
	props: Readonly<{
		title: string;
		description: string;
		children: React.ReactNode;
	}>
) {
	return (
		<SingleColumnLayout
			body={
				<div className={styles.workspaceLayoutMainPanel}>
					<div className={styles.layoutHeader}>
						<h1 className={styles.title}>{props.title}</h1>
						<p className={styles.description}>{props.description}</p>
					</div>
					<div className={styles.layoutBody}>{props.children}</div>
				</div>
			}
		/>
	);
}

export default WorkspaceCreationLayout;
