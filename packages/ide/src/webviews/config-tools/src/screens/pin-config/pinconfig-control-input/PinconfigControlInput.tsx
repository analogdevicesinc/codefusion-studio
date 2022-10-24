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
import {useState, type ChangeEvent, useMemo, useEffect} from 'react';
import CfsTextField from '../../../../../common/components/cfs-text-field/CfsTextField';
import {useActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.selector';
import {
	useAppliedSignalCfg,
	usePinAppliedSignals,
	usePinConfig,
	usePinConfigError
} from '../../../state/slices/pins/pins.selector';
import {generateValidationErrorType} from '../../../utils/validate-inputs';
import {useAppDispatch} from '../../../state/store';
import {setAppliedSignalControlValue} from '../../../state/slices/pins/pins.reducer';
import debounce from 'lodash.debounce';
import {generateControlErrorMessage} from '../../../utils/control-errors';
import {evaluateCondition} from '../../../utils/rpn-expression-resolver';
import {
	getSocControlsDictionary,
	SET_INSTRUCTION
} from '../../../utils/soc-controls';
import type {ControlErrorTypes} from '../../../types/errorTypes';

type PinconfigControlInputProps = {
	readonly control: string;
	readonly controlType: string;
	readonly minVal?: number;
	readonly maxVal?: number;
};

export default function PinconfigControlInput({
	control,
	controlType,
	minVal,
	maxVal
}: PinconfigControlInputProps) {
	const dispatch = useAppDispatch();
	const {
		peripheral: activePeripheral,
		signal: activeSignal,
		pin: activePin
	} = useActiveConfiguredSignal();
	const {PinCfg: activePinCfg} =
		useAppliedSignalCfg(activePin, activeSignal) ?? {};

	let augmentedCfg: Record<string, string> | undefined = activePinCfg;

	if (augmentedCfg && activeSignal) {
		augmentedCfg = {...activePinCfg};
		augmentedCfg.Name = activeSignal;
	}

	const controlVal = activePinCfg?.[control];
	const defaultControlVal =
		usePinAppliedSignals(activePin)?.[0].ControlResetValues?.[
			control
		];
	const [input, setInput] = useState<string | undefined>(controlVal);

	const controls = getSocControlsDictionary('PinConfig');
	const {Condition} = controls[control];
	const shouldRenderControl = evaluateCondition(
		augmentedCfg,
		Condition
	);

	const pinConfig = usePinConfig();
	const pinConfigForCurrentControl = pinConfig.find(
		config => config.Id === control
	);
	const label =
		SET_INSTRUCTION +
		' ' +
		(pinConfigForCurrentControl?.Description ?? '');
	const unit = pinConfigForCurrentControl?.Units ?? '';

	const errType = usePinConfigError(
		activePin!,
		activeSignal!,
		control
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
				}) =>
					dispatch(
						setAppliedSignalControlValue({
							controls: [changedPinControl]
						})
					),
				750
			),
		[dispatch]
	);

	const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		setInput(e.target.value);

		const currentControlData = {
			Peripheral: activePeripheral,
			Name: activeSignal,
			pinId: activePin,
			control
		};

		const inputData = {
			content: e.target.value,
			controlType,
			minVal,
			maxVal
		};

		const generatedErrType = generateValidationErrorType(inputData);

		debounceInputChange({
			...currentControlData,
			controlValue: e.target.value,
			errType: generatedErrType
		});
	};

	useEffect(() => {
		// Clear local input on Reset to Default
		if (input && controlVal === defaultControlVal)
			setInput(defaultControlVal);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [controlVal]);

	useEffect(() => {
		if (controlVal === input) return;

		// Synchronizes local and store state to cover undo-redo scenarios
		setInput(controlVal);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [controlVal]);

	return (
		shouldRenderControl && (
			<CfsTextField
				dataTest={`${control}-${activeSignal}`}
				inputVal={input}
				error={
					errType ? generateControlErrorMessage(errType) : undefined
				}
				label={label}
				unit={unit}
				direction='horizontal'
				onInputChange={handleInputChange}
			/>
		)
	);
}
