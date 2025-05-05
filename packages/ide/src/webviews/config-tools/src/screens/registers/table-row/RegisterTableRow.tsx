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
import type {ReactNode} from 'react';
import styles from './RegisterTableRow.module.scss';
import {DataGridCell, DataGridRow} from 'cfs-react-library';

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
		<DataGridRow
			dataTest={`${id}-data-grid-row`}
			className={styles.clickableRow}
			onClick={() => {
				handleRegisterSelection(id);
			}}
		>
			<DataGridCell gridColumn='1' dataTest={`${id}-name-grid-cell`}>
				{label}
			</DataGridCell>
			<DataGridCell gridColumn='2' className={styles.monospace}>
				{address}
			</DataGridCell>
			<DataGridCell gridColumn='3'>{description}</DataGridCell>
			<DataGridCell gridColumn='4' className={styles.monospace}>
				{value}
			</DataGridCell>
		</DataGridRow>
	);
}
