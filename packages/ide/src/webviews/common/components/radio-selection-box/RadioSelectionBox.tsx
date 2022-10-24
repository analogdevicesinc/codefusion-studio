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
import {VSCodeRadio} from '@vscode/webview-ui-toolkit/react';
import type {FormEvent} from 'react';

import styles from './radioSelectionBox.module.scss';

function RadioSelectionBox({
	id,
	label,
	description,
	additionalInfo,
	isActive,
	onSelection
}: {
	readonly id: string;
	readonly label?: string;
	readonly description: string;
	readonly additionalInfo?: string;
	readonly isActive: boolean;
	readonly onSelection: (e: Event | FormEvent<HTMLElement>) => void;
}) {
	return (
		<div
			className={`${styles.radioSelectionBox} ${isActive ? styles.activeBox : ''}`}
			id={id}
			onClick={e => {
				onSelection(e);
			}}
		>
			<div className={styles.radioContainer}>
				<VSCodeRadio checked={isActive} />
			</div>
			<div className={styles.contentContainer}>
				<h3 className={styles.title}>{label ?? id}</h3>
				<p title={description}>{description}</p>
			</div>
			<div className={styles.additionalInfo}>{additionalInfo}</div>
		</div>
	);
}

export default RadioSelectionBox;
