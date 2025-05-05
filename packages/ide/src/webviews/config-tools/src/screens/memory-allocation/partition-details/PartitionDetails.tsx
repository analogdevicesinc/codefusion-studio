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

type PartitionDetailsProps = {
	readonly errors?: {
		displayName: string;
		type: string;
		cores: string;
		startAddress: string;
		size: string;
	};
	readonly type: string | undefined;
	readonly displayName: string | undefined;
	readonly onNameChange: (name: string) => void;
	readonly onTypeChange: (type: string) => void;
};

export function PartitionDetails({
	errors,
	type,
	displayName,
	onNameChange,
	onTypeChange
}: PartitionDetailsProps) {
	const i10n: TLocaleContext | undefined = useLocaleContext()?.memory;
	const memoryTypes = getMemoryTypes();

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
						onTypeChange(value);
					}}
				/>
			</div>
			<div className={styles.label}>{i10n?.partition.name}</div>
			<TextField
				error={errors?.displayName}
				dataTest='partition-name'
				placeholder='MyPartition'
				inputVal={displayName}
				onInputChange={value => {
					onNameChange(value);
				}}
			/>
		</div>
	);
}
