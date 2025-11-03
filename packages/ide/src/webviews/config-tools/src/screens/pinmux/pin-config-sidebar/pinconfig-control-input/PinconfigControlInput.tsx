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
import {useState, useMemo, useEffect} from 'react';
import {TextField} from 'cfs-react-library';
import {usePinConfigError} from '../../../../state/slices/pins/pins.selector';
import {generateValidationErrorType} from '@common/utils/validate-inputs';
import {useAppDispatch} from '../../../../state/store';
import {setAppliedSignalControlValue} from '../../../../state/slices/pins/pins.reducer';
import debounce from 'lodash.debounce';
import {generateControlErrorMessage} from '@common/utils/control-errors';
import {SET_INSTRUCTION} from '../../../../utils/soc-controls';
import type {
	ControlErrorTypes,
	TControlTypes
} from '@common/types/errorTypes';
import type {ControlCfg} from '@common/types/soc';

type PinconfigControlInputProps = {
	readonly controlCfg: ControlCfg;
	readonly controlValue?: string;
	readonly defaultControlValue?: string;
	readonly pinId?: string;
	readonly peripheral?: string;
	readonly signal?: string;
	readonly projectId?: string;
};

export default function PinconfigControlInput({
	controlCfg,
	controlValue,
	defaultControlValue,
	pinId,
	peripheral,
	signal,
	projectId
}: PinconfigControlInputProps) {
	const dispatch = useAppDispatch();

	const {
		Id,
		Type,
		MaximumValue,
		MinimumValue,
		Description,
		Units,
		Pattern
	} = controlCfg;

	const [input, setInput] = useState<string | undefined>(
		controlValue
	);

	const label = SET_INSTRUCTION + ' ' + (Description ?? '');
	const unit = Units ?? '';

	const errType = usePinConfigError(
		pinId ?? '',
		peripheral!,
		signal!,
		Id
	);

	const debounceInputChange = useMemo(
		() =>
			debounce(
				(changedPinControl: {
					Peripheral: string | undefined;
					Name: string | undefined;
					pinId: string | undefined;
					control: string;
					controlValue: string;
					errType: ControlErrorTypes | undefined;
					projectId?: string;
				}) =>
					dispatch(
						setAppliedSignalControlValue({
							control: changedPinControl,
							projectId
						})
					),
				750
			),
		[dispatch, projectId]
	);

	const handleInputChange = (e: string) => {
		setInput(e);

		const currentControlData = {
			Peripheral: peripheral,
			Name: signal,
			pinId,
			control: Id
		};

		const inputData = {
			content: e,
			controlType: Type as TControlTypes,
			minVal: MinimumValue,
			maxVal: MaximumValue,
			pattern: Pattern
		};

		const generatedErrType = generateValidationErrorType(inputData);

		debounceInputChange({
			...currentControlData,
			controlValue: e,
			errType: generatedErrType
		});
	};

	useEffect(() => {
		// Clear local input on Reset to Default
		if (input && controlValue === defaultControlValue)
			setInput(defaultControlValue);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [controlValue, defaultControlValue]);

	useEffect(() => {
		if (controlValue === input) return;

		// Synchronizes local and store state to cover undo-redo scenarios
		setInput(controlValue);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [controlValue]);

	return (
		<TextField
			direction='vertical'
			dataTest={`${Id}-${signal}`}
			inputVal={input}
			error={
				errType ? generateControlErrorMessage(errType) : undefined
			}
			label={label}
			endSlot={unit}
			onInputChange={handleInputChange}
		/>
	);
}
