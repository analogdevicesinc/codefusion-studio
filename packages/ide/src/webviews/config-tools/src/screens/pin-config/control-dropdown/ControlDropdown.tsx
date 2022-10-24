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
import type {ConfigField} from '@common/types/soc';
import {useActiveConfiguredSignal} from '../../../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../../../state/store';
import {setAppliedSignalControlValue} from '../../../state/slices/pins/pins.reducer';
import {useAppliedSignalCfg} from '../../../state/slices/pins/pins.selector';
import {evaluateCondition} from '../../../utils/rpn-expression-resolver';
import {type MouseEventHandler} from 'react';
import {
	SELECT_INSTRUCTION,
	getSocControlsDictionary
} from '../../../utils/soc-controls';
import styles from './ControlDropdown.module.scss';
import CfsDropDown, {
	type CfsDropDownOptions
} from '../../../../../common/components/cfs-dropdown/CfsDropDown';

type ControlDropdownProps = {
	readonly controlId: string;
	readonly controlData:
		| Record<string, ConfigField[] | undefined>
		| undefined;
	readonly isDefaultValue: boolean;
};

export default function ControlDropdown({
	controlId,
	controlData,
	isDefaultValue
}: ControlDropdownProps) {
	const dispatch = useAppDispatch();
	const controls = getSocControlsDictionary('PinConfig');

	let {Description, EnumValues, Condition} = controls[controlId];
	// Prepend "Select" to the bare description to create the control label
	Description = SELECT_INSTRUCTION + ' ' + Description;

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

	const shouldRenderControl = evaluateCondition(
		augmentedCfg,
		Condition
	);

	const controlDataKeys = controlData ? Object.keys(controlData) : [];

	const currentControlValue = activePinCfg?.[controlId];

	const getDescriptionForControlValue = (controlValueId: string) =>
		EnumValues?.find(
			controlValue => controlValue.Id === controlValueId
		)?.Description ?? controlValueId;

	const handleDropdown: MouseEventHandler<HTMLOptionElement> = e => {
		if (e.currentTarget.value === currentControlValue) return;

		const controlData = {
			Peripheral: activePeripheral,
			Name: activeSignal,
			pinId: activePin,
			control: controlId,
			controlValue: e.currentTarget.value
		};

		dispatch(
			setAppliedSignalControlValue({
				controls: [controlData]
			})
		);
	};

	const options: CfsDropDownOptions = controlDataKeys.map(
		controlValue => ({
			value: controlValue,
			label: getDescriptionForControlValue(controlValue),
			dataTest: `${activeSignal}-${activePin}-${controlValue}`
		})
	);

	return (
		shouldRenderControl && (
			<div className={styles.container}>
				<label
					htmlFor={`${controlId}-${activeSignal}-control-dropdown`}
				>
					{Description}
				</label>
				<div className={styles.divider} />
				{!isDefaultValue && <span>&lowast;</span>}

				<CfsDropDown
					controlId={controlId}
					isDisabled={!controlDataKeys.length}
					currentControlValue={currentControlValue}
					options={options}
					dataTest={`${controlId}-${activeSignal}-control-dropdown`}
					onHandleDropdown={handleDropdown}
				/>
			</div>
		)
	);
}
