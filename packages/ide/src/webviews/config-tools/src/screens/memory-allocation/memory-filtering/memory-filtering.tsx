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

import {MultiSelect, type MultiSelectOption} from 'cfs-react-library';
import {getSocMemoryTypeList} from '../../../utils/memory';
import {useEffect, useState} from 'react';
import {getSocCoreList} from '../../../utils/soc-cores';
import styles from './memory-filtering.module.scss';
import {useDispatch} from 'react-redux';
import {
	setCoresFilter,
	setMemoryTypeFilter
} from '../../../state/slices/app-context/appContext.reducer';
import {useCoreFilters} from '../../../state/slices/app-context/appContext.selector';

export type MemoryFilters = {
	memoryTypes: string[];
	cores: string[];
};

export function MemoryFiltering() {
	const coreFilter = useCoreFilters();
	const [selectedMemoryTypes, setSelectedMemoryTypes] = useState<
		MultiSelectOption[]
	>([]);

	const dispatch = useDispatch();

	// Clear the cores filter when navigating away from the memory allocation screen
	useEffect(
		() => () => {
			dispatch(setCoresFilter([]));
		},
		[dispatch]
	);

	const onMemoryTypeSelection = (
		selectedOption: MultiSelectOption[]
	) => {
		setSelectedMemoryTypes(selectedOption);
		const options = selectedOption.map(option => option.value);
		dispatch(setMemoryTypeFilter(options));
	};

	const onCoreSelection = (coreOptions: MultiSelectOption[]) => {
		const options = coreOptions.map(option => option.value);
		dispatch(setCoresFilter(options));
	};

	return (
		<div className={styles.container}>
			<div className={styles.memoryType}>
				<MultiSelect
					dropdownText='Memory Type'
					initialSelectedOptions={selectedMemoryTypes}
					options={getSocMemoryTypeList().map(memoryType => ({
						label: memoryType.Name,
						value: memoryType.Name
					}))}
					variant='filter'
					dataTest='memory-type-filter'
					chipText={
						selectedMemoryTypes.length > 0
							? selectedMemoryTypes.length.toString()
							: ''
					}
					onSelection={onMemoryTypeSelection}
				/>
			</div>
			<div className={styles.cores}>
				<MultiSelect
					dropdownText='Core'
					initialSelectedOptions={coreFilter.map(core => ({
						label: core,
						value: core
					}))}
					options={getSocCoreList().map(core => ({
						label: core.Name,
						value: core.Name
					}))}
					variant='filter'
					dataTest='core-filter'
					chipText={
						coreFilter.length > 0 ? coreFilter.length.toString() : ''
					}
					onSelection={onCoreSelection}
				/>
			</div>
		</div>
	);
}
