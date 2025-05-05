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
	ClockNodesDictionary,
	ClockNodeState
} from '../../../common/types/soc';
import {
	EMPTY_CLOCK_VALUE,
	UNDEFINED_MARKER
} from '../screens/clock-config/constants/clocks';
import type {NodeErrorTypes} from '../types/errorTypes';
import {getClockNodeConfig, getTargetControls} from './clock-nodes';
import {nodeErrorTypes} from './control-errors';
import {getValueFromClockDictionary} from './rpn-expression-resolver';
import {getPrimaryProjectId} from './config';
import {CONTROL_SCOPES} from '../constants/scopes';

export function getCurrentNodeError(
	nodeState: ClockNodeState,
	computeEnabledState: (
		condition: string,
		currentNode: string
	) => boolean
): [string, NodeErrorTypes] | undefined {
	const projectId = getPrimaryProjectId();
	const nodeDetails = getClockNodeConfig(nodeState?.Name ?? '');

	const targetControls = getTargetControls(
		'clockConfig',
		projectId ?? '',
		nodeState?.Name ?? ''
	);

	const controlErrors = Object.entries(
		nodeState?.Errors ?? {}
	).filter(([key, error]) => {
		const isControlEnabled =
			typeof targetControls[key]?.Condition === 'string'
				? computeEnabledState(
						targetControls[key].Condition,
						nodeState.Name
					)
				: true;

		return isControlEnabled && Boolean(error);
	});

	const unconfiguredValues = Object.entries(
		nodeState?.controlValues ?? {}
	).filter(([key, val]) => {
		const isControlEnabled =
			typeof targetControls[key]?.Condition === 'string'
				? computeEnabledState(
						targetControls[key].Condition,
						nodeState?.Name ?? ''
					)
				: true;

		return isControlEnabled && val === '';
	});

	const outputErrors: Array<[string, NodeErrorTypes]> = [];

	Object.values(nodeDetails?.Outputs ?? {}).forEach(output => {
		const computedFreq = getValueFromClockDictionary(output.Name);

		const isOutputEnabled = output.Condition
			? computeEnabledState(output.Condition, nodeState.Name)
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

// eslint-disable-next-line complexity
export function generateOutputValueErrorString(
	error: [string, NodeErrorTypes],
	nodeState: ClockNodeState | undefined
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
		const projectId = getPrimaryProjectId();

		const targetControls = getTargetControls(
			CONTROL_SCOPES.CLOCK_CONFIG,
			projectId ?? '',
			nodeState?.Name ?? ''
		);

		const allowedValue =
			errorType === minVal
				? targetControls[id].MinimumValue + ')'
				: errorType === maxVal
					? targetControls[id].MaximumValue + ')'
					: '';

		errorString = `${nodeState?.controlValues?.[id] ?? ''} ${errorTypePrefix} ${allowedValue}`;
	}

	if (
		errorType === highComputedValue ||
		errorType === lowComputedValue
	) {
		const nodeDetails = getClockNodeConfig(nodeState?.Name ?? '');
		const computedFreq = getValueFromClockDictionary(id);

		const outputConfig = nodeDetails?.Outputs.find(
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

export const computeClockNodeErr = (
	clockConfig: ClockNodesDictionary,
	diagramData: Record<
		string,
		{
			enabled: boolean | undefined;
			error: boolean | undefined;
		}
	>,
	computeEnabledState: (
		condition: string,
		currentNode?: string
	) => boolean
): number => {
	let counter = 0;

	Object.values(clockConfig).forEach(node => {
		const isNodeEnabled = diagramData[node.Name]?.enabled;

		if (!isNodeEnabled) return;

		const currentError = getCurrentNodeError(
			node,
			computeEnabledState
		);

		if (currentError !== undefined) {
			counter++;
		}
	});

	return counter;
};
