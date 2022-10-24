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
import {
	type ConfigOptionsReturn,
	request,
	type ConfiguredClockNode,
	type ConfiguredPin
} from '@common/api';
import type {
	ClockNode,
	ClockNodeState,
	Controls,
	DiagramData
} from '@common/types/soc';
import type {ExportEngine} from '@common/types/engines';

export async function getPersistedSocData(): Promise<ConfigOptionsReturn> {
	return request('get-soc-config') as Promise<ConfigOptionsReturn>;
}

export async function getExportEngines() {
	return request('get-export-engines') as Promise<ExportEngine[]>;
}

export async function generateCode(engine: string) {
	return request('generate-code', {
		engine
	}) as Promise<string>;
}

export async function getSocControls() {
	return request('get-soc-controls') as Promise<Controls>;
}

export async function getClockCanvas() {
	return request('get-clock-canvas') as Promise<
		DiagramData | undefined
	>;
}

export async function getClockNodes() {
	return request('get-clock-nodes') as Promise<ClockNode[]>;
}

export async function updatePersistedPinAssignments(
	updatedPins: ConfiguredPin[],
	modifiedClockNodes: Array<
		ClockNodeState & {EnabledControls: Record<string, boolean>}
	>
) {
	return request('update-pin-assignments', {
		updatedPins,
		modifiedClockNodes
	}) as Promise<void>;
}

export async function updatePersistedClockNodesAssignments(
	updatedClockNode: ConfiguredClockNode,
	initialControlValues: Record<string, string> | undefined,
	modifiedClockNodes: Array<
		ClockNodeState & {EnabledControls: Record<string, boolean>}
	>
) {
	return request('update-clock-node-assignments', {
		updatedClockNode,
		initialControlValues,
		modifiedClockNodes
	}) as Promise<void>;
}
