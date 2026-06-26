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

import type {ConfiguredProject, SocCore} from 'cfs-types';
import type {AiSupportingBackend} from '../../../common/types/ai-fusion-data-model';
import type {Core, Peripheral} from '../../../common/types/soc';
import {loadAiBackends} from '../state/slices/ai-tools/ai-backends';
import {findSupportedAiBackendsForCore} from '../screens/ai-tools/model-editor-view/ai-model-utils';

export type AISupportingCore = Core & {
	Accelerator?: string;
	Backend: string;
};

export type AIBackends = Record<string, AiSupportingBackend>;

let supportedBackends: AIBackends = {};
let modelTargets: AISupportingCore[] = [];

let aiSupportingCores: SocCore[] = [];
let aiAccellerators: Peripheral[] = [];

export function getAiBackends(): AIBackends {
	return supportedBackends;
}

/**
 * Loads the AI backends from the cfsai tool and generates all possible model targets.
 * @returns A record of AI backend ID to AI backend data
 */
export async function loadAIBackends(): Promise<
	AIBackends | undefined
> {
	if (
		!aiSupportingCores?.length ||
		Object.keys(supportedBackends).length
	) {
		return supportedBackends;
	}

	try {
		supportedBackends = await loadAiBackends();

		intializeModelTargets();
	} catch (error) {
		console.error('Failed to load AI Backends from plugin', error);
		supportedBackends = {};
	}

	return supportedBackends;
}

export function getAICores(): SocCore[] {
	return aiSupportingCores;
}

export function getAIModelTargets(): AISupportingCore[] {
	return modelTargets;
}

export function initializeAiToolsData(
	cores: Core[],
	peripherals: Peripheral[],
	projects?: ConfiguredProject[]
): void {
	aiSupportingCores = cores.filter(
		c =>
			c.Ai &&
			projects?.some(
				proj => proj.CoreId === c.Id && !proj.ExternallyManaged
			)
	);

	aiAccellerators = peripherals.filter(p => p.Ai);
}

function intializeModelTargets() {
	const supportedBackends = getAiBackends();
	modelTargets = aiSupportingCores.flatMap(core =>
		[
			core,
			...aiAccellerators
				// Get all cores and accellerator combinations
				.filter(acc => acc.Cores.includes(core.Id))
				.map<Omit<AISupportingCore, 'Backend'>>(acc => ({
					...core,
					Name: `${core.Name} + ${acc.Name} Accelerator`,
					Accelerator: acc.Name
				}))
		]
			// Here we now have [core, core+accellerator1, ...]
			// now we need to check what backends each supports and create entries for those
			// If a core supports multiple backends, we want an entry for each combination
			.flatMap(core => {
				const coreBackends = findSupportedAiBackendsForCore(
					supportedBackends,
					core
				);

				if (!coreBackends.length) {
					return [];
				}

				return coreBackends.length > 1
					? coreBackends.map(backend => ({
							...core,
							Name: `${core.Name} - ${supportedBackends[backend].DisplayName ?? backend}`,
							Backend: backend
						}))
					: [
							{
								...core,
								Backend: coreBackends[0]
							}
						];
			})
	);
}
