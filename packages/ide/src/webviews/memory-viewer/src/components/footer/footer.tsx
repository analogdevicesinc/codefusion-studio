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
import {
	DatabaseIcon,
	BigEndianIcon,
	DropDown,
	type DropDownOptions,
	HexadecimalIcon,
	DecimalIcon
} from 'cfs-react-library';
import styles from './footer.module.scss';
import {
	useNumColumns,
	useByteGrouping,
	useEndianness,
	useDisplayFormat
} from '../../state/slices/app-context/app-context.selector';
import {useCallback} from 'react';
import {useAppDispatch} from '../../state/store';
import {
	setNumColumns,
	toggleByteGrouping,
	toggleEndianness,
	toggleDisplayFormat
} from '../../state/slices/app-context/app-context.reducer';

const COLUMN_OPTIONS: DropDownOptions = [
	{value: '4', label: '4'},
	{value: '8', label: '8'},
	{value: '16', label: '16'},
	{value: '32', label: '32'},
	{value: '64', label: '64'}
];

export default function Footer() {
	const dispatch = useAppDispatch();
	const numColumns = useNumColumns();
	const byteGrouping = useByteGrouping();
	const endianness = useEndianness();
	const displayFormat = useDisplayFormat();

	const configureColumns = useCallback(
		(value: string) => {
			dispatch(setNumColumns(Number(value)));
		},
		[dispatch]
	);

	const byteGroupingLabel =
		byteGrouping === 1 ? '1 Byte' : `${byteGrouping} Bytes`;

	const endianIconClass =
		`${endianness === 'little' ? styles.rotated : ''}`.trim();

	return (
		<div className={styles.container}>
			<div className={styles.controls}>
				<div
					className={styles.status}
					onClick={() => dispatch(toggleByteGrouping())}
				>
					<DatabaseIcon className={styles.icon} />
					<span className={styles.label}>{byteGroupingLabel}</span>
				</div>
				{byteGrouping !== 1 && (
					<div
						className={styles.status}
						onClick={() => dispatch(toggleEndianness())}
					>
						<BigEndianIcon className={endianIconClass} />
						<span className={styles.label}>
							{endianness === 'big' ? 'Big Endian' : 'Little Endian'}
						</span>
					</div>
				)}
				<div className={styles.status}>
					<span className={styles.label}>Columns</span>
					<DropDown
						controlId='memory-columns'
						dataTest='memory-columns'
						currentControlValue={numColumns.toString()}
						options={COLUMN_OPTIONS}
						size='small'
						onHandleDropdown={configureColumns}
					/>
				</div>
				<div
					className={styles.status}
					onClick={() => dispatch(toggleDisplayFormat())}
				>
					{displayFormat === 'hex' ? (
						<HexadecimalIcon />
					) : (
						<DecimalIcon />
					)}
					<span className={styles.label}>
						{displayFormat === 'hex' ? 'Hexadecimal' : 'Decimal'}
					</span>
				</div>
			</div>
		</div>
	);
}
