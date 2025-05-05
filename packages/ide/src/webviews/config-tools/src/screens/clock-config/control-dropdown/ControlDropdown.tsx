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
	useClockNodeState,
	useClockNodeDetailsTargetNode,
	useControl
} from '../../../state/slices/clock-nodes/clockNodes.selector';
import {DropDown, type DropDownOptions} from 'cfs-react-library';
import type {EnumValue} from '@common/types/soc';

type ControlConfig = {
	key: string;
	type: string;
	values: Record<string, unknown>;
	default?: string;
	options?: EnumValue[];
};

type ControlDropdownProps = {
	readonly controlCfg: ControlConfig;
	readonly isDisabled: boolean;
	readonly label: string;
};

export default function ControlDropdown({
	controlCfg,
	isDisabled,
	label
}: ControlDropdownProps) {
	const {
		key: controlId,
		default: defaultValue,
		options: enums = []
	} = controlCfg;
	const dispatch = useAppDispatch();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode();

	const activeClockNodeDetails = useClockNodeState(
		clockNodeDetailsTargetNode
	);

	const storeValue = useControl(
		clockNodeDetailsTargetNode,
		controlId
	);

	// Use default value if storeValue is empty and a default is provided
	const currentControlValue =
		!storeValue && defaultValue !== undefined
			? defaultValue
			: storeValue;

	const handleDropdown = (value: string) => {
		if (value === currentControlValue) return;

		const changedClockNode: ClockNodeSet = {
			name: clockNodeDetailsTargetNode!,
			key: controlId,
			value
		};

		dispatch(setClockNodeControlValue(changedClockNode));
	};

	const options: DropDownOptions = enums.map(e => ({
		label: e.Description,
		value: e.Id
	}));

	return (
		<div className={styles.dropdownContainer}>
			<label htmlFor='controlDropdown'>{label}</label>
			<DropDown
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
