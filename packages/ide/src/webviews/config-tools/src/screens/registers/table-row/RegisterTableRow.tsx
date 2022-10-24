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
import {
	VSCodeDataGridCell,
	VSCodeDataGridRow
} from '@vscode/webview-ui-toolkit/react';
import type {ReactNode} from 'react';
import styles from './RegisterTableRow.module.scss';

type TableItemType = {
	readonly id: string;
	readonly label: string | ReactNode;
	readonly description: string;
	readonly value: string | number;
	readonly address: string;
	readonly handleRegisterSelection: (registerId: string) => void;
};

export default function RegisterTableRow({
	id,
	label,
	description,
	value,
	address,
	handleRegisterSelection
}: TableItemType) {
	return (
		<VSCodeDataGridRow data-test={`${id}-data-grid-row`}>
			<VSCodeDataGridCell
				cellType='columnheader'
				gridColumn='1'
				data-test={`${id}-name-grid-cell`}
				onClick={() => {
					handleRegisterSelection(id);
				}}
			>
				{label}
			</VSCodeDataGridCell>
			<VSCodeDataGridCell
				cellType='columnheader'
				gridColumn='2'
				className={styles.monospace}
			>
				{address}
			</VSCodeDataGridCell>
			<VSCodeDataGridCell cellType='columnheader' gridColumn='3'>
				{description}
			</VSCodeDataGridCell>
			<VSCodeDataGridCell
				cellType='columnheader'
				gridColumn='4'
				className={styles.monospace}
			>
				{value}
			</VSCodeDataGridCell>
		</VSCodeDataGridRow>
	);
}
