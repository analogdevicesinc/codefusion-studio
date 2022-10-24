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
import type {ClockDictionary, ClockNode} from '@common/types/soc';
import {getClockNodes} from './api';

export let clockNodes: ClockNode[] | undefined;
export const clockDictionary: ClockDictionary = {};
export const clockNodeDictionary: Record<string, ClockNode> = {};

if (
	import.meta.env.MODE === 'development' ||
	((window as any).__webview_public_path__ as string)?.includes(
		'elf-explorer'
	)
) {
	clockNodes = (window as any).__DEV_SOC__?.ClockNodes ?? {};
} else {
	clockNodes = await getClockNodes();
}

if (Array.isArray(clockNodes)) {
	clockNodes.forEach(node => {
		clockNodeDictionary[node.Name] = node;

		node.Outputs.forEach(output => {
			clockDictionary[output.Name] = output;
		});
	});
}
