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
	useMemo,
	type ChangeEvent,
	useState,
	memo,
	useEffect
} from 'react';
import CfsTextField from '@common/components/cfs-text-field/CfsTextField';
import {useAppDispatch} from '../../../state/store';
import {generateValidationErrorType} from '../../../utils/validate-inputs';
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
import {generateControlErrorMessage} from '../../../utils/control-errors';

type ClockControlInputProps = {
	readonly control: string;
	readonly controlType: string | undefined;
	readonly isDisabled: boolean;
	readonly label: string;
	readonly minVal?: number;
	readonly maxVal?: number;
	readonly unit: string;
};

function ClockControlInput({
	control,
	controlType,
	isDisabled,
	label,
	minVal,
	maxVal,
	unit
}: ClockControlInputProps) {
	const dispatch = useAppDispatch();
	const clockNodeDetailsTargetNode = useClockNodeDetailsTargetNode();
	const activeClockNodeDetails = useClockNodeState(
		clockNodeDetailsTargetNode
	)!;
	const storeInput = useControl(
		activeClockNodeDetails.Type,
		clockNodeDetailsTargetNode,
		control
	);

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

	const [input, setInput] = useState<string | undefined>(storeInput);

	const errType = useClockConfigError(
		activeClockNodeDetails.Type,
		activeClockNodeDetails.Name,
		control
	);

	const handleInputChange = useMemo(
		() =>
			debounce(
				(
					e: ChangeEvent<HTMLInputElement>,
					nodeDetails: ClockNodeState
				) => {
					// Clock inputs should only accept numbers to process correctly the clock frequencies.

					const inputData = {
						content: e.target.value,
						controlType,
						minVal,
						maxVal
					};

					const changedClockNode: ClockNodeSet = {
						type: nodeDetails.Type,
						name: nodeDetails.Name,
						key: control,
						value: e.target.value,
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
		if (storeInput === input) return;

		// Synchronizes local and store state to cover undo-redo scenarios
		setInput(storeInput);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [storeInput]);

	return (
		<CfsTextField
			dataTest={`${control}-${activeClockNodeDetails.Name}`}
			inputVal={input}
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
			unit={unit}
			direction='vertical'
			onInputChange={e => {
				setInput(e.target.value);
				handleInputChange(e, activeClockNodeDetails);
			}}
		/>
	);
}

export default memo(ClockControlInput);
