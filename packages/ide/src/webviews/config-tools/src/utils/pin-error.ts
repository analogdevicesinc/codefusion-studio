/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
	type AppliedSignal,
	type AssignedPin
} from '../../../common/types/soc';
import {getSocPinDictionary} from './soc-pins';

export function pinInConflict(
	signalsForTargetPin: AppliedSignal[]
): boolean {
	const pinMap = getSocPinDictionary();
	const signals = signalsForTargetPin.map(s =>
		pinMap[s.Pin]?.Signals?.find(
			s2 => s2.Peripheral === s.Peripheral && s2.Name === s.Name
		)
	);

	// Input Tap signals don't create conflicts with function signals on automotive parts.
	// On automotive parts, GPIO signals don't use the FER register. These do conflict with input tap signals (and function signals).
	// On MAX parts, there are no input taps. All signals, including GPIOs, conflict. We count them all in Function signals.
	const numFunctionSignals = signals.filter(
		s => typeof s?.PinMuxSlot !== 'undefined'
	).length;
	const numAutoGpioSignals = signals.filter(
		s => typeof s?.PinMuxSlot === 'undefined' && !s?.IsInputTap
	).length;
	const numInputTapSignals = signals.filter(
		s => s?.IsInputTap
	).length;

	return (
		numFunctionSignals + numAutoGpioSignals > 1 ||
		numAutoGpioSignals + numInputTapSignals > 1
	);
}

export function getAssignedPinErrors(
	assignedPins: AssignedPin[],
	errorCounter = 0
): {conflictsCount: number; hasFunctionConfigErrors: boolean} {
	let hasFunctionConfigErrors = false;

	for (const pin of assignedPins) {
		if (pinInConflict(pin.appliedSignals)) {
			errorCounter++;
		}

		// Check other errors in function config
		if (
			pin.appliedSignals.some(
				item => Object.keys(item?.Errors ?? {}).length
			)
		) {
			hasFunctionConfigErrors = true;
		}
	}

	return {conflictsCount: errorCounter, hasFunctionConfigErrors};
}
