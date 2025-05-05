/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import type {ControlCfg} from '@common/types/soc';
import {useAppDispatch} from '../../../../state/store';
import {setAppliedSignalControlValue} from '../../../../state/slices/pins/pins.reducer';
import styles from './ControlDropdown.module.scss';
import {DropDown, type DropDownOptions} from 'cfs-react-library';

type ControlDropdownProps = {
	readonly isDefaultValue: boolean;
	readonly controlCfg: ControlCfg;
	readonly controlValue?: string;
	readonly pinId?: string;
	readonly peripheral?: string;
	readonly signal?: string;
	readonly projectId?: string;
};

export default function ControlDropdown({
	controlCfg,
	isDefaultValue,
	controlValue,
	pinId,
	peripheral,
	signal,
	projectId
}: ControlDropdownProps) {
	const dispatch = useAppDispatch();
	const controlId = controlCfg.Id;

	const {Description, EnumValues = []} = controlCfg;

	const dropdownLabel = Description;

	// Use the provided value or default to the first enum value if needed
	const currentControlValue = controlValue ?? EnumValues[0]?.Id;

	const handleDropdown = (value: string) => {
		if (value === currentControlValue) return;

		dispatch(
			setAppliedSignalControlValue({
				control: {
					Peripheral: peripheral,
					Name: signal,
					pinId,
					control: controlId,
					controlValue: value
				},
				projectId
			})
		);
	};

	const options: DropDownOptions = EnumValues.map(e => ({
		value: e.Id,
		label: e.Description,
		dataTest: `${signal}-${pinId}-${e.Id}`
	}));

	return (
		<div className={styles.container}>
			<label htmlFor={`${controlId}-${signal}-control-dropdown`}>
				{dropdownLabel}
				{!isDefaultValue && ' *'}
			</label>

			<DropDown
				controlId={controlId}
				isDisabled={!options.length}
				currentControlValue={currentControlValue}
				options={options}
				dataTest={`${controlId}-${signal}-control-dropdown`}
				onHandleDropdown={handleDropdown}
			/>
		</div>
	);
}
