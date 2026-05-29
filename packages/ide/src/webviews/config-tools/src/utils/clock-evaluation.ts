/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
	AppliedSignal,
	ClockNodesDictionary,
	PinState
} from '../../../common/types/soc';
import type {NodeErrorTypes} from '../../../common/types/errorTypes';
import {
	EMPTY_CLOCK_VALUE,
	UNDEFINED_MARKER
} from '../screens/clock-config/constants/clocks';
import {getClockNodeConfig, getTargetControls} from './clock-nodes';
import {getPrimaryProjectId} from './config';
import {evaluateClockCondition} from './rpn-expression-resolver';
import type {GlobalConfig} from './rpn-expression-resolver';
import type {PeripheralConfig} from '../types/peripherals';
import {nodeErrorTypes} from '../../../common/utils/control-errors';
import {getClockCanvas} from './clock-canvas';

/**
 * Represents the evaluation status of a single clock node.
 */
export type ClockNodeStatus = {
	/** Whether this node is enabled based on conditions */
	enabled: boolean;
	/** Whether this node has any configuration errors */
	hasError: boolean;
	/** The first error type found, if any */
	errorType?: NodeErrorTypes;
	/** Human-readable error message, if any */
	errorMessage?: string;
	/** The control or output name associated with the error */
	errorKey?: string;
};

/**
 * Represents the evaluation status of a clock wire/connection.
 */
export type ClockWireStatus = {
	/** Whether this wire is enabled based on conditions */
	enabled: boolean;
};

/**
 * Summary of all clock configuration errors.
 */
export type ClockErrorSummary = {
	/** Total count of nodes with errors */
	totalErrors: number;
	/** Status details per node */
	byNode: Record<string, ClockNodeStatus>;
};

/**
 * Computes the enabled state for a clock node based on its condition.
 *
 * @param nodeName - Name of the clock node
 * @param condition - Condition string from the SoC data model
 * @param clockConfig - Current clock configuration
 * @returns Whether the node is enabled
 */
function evaluateNodeEnabled(
	nodeName: string,
	condition: string | undefined,
	globalConfig: GlobalConfig
): boolean {
	if (condition === undefined) {
		return true;
	}

	return evaluateClockCondition(
		{...globalConfig, currentNode: nodeName},
		condition
	);
}

/**
 * Evaluates a single clock node to determine its enabled state and any errors.
 *
 * @param nodeName - Name of the clock node
 * @param nodeCondition - Optional condition that determines if the node is enabled
 * @param clockConfig - Current clock configuration
 * @param computedFrequencies - Computed frequency values per clock output
 * @returns ClockNodeStatus with enabled state and error information
 */

type EvaluateClockNodeParams = {
	nodeName: string;
	nodeCondition: string | undefined;
	clockConfig: ClockNodesDictionary;
	computedFrequencies: Record<string, number | string>;
	globalConfig: GlobalConfig;
};

export function evaluateClockNode({
	nodeName,
	nodeCondition,
	clockConfig,
	computedFrequencies,
	globalConfig
}: EvaluateClockNodeParams): ClockNodeStatus {
	const enabled = evaluateNodeEnabled(
		nodeName,
		nodeCondition,
		globalConfig
	);

	// If node is disabled, no need to check for errors
	if (!enabled) {
		return {enabled, hasError: false};
	}

	const nodeState = clockConfig[nodeName];
	const nodeDetails = getClockNodeConfig(nodeName);
	const projectId = getPrimaryProjectId();

	if (!nodeState || !nodeDetails) {
		return {enabled, hasError: false};
	}

	const targetControls = getTargetControls(
		'clockConfig',
		projectId ?? '',
		nodeName
	);

	// Check for control errors
	const controlErrors = Object.entries(nodeState.Errors ?? {}).filter(
		([key, error]) => {
			const isControlEnabled =
				typeof targetControls[key]?.Condition === 'string'
					? evaluateClockCondition(
							{...globalConfig, currentNode: nodeName},
							targetControls[key]?.Condition ?? ''
						)
					: true;

			return isControlEnabled && Boolean(error);
		}
	);

	if (controlErrors.length > 0) {
		const [key, errorType] = controlErrors[0];

		return {
			enabled,
			hasError: true,
			errorType: errorType as NodeErrorTypes,
			errorKey: key
		};
	}

	// Check for unconfigured control values
	const unconfiguredValues = Object.entries(
		nodeState.controlValues ?? {}
	).filter(([key, val]) => {
		const isControlEnabled =
			typeof targetControls[key]?.Condition === 'string'
				? evaluateClockCondition(
						{...globalConfig, currentNode: nodeName},
						targetControls[key]?.Condition ?? ''
					)
				: true;

		return isControlEnabled && val === '';
	});

	if (unconfiguredValues.length > 0) {
		const [key] = unconfiguredValues[0];

		return {
			enabled,
			hasError: true,
			errorType: nodeErrorTypes.unconfiguredValue,
			errorKey: key
		};
	}

	// Check for output errors (frequency thresholds)
	for (const output of nodeDetails.Outputs ?? []) {
		const computedFreq = computedFrequencies[output.Name];

		const isOutputEnabled = output.Condition
			? evaluateClockCondition(
					{...globalConfig, currentNode: nodeName},
					output.Condition
				)
			: true;

		if (!isOutputEnabled) {
			continue;
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
			return {
				enabled,
				hasError: true,
				errorType: nodeErrorTypes.highComputedValue,
				errorKey: output.Name
			};
		}

		if (isLessThanMinAllowed) {
			return {
				enabled,
				hasError: true,
				errorType: nodeErrorTypes.lowComputedValue,
				errorKey: output.Name
			};
		}

		if (hasUnconfiguredValue) {
			return {
				enabled,
				hasError: true,
				errorType: nodeErrorTypes.unconfiguredValue,
				errorKey: output.Name
			};
		}
	}

	return {enabled, hasError: false};
}

