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

import {DataGridCell, DataGridRow} from 'cfs-react-library';
import styles from './register-details-row.module.scss';
import {type FieldDictionary} from '../../../../../common/types/soc';
import DownArrow from '../../../../../common/icons/DownArrow';
import {formatHexPrefix} from '../../../utils/memory';

export type RegisterDetailsRowProps = {
	readonly field: FieldDictionary;
	readonly value: string;
	readonly hoveredField: string | undefined;
	readonly isModified: boolean;
	readonly onRowClick: (id: string) => void;
	readonly onRowHover: (id: string | undefined) => void;
	readonly expandedRows: string[];
};

export function RegisterDetailsRow({
	field,
	value,
	hoveredField,
	isModified,
	onRowHover,
	onRowClick,
	expandedRows
}: RegisterDetailsRowProps) {
	const expandedRowId = expandedRows.find(id => id === field.id);

	return (
		<DataGridRow
			id={field.id}
			className={`${styles.row} ${hoveredField === field.id ? styles.hover : ''}`}
			onClick={() => {
				onRowClick(field.id);
			}}
			onMouseLeave={() => {
				onRowHover(undefined);
			}}
			onMouseEnter={() => {
				onRowHover(field.id);
			}}
		>
			<DataGridCell gridColumn='1'>
				<div className={styles.column}>
					{isModified ? (
						<div className={styles.asterisk}>&lowast;</div>
					) : (
						''
					)}{' '}
					{field.name}
				</div>
			</DataGridCell>
			<DataGridCell gridColumn='2' className={styles.monospace}>
				{field.length === 1
					? field.position
					: `${field.position + (field.length - 1)}:${field.position}`}
			</DataGridCell>
			<DataGridCell gridColumn='3'>{field.access}</DataGridCell>
			<DataGridCell gridColumn='4' className={styles.monospace}>
				{formatHexPrefix(value)}
			</DataGridCell>
			<DataGridCell gridColumn='5' className={styles.monospace}>
				{field.reset.toString().startsWith('0x') ? '' : '0x'}
				{field.reset}
			</DataGridCell>
			<DataGridCell gridColumn='6' className={styles.monospace}>
				<div className={styles.description}>
					{field.description}
					<div
						className={`${styles.icon} ${expandedRowId === field.id ? styles.expandedRow : ''}`}
					>
						<DownArrow />
					</div>
				</div>
				{expandedRowId === field.id && (
					<div className={styles.expandedDescription}>
						{field.documentation !== `${field.description}.` && (
							<p className={styles.documentation}>
								{field.documentation}
							</p>
						)}
						{field.enumVals?.map(value => (
							<p key={value.id}>
								{value.value}: {value.documentation}
							</p>
						))}
					</div>
				)}
			</DataGridCell>
		</DataGridRow>
	);
}
