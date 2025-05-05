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
	ClockDictionary,
	ClockNode,
	ControlCfg
} from '@common/types/soc';
import {getClockNodes, getControlsFromCache} from './api';

let clockNodes: ClockNode[] | undefined;
const clockDictionary: ClockDictionary = {};
const clockNodeDictionary: Record<string, ClockNode> = {};
const clockTypeDictionary: Record<string, ClockNode[]> = {};

if (import.meta.env.MODE === 'development') {
	clockNodes = (window as any).__DEV_SOC__?.ClockNodes ?? [];
} else {
	clockNodes = await getClockNodes();
}

if (Array.isArray(clockNodes)) {
	clockNodes.forEach(node => {
		clockNodeDictionary[node.Name] = node;

		if (!clockTypeDictionary[node.Type]) {
			clockTypeDictionary[node.Type] = [];
		}

		clockTypeDictionary[node.Type].push(node);

		node.Outputs.forEach(output => {
			clockDictionary[output.Name] = output;
		});
	});

	sortClockNodes();
}

export function getClockNodeDictionary() {
	if (Object.keys(clockNodeDictionary).length === 0) {
		// Attempt to populate the clock nodes from local storage (for testing purposes)
		const localStorageClockNodes = localStorage.getItem('ClockNodes');

		if (localStorageClockNodes) {
			const parsedNodes: ClockNode[] = JSON.parse(
				localStorageClockNodes
			);

			Object.values(parsedNodes).forEach(node => {
				clockNodeDictionary[node.Name] = node;
			});
		} else {
			// If a test is not overriding the clock nodes, use the default dev soc in the window object
			((window as any).__DEV_SOC__?.ClockNodes ?? []).forEach(
				(node: ClockNode) => {
					clockNodeDictionary[node.Name] = node;
				}
			);
		}
	}

	return clockNodeDictionary;
}

export function getClockTypeDictionary() {
	if (Object.keys(clockTypeDictionary).length === 0) {
		// Attempt to populate the clock type dictionary from local storage (for testing purposes)
		const localStorageClockNodes = localStorage.getItem('ClockNodes');

		if (localStorageClockNodes) {
			const parsedNodes: ClockNode[] = JSON.parse(
				localStorageClockNodes
			);

			Object.values(parsedNodes).forEach(node => {
				if (!clockTypeDictionary[node.Type]) {
					clockTypeDictionary[node.Type] = [];
				}

				clockTypeDictionary[node.Type].push(node);
			});
		}

		sortClockNodes();
	}

	return clockTypeDictionary;
}

export function getClockNodeConfig(nodeName: string) {
	const nodes = getClockNodeDictionary();

	return nodes[nodeName];
}

export function getClockConfig(clockName: string) {
	return clockDictionary[clockName];
}

/**
 * Gets formatted controls for a specific scope, project ID and node name
 * @param scope The scope of the controls to get (e.g. 'clockConfig')
 * @param projectId The project ID to get controls for
 * @param nodeName The name of the node to get controls for
 * @returns The formatted controls object or an empty object if not found
 */
export function getTargetControls(
	scope: string,
	projectId: string,
	nodeName: string
) {
	const controls = getControlsFromCache(scope, projectId) ?? {};

	return (controls[nodeName] ?? []).reduce<
		Record<string, ControlCfg>
	>((acc, control) => {
		acc[control.Id] = control;

		return acc;
	}, {});
}

function sortClockNodes() {
	// Sort the clock type dictionary by name
	Object.keys(clockTypeDictionary).forEach(clockType => {
		clockTypeDictionary[clockType] = Object.values(
			clockTypeDictionary[clockType]
		).sort((a, b) =>
			a.Name.localeCompare(b.Name, 'en-US', {
				numeric: true,
				sensitivity: 'base'
			})
		);
	});
}
