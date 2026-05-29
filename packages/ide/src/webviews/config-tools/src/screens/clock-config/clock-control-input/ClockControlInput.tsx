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
import {useMemo, memo, useEffect, useState} from 'react';
import {IntegerField} from 'cfs-react-library';
import {useAppDispatch} from '../../../state/store';
import {generateValidationErrorType} from '@common/utils/validate-inputs';
import {
	setClockNodeControlValue,
	type ClockNodeSet
} from '../../../state/slices/clock-nodes/clockNodes.reducer';
import {
	useClockConfigError,
	useClockNodeState,
	useClockNodeDetailsTargetNode,
	useControl
} from '../../../state/slices/clock-nodes/clockNodes.selector';
import debounce from 'lodash.debounce';
import type {ClockNodeState} from '@common/types/soc';
import type {TControlTypes} from '@common/types/errorTypes';
import {generateControlErrorMessage} from '@common/utils/control-errors';

type ControlConfig = {
	key: string;
	type: TControlTypes;
	minVal?: string | number;
	maxVal?: string | number;
	unit?: string;
	default?: string | number;
};

type ClockControlInputProps = Readonly<{
	controlCfg: ControlConfig;
	isDisabled: boolean;
	label: string;
}>;

function ClockControlInput({
	controlCfg,
	isDisabled,
	label
}: ClockControlInputProps) {
	const {
		key: control,
		type: controlType,
		minVal,
		maxVal,
		unit = '',
		default: defaultValue
	} = controlCfg;
	const dispatch = useAppDispatch();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode();

	const activeClockNodeDetails = useClockNodeState(
		clockNodeDetailsTargetNode
	);

	const storeInput = useControl(clockNodeDetailsTargetNode, control);

	// Use default value if storeInput is empty and default is provided
	const currentValue =
		!storeInput && defaultValue !== undefined
			? Number(defaultValue)
			: storeInput;

	let desc: string | undefined;
	if (minVal && maxVal)
		desc =
			`Value must be an integer between ${minVal} and ${maxVal} ${unit}`.trimEnd() +
			'.';
	else if (minVal)
		desc =
			`Value must be an integer greater than ${minVal} ${unit}.`.trimEnd() +
			'.';
	else if (maxVal)
		desc =
			`Value must be an integer less than ${maxVal} ${unit}.`.trimEnd() +
			'.';

	const [input, setInput] = useState<number>(
		currentValue ? Number(currentValue) : 0
	);

	const errType = useClockConfigError(
		activeClockNodeDetails.Name,
		control
	);

	const handleInputChange = useMemo(
		() =>
			debounce(
				(value: number | undefined, nodeDetails: ClockNodeState) => {
					// Clock inputs should only accept numbers to process correctly the clock frequencies.

					const formattedValue =
						value === undefined ? '' : String(value);

					const inputData = {
						content: formattedValue,
						controlType,
						minVal,
						maxVal
					};

					const changedClockNode: ClockNodeSet = {
						name: nodeDetails.Name,
						key: control,
						value: formattedValue,
						error: generateValidationErrorType(inputData)
					};

					dispatch(setClockNodeControlValue(changedClockNode));
				},
				750,
				{leading: false}
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	);

	useEffect(() => {
		// Set default value in store if no value exists and default is available
		if (
			!storeInput &&
			defaultValue !== undefined &&
			!isDisabled &&
			clockNodeDetailsTargetNode
		) {
			const inputData = {
				content: String(defaultValue),
				controlType,
				minVal,
				maxVal
			};

			const changedClockNode: ClockNodeSet = {
				name: activeClockNodeDetails.Name,
				key: control,
				value: String(defaultValue),
				error: generateValidationErrorType(inputData)
			};

			dispatch(setClockNodeControlValue(changedClockNode));
		}
	}, [
		control,
		defaultValue,
		dispatch,
		isDisabled,
		storeInput,
		clockNodeDetailsTargetNode,
		controlType,
		minVal,
		maxVal,
		activeClockNodeDetails.Name
	]);

	return (
		<IntegerField
			dataTest={`${control}-${activeClockNodeDetails.Name}`}
			value={input}
			isDisabled={isDisabled}
			error={
				errType && !isDisabled
					? generateControlErrorMessage(errType, minVal, maxVal)
					: undefined
			}
			label={
				<>
					<b style={{margin: 0}}>{label}</b>
					<p style={{margin: '4px 0'}}>{desc}</p>
				</>
			}
			endSlot={unit}
			direction='vertical'
			onValueChange={newVal => {
				setInput(newVal);
				handleInputChange(newVal, activeClockNodeDetails);
			}}
		/>
	);
}

export default memo(ClockControlInput);
