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

import {type RowComponentProps} from 'react-window';
import styles from './memory-grid-row.module.scss';

type MemoryGridRowProps = RowComponentProps & {
	readonly addresses: string[];
	readonly valueRows: string[][];
	readonly asciiRows: string[];
};

function MemoryGridRow({
	index,
	style,
	ariaAttributes,
	addresses,
	valueRows,
	asciiRows
}: MemoryGridRowProps) {
	return (
		<div
			style={{
				...style,
				// Override react-window's default width: 100%
				// so the row expands to fit all hex cells
				width: 'max-content',
				minWidth: '100%'
			}}
			{...ariaAttributes}
			className={styles.row}
			data-test={`address-row-${addresses[index]}`}
		>
			<span className={styles.addressCell}>{addresses[index]}</span>
			{valueRows[index].map((byte, i) => (
				// Could use the byte's address as a key, but that's functionally the same
				<span
					// eslint-disable-next-line react/no-array-index-key
					key={i}
					className={styles.hexCell}
					data-test={`hex-cell-${addresses[index]}-${i}`}
				>
					{byte}
				</span>
			))}
			<span
				className={styles.asciiCell}
				data-test={`ascii-cell-${addresses[index]}`}
			>
				{asciiRows[index]}
			</span>
		</div>
	);
}

export default MemoryGridRow;
