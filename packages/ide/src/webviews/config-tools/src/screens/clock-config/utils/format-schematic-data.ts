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
import {getClockNodeConfig} from '../../../utils/clock-nodes';
import type {ClockNodeStatus} from '../../../utils/clock-evaluation';

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

// eslint-disable-next-line max-params
export function formatDiagramData(
	data: DiagramData,
	colorsRecord: Record<string, string>,
	currentConfig: GlobalConfig,
	computedFrequencies: Record<string, number | string>,
	nodeStatuses: Record<string, ClockNodeStatus>
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

			const nodeConfig = getClockNodeConfig(
				formattedData.parts[part].name
			);

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
				// Use precomputed error status from clock-evaluation
				const nodeName = formattedData.parts[part].name;
				const nodeStatus = nodeStatuses[nodeName];

				formattedData.parts[part].error =
					nodeStatus?.hasError ?? false;
			}
		}
	}

	return formattedData;
}
