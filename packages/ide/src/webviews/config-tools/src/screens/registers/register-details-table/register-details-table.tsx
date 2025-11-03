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

import {DataGrid, DataGridCell, DataGridRow} from 'cfs-react-library';
import styles from './register-details-table.module.scss';
import DownFilledArrow from '../../../../../common/icons/DownFilledArrow';
import DownArrow from '../../../../../common/icons/DownArrow';
import {useMemo, useState} from 'react';
import {
	RegisterConfigField,
	type ConfigField,
	type FieldDictionary
} from '../../../../../common/types/soc';
import {RegisterDetailsRow} from '../register-details-row/register-details-row';
import {computeFieldValue} from '../../../utils/compute-register-value';
import {useSearchString} from '../../../state/slices/app-context/appContext.selector';
import {BitGroup} from '../bit-group/bit-group';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';

export type RegisterDetailsTableProps = {
	readonly assignedPinsRegisterConfigs: Array<{
		pinConfig: Array<RegisterConfigField | undefined>;
		signalConfig: ConfigField[] | undefined;
	}>;
	readonly registerConfigs: Array<
		Record<string, RegisterConfigField[] | undefined>
	>;
	readonly registerDetails: FieldDictionary[];
	readonly registerName: string;
	readonly modifiedRegisterDetails: FieldDictionary[];
};

export function RegisterDetailsTable({
	assignedPinsRegisterConfigs,
	registerConfigs,
	registerDetails,
	registerName,
	modifiedRegisterDetails
}: RegisterDetailsTableProps) {
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.registers?.['details-section'];

	const [sortedBy, setSortedBy] = useState<{
		name?: 'asc' | 'desc' | undefined;
		bits?: 'asc' | 'desc' | undefined;
	}>({bits: 'asc'});

	const filterRegistersBySearch = (
		registers: FieldDictionary[],
		searchString: string
	) =>
		registers.filter(register =>
			register.name.toLowerCase().includes(searchString.toLowerCase())
		);

	const searchString = useSearchString('register');
	const searchResults = registerDetails.length
		? filterRegistersBySearch(registerDetails, searchString)
		: filterRegistersBySearch(registerDetails, searchString);

	const sortedRegisters = useMemo(() => {
		if (sortedBy?.name) {
			return [...searchResults].sort((a, b) =>
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

		if (sortedBy?.bits) {
			return [...searchResults].sort((a, b) =>
				sortedBy?.bits === 'asc'
					? a.position - b.position
					: b.position - a.position
			);
		}

		return searchResults;
	}, [searchResults, sortedBy?.bits, sortedBy?.name]);

	const sortTable = (field: 'name' | 'bits') => {
		setSortedBy(prevSortedBy => ({
			[field]: prevSortedBy?.[field] === 'asc' ? 'desc' : 'asc'
		}));
	};

	const [hoveredField, setHoveredField] = useState<
		string | undefined
	>(undefined);

	const [expandedRows, setExpandedRows] = useState<string[]>([]);

	const scrollToRow = (id: string) => {
		const element = document.getElementById(id);

		if (element) {
			element.scrollIntoView({behavior: 'smooth', block: 'start'});
		}
	};

	const rowExpandHandler = (id: string, userClickedRow = true) => {
		if (expandedRows.includes(id) && userClickedRow) {
			setExpandedRows(expandedRows.filter(row => row !== id));
		} else {
			setExpandedRows([...expandedRows, id]);
		}
	};

	return (
		<>
			<BitGroup
				registerDetails={searchResults}
				registerName={registerName}
				assignedPinsRegisterConfigs={assignedPinsRegisterConfigs}
				registersConfigs={registerConfigs}
				hoveredField={hoveredField}
				setHoveredField={setHoveredField}
				scrollToRow={id => {
					scrollToRow(id);
					rowExpandHandler(id, false);
				}}
			/>
			<div className={styles.tableWrapper}>
				<DataGrid
					className={styles.table}
					gridTemplateColumns='15% 15% 15% 15% 15% 25%'
					ariaLabel='Registers table'
					dataTest='register-details-grid'
				>
					<DataGridRow rowType='header'>
						<DataGridCell gridColumn='1' cellType='columnheader'>
							<div
								className={`${styles['sortable-title']} ${styles[sortedBy?.name ?? ''] ?? ''} `}
								onClick={() => {
									sortTable('name');
								}}
							>
								{i10n?.name}
								{sortedBy?.name ? <DownFilledArrow /> : <DownArrow />}
							</div>
						</DataGridCell>
						<DataGridCell gridColumn='2' cellType='columnheader'>
							<div
								className={`${styles['sortable-title']} ${styles[sortedBy?.bits ?? ''] ?? ''} `}
								onClick={() => {
									sortTable('bits');
								}}
							>
								{i10n?.bits}
								{sortedBy?.bits ? <DownFilledArrow /> : <DownArrow />}
							</div>
						</DataGridCell>
						<DataGridCell gridColumn='3' cellType='columnheader'>
							{i10n?.access}
						</DataGridCell>
						<DataGridCell gridColumn='4' cellType='columnheader'>
							{i10n?.value}
						</DataGridCell>
						<DataGridCell gridColumn='5' cellType='columnheader'>
							{i10n?.reset}
						</DataGridCell>
						<DataGridCell gridColumn='6' cellType='columnheader'>
							{i10n?.description}
						</DataGridCell>
					</DataGridRow>
					{sortedRegisters.map(field => (
						<RegisterDetailsRow
							key={field.id}
							field={field}
							value={computeFieldValue(
								assignedPinsRegisterConfigs,
								registerConfigs,
								registerName,
								field,
								field.reset
							)}
							isModified={modifiedRegisterDetails.some(
								(f: FieldDictionary) => f.name === field.name
							)}
							hoveredField={hoveredField}
							expandedRows={expandedRows}
							onRowHover={(id: string | undefined) => {
								setHoveredField(id);
							}}
							onRowClick={(id: string) => {
								rowExpandHandler(id);
							}}
						/>
					))}
				</DataGrid>
			</div>
		</>
	);
}
