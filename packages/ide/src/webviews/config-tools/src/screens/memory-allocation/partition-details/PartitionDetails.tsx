/**
 *
 * Copyright (c) 2024 - 2025 Analog Devices, Inc.
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

import {DropDown, TextField} from 'cfs-react-library';
import styles from './PartitionDetails.module.scss';
import {getMemoryTypes} from '../../../utils/memory';
import {type TLocaleContext} from '../../../common/types/context';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {
	useActivePartitionDisplayName,
	useActivePartitionType
} from '../../../state/slices/partitions/partitions.selector';
import {useAppDispatch} from '../../../state/store';
import {
	updateActivePartition,
	updateActivePartitionDisplayName
} from '../../../state/slices/partitions/partitions.reducer';
import {memo} from 'react';

type PartitionDetailsProps = {
	readonly errors?: {
		displayName: string;
		type: string;
		cores: string;
		startAddress: string;
		size: string;
	};
};

export const PartitionDetails = memo(function PartitionDetails({
	errors
}: PartitionDetailsProps) {
	const i10n: TLocaleContext | undefined = useLocaleContext()?.memory;
	const memoryTypes = getMemoryTypes();
	const displayName = useActivePartitionDisplayName();
	const dispatch = useAppDispatch();
	const type = useActivePartitionType();

	const getDropdownOptions = () => [
		// Dropdown component doesn't have a placeholder prop, the first entry is a default value
		{label: 'Select value', value: ''},
		...memoryTypes.map(
			type =>
				({
					label: type,
					value: type,
					dataTest: type
				}) satisfies {label: string; value: string; dataTest: string}
		)
	];

	const handleTypeChange = (type: string) => {
		dispatch(
			updateActivePartition({
				type,
				displayName: displayName ?? '',
				projects: [],
				startAddress: '',
				size: 0,
				displayUnit: undefined,
				blockNames: [],
				baseBlock: {
					Name: '',
					Description: '',
					AddressStart: '',
					AddressEnd: '',
					Width: 0,
					MinimumAlignment: undefined,
					Access: '',
					Location: '',
					Type: ''
				},
				config: {}
			})
		);
	};

	const handleNameChange = (value: string) => {
		dispatch(updateActivePartitionDisplayName(value));
	};

	return (
		<div className={styles.section}>
			<h3>{i10n?.partition.details}</h3>
			<div className={styles.dropdownGroup}>
				<div className={styles.label}>{i10n?.partition.type}</div>
				<DropDown
					currentControlValue={type ?? ''}
					controlId='memoryType'
					dataTest='memory-type-dropdown'
					isDisabled={false}
					options={getDropdownOptions()}
					error={errors?.type}
					onHandleDropdown={value => {
						handleTypeChange(value);
					}}
				/>
			</div>
			<div className={styles.label}>{i10n?.partition.name}</div>
			<TextField
				error={errors?.displayName}
				dataTest='partition-name'
				placeholder='MyPartition'
				inputVal={displayName}
				onInputChange={handleNameChange}
			/>
		</div>
	);
});
