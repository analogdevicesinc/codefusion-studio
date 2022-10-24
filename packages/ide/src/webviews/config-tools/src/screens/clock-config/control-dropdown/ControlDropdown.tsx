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
import {useAppDispatch} from '../../../state/store';
import {
	setClockNodeControlValue,
	type ClockNodeSet
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import styles from './ControlDropdown.module.scss';
import {
	useClockConfigs,
	useClockNodeState,
	useClockNodeDetailsTargetNode,
	useControl
} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {type MouseEventHandler} from 'react';
import CfsDropDown, {
	type CfsDropDownOptions
} from '../../../../../common/components/cfs-dropdown/CfsDropDown';

type ControlDropdownProps = {
	readonly controlId: string;
	readonly isDisabled: boolean;
	readonly label: string;
	readonly values: Array<string | undefined>;
};

export default function ControlDropdown({
	controlId,
	isDisabled,
	label,
	values
}: ControlDropdownProps) {
	const dispatch = useAppDispatch();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode();

	const activeClockNodeDetails = useClockNodeState(
		clockNodeDetailsTargetNode
	);
	const currentControlValue = useControl(
		activeClockNodeDetails?.Type,
		clockNodeDetailsTargetNode,
		controlId
	);

	const clockConfigs = useClockConfigs();

	const getEnumLabel = (enumId: string) =>
		clockConfigs
			.find(control => control.Id === controlId)
			?.EnumValues?.find(enumVal => enumVal.Id === enumId)
			?.Description ?? enumId;

	const handleDropdown: MouseEventHandler<HTMLOptionElement> = e => {
		if (e.currentTarget.value === currentControlValue) return;

		if (activeClockNodeDetails?.Type) {
			const changedClockNode: ClockNodeSet = {
				type: activeClockNodeDetails?.Type,
				name: clockNodeDetailsTargetNode!,
				key: controlId,
				value: e.currentTarget.value
			};

			dispatch(setClockNodeControlValue(changedClockNode));
		}
	};

	const options: CfsDropDownOptions = values
		.filter(enumValue => enumValue !== undefined)
		.map(enumValue => ({
			value: enumValue,
			label: getEnumLabel(enumValue)
		}));

	return (
		<div className={styles.dropdownContainer}>
			<label htmlFor='controlDropdown'>{label}</label>
			<CfsDropDown
				controlId={controlId}
				isDisabled={isDisabled}
				currentControlValue={currentControlValue}
				options={options}
				dataTest={`${controlId}-${activeClockNodeDetails?.Name}`}
				onHandleDropdown={handleDropdown}
			/>
		</div>
	);
}
