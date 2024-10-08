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
	VSCodeDataGrid,
	VSCodeDataGridCell,
	VSCodeDataGridRow
} from '@vscode/webview-ui-toolkit/react';
import styles from './RegisterTable.module.scss';
import RegisterTableRow from '../table-row/RegisterTableRow';
import type {ComputedRegisters} from '../body/RegisterBody';

type RegisterTableProps = {
	readonly computedRegisters: ComputedRegisters;
	readonly setActiveRegister: (register: string) => void;
};
import {useMemo, useState, memo, useEffect} from 'react';
import DownFilledArrow from '@common/icons/DownFilledArrow';
import DownArrow from '@common/icons/DownArrow';

function RegisterTable({
	computedRegisters,
	setActiveRegister
}: RegisterTableProps) {
	const [sortedBy, setSortedBy] = useState<{
		name?: 'asc' | 'desc' | undefined;
		address?: 'asc' | 'desc' | undefined;
	}>({name: 'asc'});

	const [innerWidth, setInnerWidth] = useState(window.innerWidth);

	const sortedRegisters = useMemo(() => {
		if (sortedBy?.name) {
			return [...computedRegisters].sort((a, b) =>
				sortedBy?.name === 'asc'
					? a.name.localeCompare(b.name, 'en-US', {
							numeric: true,
							sensitivity: 'base'
						})
					: b.name.localeCompare(a.name, 'en-US', {
							numeric: true,
							sensitivity: 'base'
						})
			);
		}

		if (sortedBy?.address) {
			return [...computedRegisters].sort((a, b) =>
				sortedBy?.address === 'asc'
					? parseInt(a.address, 16) - parseInt(b.address, 16)
					: parseInt(b.address, 16) - parseInt(a.address, 16)
			);
		}

		return computedRegisters;
	}, [computedRegisters, sortedBy]);

	const sortTable = (field: 'name' | 'address') => {
		setSortedBy(prevSortedBy => ({
			[field]: prevSortedBy?.[field] === 'asc' ? 'desc' : 'asc'
		}));
	};

	useEffect(() => {
		const handleResize = () => {
			setInnerWidth(window.innerWidth);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	return (
		<VSCodeDataGrid
			className={styles.table}
			gridTemplateColumns={
				innerWidth > 1130 ? '20% 20% 50% 10%' : '20% 20% 40% 20%'
			}
			ariaLabel='Registers table'
			data-test='register-table-grid'
		>
			<VSCodeDataGridRow rowType='header'>
				<VSCodeDataGridCell gridColumn='1'>
					<div
						className={`${styles['sortable-title']} ${styles[sortedBy?.name ?? ''] ?? ''} `}
						onClick={() => {
							sortTable('name');
						}}
					>
						Name
						{sortedBy?.name ? <DownFilledArrow /> : <DownArrow />}
					</div>
				</VSCodeDataGridCell>
				<VSCodeDataGridCell gridColumn='2'>
					<div
						className={`${styles['sortable-title']} ${styles[sortedBy?.address ?? ''] ?? ''} `}
						onClick={() => {
							sortTable('address');
						}}
					>
						Address
						{sortedBy?.address ? <DownFilledArrow /> : <DownArrow />}
					</div>
				</VSCodeDataGridCell>
				<VSCodeDataGridCell gridColumn='3'>
					Description
				</VSCodeDataGridCell>
				<VSCodeDataGridCell gridColumn='4'>Value</VSCodeDataGridCell>
			</VSCodeDataGridRow>
			{sortedRegisters.map(register => (
				<RegisterTableRow
					key={register.name}
					id={register.name}
					label={
						<div className={styles.name}>
							{register.isResetValue ? (
								register.name
							) : (
								<>
									<div>&lowast;</div>
									<div>{register.name}</div>
								</>
							)}
						</div>
					}
					description={register.description}
					value={register.value}
					address={register.address}
					handleRegisterSelection={setActiveRegister}
				/>
			))}
		</VSCodeDataGrid>
	);
}

export default memo(RegisterTable);
