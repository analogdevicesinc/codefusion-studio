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
/* eslint-disable @typescript-eslint/no-unnecessary-boolean-literal-compare */
/* eslint-disable complexity */
import type {DiagramData} from '@common/types/soc';
import {
	type GlobalConfig,
	evaluateClockCondition
} from '../../../utils/rpn-expression-resolver';
import {colorVariablesIds} from '../constants/color-variables';
import {
	EMPTY_CLOCK_VALUE,
	UNDEFINED_MARKER
} from '../constants/clocks';
import {
	getClockNodeConfig,
	getTargetControls
} from '../../../utils/clock-nodes';
import {getPrimaryProjectId} from '../../../utils/config';

function formatIconPath(iconName: string) {
	const resourcesPath =
		(window as any).__webview_resources_path__ ??
		'missing_resources_path';

	return `${resourcesPath}/icons/${iconName}`;
}

function formatFrequency(value: number): string {
	return Number.isInteger(value)
		? value.toString()
		: value.toFixed(3);
}

export function getFormattedClockFrequency(
	clockFrequency: string | number
) {
	if (clockFrequency === UNDEFINED_MARKER) {
		return EMPTY_CLOCK_VALUE;
	}

	const frequency =
		typeof clockFrequency === 'number'
			? clockFrequency
			: parseFloat(clockFrequency);

	if (frequency >= 1000000) {
		return formatFrequency(frequency / 1000000) + ' MHz';
	}

	if (frequency >= 1000) {
		return formatFrequency(frequency / 1000) + ' kHz';
	}

	return formatFrequency(frequency) + ' Hz';
}

