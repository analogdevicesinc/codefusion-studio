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
import type {
	ClockNode,
	ClockNodeState
} from '../../../common/types/soc';
import {
	EMPTY_CLOCK_VALUE,
	UNDEFINED_MARKER
} from '../screens/clock-config/constants/clocks';
import type {NodeErrorTypes} from '../types/errorTypes';
import {nodeErrorTypes} from './control-errors';
import {getValueFromClockDictionary} from './rpn-expression-resolver';
import {getSocControlsDictionary} from './soc-controls';

export function getCurrentNodeError(
	nodeState: ClockNodeState | undefined,
	nodeDetails: ClockNode,
	computeEnabledState: (condition: string) => boolean
): [string, NodeErrorTypes] | undefined {
	const controls = getSocControlsDictionary('ClockConfig');

	const controlErrors = Object.entries(
		nodeState?.Errors ?? {}
	).filter(([key, error]) => {
		const isControlEnabled =
			typeof controls[key].Condition === 'string'
				? computeEnabledState(controls[key].Condition)
				: true;

		return isControlEnabled && Boolean(error);
	});

	const unconfiguredValues = Object.entries(
		nodeState?.controlValues ?? {}
	).filter(([key, val]) => {
		const isControlEnabled =
			typeof controls[key].Condition === 'string'
				? computeEnabledState(controls[key].Condition)
				: true;

		return isControlEnabled && val === '';
	});

	const outputErrors: Array<[string, NodeErrorTypes]> = [];

	nodeDetails.Outputs.forEach(output => {
		const computedFreq = getValueFromClockDictionary(output.Name);

		const isOutputEnabled = output.Condition
			? computeEnabledState(output.Condition)
			: true;

		if (!isOutputEnabled) {
			return;
		}

		const isGreaterThanMaxAllowed =
			typeof output.MaximumValue === 'number' &&
			Number(computedFreq) > output.MaximumValue;

		const isLessThanMinAllowed =
			typeof output.MinimumValue === 'number' &&
			Number(computedFreq) < output.MinimumValue;

		const hasUnconfiguredValue =
			computedFreq === EMPTY_CLOCK_VALUE ||
			computedFreq === UNDEFINED_MARKER;

		if (isGreaterThanMaxAllowed) {
			outputErrors.push([
				output.Name,
				nodeErrorTypes.highComputedValue
			]);
		}

		if (isLessThanMinAllowed) {
			outputErrors.push([output.Name, 'LOW_COMPUTED_VALUE']);
		}

		if (hasUnconfiguredValue) {
			outputErrors.push([output.Name, 'UNCONFIGURED_VALUE']);
		}
	});

	if (outputErrors.length) {
		return outputErrors[0];
	}

	if (controlErrors.length) {
		return controlErrors[0] as [string, NodeErrorTypes];
	}

	if (unconfiguredValues.length) {
		return ['', nodeErrorTypes.unconfiguredValue];
	}

	return undefined;
}

export function generateOutputValueErrorString(
	error: [string, NodeErrorTypes],
	nodeState: ClockNodeState | undefined,
	nodeDetails: ClockNode
) {
	let errorString: string = EMPTY_CLOCK_VALUE;
	const [id, errorType] = error;
	const {
		highComputedValue,
		lowComputedValue,
		unconfiguredValue,
		integer,
		minVal,
		maxVal
	} = nodeErrorTypes;

	if (errorType === integer || errorType === unconfiguredValue)
		return 'Please check your configuration to correct error';

	const errorTypePrefix =
		errorType === minVal || errorType === lowComputedValue
			? '(Min'
			: errorType === maxVal || errorType === highComputedValue
				? '(Max'
				: undefined;

	if (errorType === minVal || errorType === maxVal) {
		const controls = getSocControlsDictionary('ClockConfig');

		const allowedValue =
			errorType === minVal
				? controls[id].MinimumValue + ')'
				: errorType === maxVal
					? controls[id].MaximumValue + ')'
					: '';

		errorString = `${nodeState?.controlValues?.[id] ?? ''} ${errorTypePrefix} ${allowedValue}`;
	}

	if (
		errorType === highComputedValue ||
		errorType === lowComputedValue
	) {
		const computedFreq = getValueFromClockDictionary(id);
		const outputConfig = nodeDetails.Outputs.find(
			output => output.Name === id
		);

		if (!outputConfig) {
			return EMPTY_CLOCK_VALUE;
		}

		const allowedValue =
			errorType === lowComputedValue
				? (outputConfig.MinimumValue ?? 'missing min val') + ')'
				: errorType === highComputedValue
					? (outputConfig.MaximumValue ?? 'missing max val') + ')'
					: '';

		errorString = `${computedFreq} ${errorTypePrefix} ${allowedValue}`;
	}

	return errorString;
}
