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

import type {AiSupportingBackend} from '../../../common/types/ai-fusion-data-model';
import type {Core, Peripheral} from '../../../common/types/soc';
import {loadAiBackends} from '../state/slices/ai-tools/ai-backends';

export type AISupportingCore = Core & {
	Accelerator?: string;
	Family: string;
};

export type AIBackends = Record<string, AiSupportingBackend>;

let supportedBackends: AIBackends;
let aiCores: AISupportingCore[] = [];

export function getAiBackends(): AIBackends {
	return supportedBackends ?? {};
}

export async function loadAIBackends(): Promise<
	AIBackends | undefined
> {
	if (!aiCores?.length || supportedBackends) {
		return supportedBackends;
	}

	try {
		supportedBackends = await loadAiBackends();
	} catch (error) {
		console.error('Failed to load AI Backends from plugin', error);
		supportedBackends = {};
	}

	return supportedBackends;
}

export function getAICores(): AISupportingCore[] {
	return aiCores;
}

export function initializeAiToolsData(
	cores: Core[],
	peripherals: Peripheral[]
): void {
	const aiSupportingCores = cores.filter(c => c.Ai);
	const aiAccellerators = peripherals.filter(p => p.Ai);

	aiCores = aiSupportingCores.flatMap(core => [
		core,
		...aiAccellerators
			.filter(acc => acc.Cores.includes(core.Id))
			.map(acc => ({
				...core,
				Name: `${core.Name} + ${acc.Name} Accelerator`,
				Accelerator: acc.Name,
				Family: core.Family
			}))
	]);
}