export function formatDiagramData(
	data: DiagramData,
	colorsRecord: Record<string, string>,
	currentConfig: GlobalConfig,
	computedFrequencies: Record<string, number | string>
) {
	const formattedData: DiagramData = JSON.parse(JSON.stringify(data));

	for (const wire in formattedData.wires) {
		if (
			Object.prototype.hasOwnProperty.call(formattedData.wires, wire)
		) {
			if (typeof formattedData.wires[wire].mount === 'string') {
				const shouldMount = evaluateClockCondition(
					currentConfig,
					formattedData.wires[wire].mount ?? ''
				);

				if (shouldMount === false) {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete formattedData.wires[wire];
					continue;
				}
			}

			const {condition} = formattedData.wires[wire];

			if (condition === undefined) {
				formattedData.wires[wire].enabled = true;
			} else {
				formattedData.wires[wire].enabled = evaluateClockCondition(
					currentConfig,
					condition
				);
			}
		}
	}

	for (const part in formattedData.parts) {
		if (
			Object.prototype.hasOwnProperty.call(formattedData.parts, part)
		) {
			// Check if the node should be mounted first. In case it shouldn't, we remove the current part from "parts" object
			if (typeof formattedData.parts[part].mount === 'string') {
				const shouldMount = evaluateClockCondition(
					currentConfig,
					formattedData.parts[part].mount ?? ''
				);

				if (shouldMount === false) {
					// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
					delete formattedData.parts[part];
					continue;
				}
			}

			let clockValue: string | undefined;
			let clockKey: string | undefined;
			const {foreground} = colorVariablesIds;
			const fallbackForeground = '#ffffff';
			const {condition} = formattedData.parts[part];
			const {clockconfig} = currentConfig;

			const nodeConfig = getClockNodeConfig(
				formattedData.parts[part].name
			);

			const currentNodeConfig =
				clockconfig[formattedData.parts[part].name];

			formattedData.parts[part].styles.backgroundColor =
				'transparent';
			formattedData.parts[part].styles.fontColor =
				colorsRecord[foreground] || fallbackForeground;
			formattedData.parts[part].styles.circleColor =
				colorsRecord[foreground] || fallbackForeground;
			formattedData.parts[part].styles.borderColor =
				colorsRecord[foreground] || fallbackForeground;

			if (!formattedData.parts[part].icon.startsWith('http')) {
				formattedData.parts[part].styles.icon = formatIconPath(
					formattedData.parts[part].icon
				);

				formattedData.parts[part].icon = formatIconPath(
					formattedData.parts[part].icon
				);

				formattedData.parts[part].background = formatIconPath(
					formattedData.parts[part].background
				);
			}

			// Format metadata info
			formattedData.parts[part].metadata.description =
				nodeConfig?.Description ??
				`missing description for ${formattedData.parts[part].name}`;

			formattedData.parts[part].metadata.type =
				nodeConfig?.Type ??
				`missing type for ${formattedData.parts[part].name}`;

			// Format group info
			if (!formattedData.parts[part].clockReference) {
				formattedData.parts[part].clockReference =
					formattedData.parts[part].metadata.group;
			}

			if (
				formattedData.parts[part].clockReference?.includes('${Clock:')
			) {
				const match =
					formattedData.parts[part].clockReference?.match(
						/\${Clock:(.+?)}/
					);

				clockKey = match?.[1];

				if (clockKey) {
					clockValue = getFormattedClockFrequency(
						computedFrequencies[clockKey] ?? UNDEFINED_MARKER
					);
				}

				formattedData.parts[part].group =
					clockValue === UNDEFINED_MARKER ? '' : (clockValue ?? '');
				formattedData.parts[part].metadata.group =
					clockValue === UNDEFINED_MARKER ? '' : (clockValue ?? '');
			}

			if (condition === undefined) {
				formattedData.parts[part].enabled = true;
			} else {
				formattedData.parts[part].enabled = evaluateClockCondition(
					{
						...currentConfig,
						currentNode: formattedData.parts[part].name
					},
					condition
				);
			}

			if (formattedData.parts[part].enabled) {
				const projectId = getPrimaryProjectId();
				const targetControls = getTargetControls(
					'clockConfig',
					projectId ?? '',
					currentNodeConfig?.Name ?? ''
				);

				// Set error state of node
				const isControlError = Object.entries(
					currentNodeConfig?.Errors ?? {}
				).some(([key, error]) => {
					const isControlEnabled =
						typeof targetControls[key]?.Condition === 'string'
							? evaluateClockCondition(
									currentConfig,
									targetControls[key]?.Condition ?? ''
								)
							: true;

					return Boolean(error) && isControlEnabled;
				});

				const hasOutputError = nodeConfig?.Outputs?.some(output => {
					const {MaximumValue, MinimumValue} = output;

					const computedFreq = computedFrequencies[output.Name];

					const isOutputEnabled =
						typeof output.Condition === 'string'
							? evaluateClockCondition(
									currentConfig,
									output.Condition
								)
							: true;

					if (isOutputEnabled === false) {
						return false;
					}

					const isGreaterThanMaxAllowed =
						typeof MaximumValue === 'number' &&
						Number(computedFreq) > MaximumValue;

					const isLessThanMinAllowed =
						typeof MinimumValue === 'number' &&
						Number(computedFreq) < MinimumValue;

					const hasUnconfiguredValue =
						computedFreq === EMPTY_CLOCK_VALUE ||
						computedFreq === UNDEFINED_MARKER;

					return (
						isGreaterThanMaxAllowed ||
						isLessThanMinAllowed ||
						hasUnconfiguredValue
					);
				});

				const referencedClockConfig = nodeConfig?.Outputs?.filter(
					output => output.Name === clockKey
				)[0];

				const hasUnconfiguredValue =
					clockValue === UNDEFINED_MARKER ||
					clockValue === EMPTY_CLOCK_VALUE;

				const isGreaterThanMaxAllowed =
					typeof referencedClockConfig?.MaximumValue === 'number' &&
					Number(clockValue) > referencedClockConfig?.MaximumValue;

				const isLessThanMinAllowed =
					typeof referencedClockConfig?.MinimumValue === 'number' &&
					Number(clockValue) < referencedClockConfig?.MinimumValue;

				formattedData.parts[part].error =
					isControlError ||
					isGreaterThanMaxAllowed ||
					isLessThanMinAllowed ||
					hasUnconfiguredValue ||
					hasOutputError;
			}
		}
	}

	return formattedData;
}