/**
 * Computes status for all clock nodes in the configuration.
 *
 * @param clockConfig - Current clock configuration
 * @param computedFrequencies - Computed frequency values per clock output
 * @param globalConfig - Global configuration including clock config and assigned pins
 * @returns Record of ClockNodeStatus keyed by node name
 */
export function computeClockNodesStatus(
	clockConfig: ClockNodesDictionary,
	computedFrequencies: Record<string, number | string>,
	globalConfig: GlobalConfig
): Record<string, ClockNodeStatus> {
	const clockCanvas = getClockCanvas();

	if (!clockCanvas) {
		return {};
	}

	const statuses: Record<string, ClockNodeStatus> = {};

	for (const partKey in clockCanvas.parts) {
		if (
			Object.prototype.hasOwnProperty.call(clockCanvas.parts, partKey)
		) {
			const part = clockCanvas.parts[partKey];
			const nodeName = part.name;

			// Check mount condition first
			if (typeof part.mount === 'string') {
				const shouldMount = evaluateClockCondition(
					globalConfig,
					part.mount
				);

				if (!shouldMount) {
					// Node is not mounted, skip evaluation
					continue;
				}
			}

			statuses[nodeName] = evaluateClockNode({
				nodeName,
				nodeCondition: part.condition,
				clockConfig,
				computedFrequencies,
				globalConfig
			});
		}
	}

	return statuses;
}

/**
 * Computes status for all clock wires in the configuration.
 *
 * @param clockConfig - Current clock configuration
 * @param pinConfig - Applied signals keyed by peripheral/signal name
 * @param peripheralConfig - Peripheral allocations grouped by core
 * @param assignedPins - Pins with at least one applied signal
 * @returns Record of ClockWireStatus keyed by wire key
 */
export function computeClockWireStatuses(
	clockConfig: ClockNodesDictionary,
	pinConfig: Record<string, AppliedSignal> = {},
	peripheralConfig: Record<string, Record<string, PeripheralConfig>> = {},
	assignedPins: PinState[] = []
): Record<string, ClockWireStatus> {
	const clockCanvas = getClockCanvas();

	if (!clockCanvas) {
		return {};
	}

	const statuses: Record<string, ClockWireStatus> = {};
	const baseGlobalConfig: GlobalConfig = {
		clockconfig: clockConfig,
		pinconfig: pinConfig,
		peripheralconfig: peripheralConfig,
		assignedPins
	};

	for (const wireKey in clockCanvas.wires) {
		if (
			Object.prototype.hasOwnProperty.call(clockCanvas.wires, wireKey)
		) {
			const wire = clockCanvas.wires[wireKey];

			// Check mount condition first
			if (typeof wire.mount === 'string') {
				const shouldMount = evaluateClockCondition(
					baseGlobalConfig,
					wire.mount
				);

				if (!shouldMount) {
					// Wire is not mounted, skip
					continue;
				}
			}

			const enabled =
				wire.condition === undefined
					? true
					: evaluateClockCondition(
							baseGlobalConfig,
							wire.condition
						);

			statuses[wireKey] = {enabled};
		}
	}

	return statuses;
}

/**
 * Computes a summary of all clock configuration errors.
 *
 * @param clockConfig - Current clock configuration
 * @param computedFrequencies - Computed frequency values per clock output
 * @param globalConfig - Global configuration including clock config and assigned pins
 * @returns ClockErrorSummary with total error count and per-node details
 */
export function computeClockErrorSummary(
	clockConfig: ClockNodesDictionary,
	computedFrequencies: Record<string, number | string>,
	globalConfig: GlobalConfig
): ClockErrorSummary {
	const byNode = computeClockNodesStatus(
		clockConfig,
		computedFrequencies,
		globalConfig
	);

	const totalErrors = Object.values(byNode).filter(
		status => status.enabled && status.hasError
	).length;

	return {totalErrors, byNode};
}
