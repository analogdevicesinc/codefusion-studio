/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import type {ConfigFields, ControlCfg} from '@common/types/soc';
import {shouldRenderPinConfigControl} from '../../../../utils/rpn-expression-resolver';

export type PinConfigControlItem = {
	id: string;
	control: ControlCfg;
};

/**
 * Returns the controls that apply to the selected pin and signal.
 *
 * Standard controls must be present in the signal's SoC pin configuration,
 * while plugin controls apply to every signal. Conditions are evaluated for
 * both control types against the current pin configuration.
 */
export function getApplicablePinConfigControls(
	controls: ControlCfg[],
	signalPinConfig: ConfigFields | undefined,
	userSelections: Record<string, string> = {},
	signalName = ''
): PinConfigControlItem[] {
	const controlsById = controls.reduce<Record<string, ControlCfg>>(
		(accumulator, control) => {
			accumulator[control.Id] = control;

			return accumulator;
		},
		{}
	);
	const applicableControls: PinConfigControlItem[] = [];

	for (const controlId of Object.keys(signalPinConfig ?? {})) {
		const control = controlsById[controlId];

		if (!control) continue;

		const formattedControl: ControlCfg = control.EnumValues?.length
			? {
					...control,
					EnumValues: control.EnumValues.filter(
						enumValue =>
							enumValue.IsPluginAddedOption ??
							Object.prototype.hasOwnProperty.call(
								signalPinConfig?.[controlId] ?? {},
								enumValue.Id
							)
					)
				}
			: control;

		if (
			shouldRenderPinConfigControl(
				formattedControl,
				userSelections,
				signalName
			)
		) {
			applicableControls.push({
				id: controlId,
				control: formattedControl
			});
		}
	}

	for (const control of controls) {
		if (
			control.PluginOption &&
			shouldRenderPinConfigControl(
				control,
				userSelections,
				signalName
			)
		) {
			applicableControls.push({id: control.Id, control});
		}
	}

	return applicableControls;
}
