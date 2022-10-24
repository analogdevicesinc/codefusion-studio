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
import styles from './ElfTableHeaderCell.module.scss';
// SVG
import DownFullCarret from '@common/icons/DownFullCarret';
import DownCarret from '@common/icons/DownCarret';

import type {TNewColumn} from '../../common/types/symbols';

type TSymbolsTableHeaderProps = {
	readonly dir: 'asc' | 'desc' | undefined;
	readonly column: TNewColumn;
	readonly label: string;
	readonly onSort: (field: TNewColumn) => void;
	readonly alignRight?: string;
};

export default function ElfTableHeaderCell({
	dir,
	column,
	label,
	onSort,
	alignRight
}: TSymbolsTableHeaderProps) {
	return (
		<div
			className={`${styles['sortable-title']} ${
				styles[dir ?? ''] ?? ''
			} ${styles[alignRight ?? '']}`}
			onClick={() => {
				onSort(column);
			}}
		>
			<span className={styles.label}>{label}</span>
			<span className={styles.icon}>
				{dir ? <DownFullCarret /> : <DownCarret />}
			</span>
		</div>
	);
}
