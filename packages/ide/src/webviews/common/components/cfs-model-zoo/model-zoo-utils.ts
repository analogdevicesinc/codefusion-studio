/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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

import type {ModelZooSelectionData} from './CfsModelZoo';
import type {
	ModelData,
	ModelSupportedPlatform,
	ModelZooData
} from '../../types/model-zoo-data';

type GetZooModelPlatformParams = {
	selectedZooModel: ModelData;
	soc: string;
	board: string;
	core: string;
	accelerator?: string;
};

/**
 * Retrieves the correct ModelSupportedPlatform for the given zoo model, soc, board, core, and optional accelerator.
 */
export function getZooModelPlatform({
	selectedZooModel,
	soc,
	board,
	core,
	accelerator
}: GetZooModelPlatformParams): ModelSupportedPlatform | undefined {
	for (const platform of selectedZooModel?.supportedPlatforms ?? []) {
		if (
			platform.soc === soc &&
			(!board || platform.board === board) &&
			platform.core === core &&
			(!accelerator || platform.accelerator === accelerator)
		) {
			return platform;
		}
	}

	return undefined;
}

export function filterZooModelPlatforms(
	filters: {socs?: string[]; cores?: string[]},
	model: ModelData
): ModelSupportedPlatform[] {
	const {socs, cores} = filters;

	return model.supportedPlatforms.filter(
		platform =>
			(!socs?.length || socs.includes(platform.soc)) &&
			(!cores?.length || cores.includes(platform.core))
	);
}

/**
 * Resolves a zoo model selection to a model file URL string for the given soc/board/core combination.
 * If no core is provided, falls back to the first matching platform for the soc/board.
 */
// eslint-disable-next-line max-params
export function resolveZooModelUrl(
	zooModel: ModelZooSelectionData,
	soc: string,
	board: string,
	core?: string,
	accelerator?: string
): {modelUrl: string | undefined; datasetUrl: string | undefined} {
	const platform = core
		? getZooModelPlatform({
				selectedZooModel: zooModel.model,
				soc,
				board,
				core,
				accelerator
			})
		: zooModel.model.supportedPlatforms.find(
				p => p.soc === soc && p.board === board
			);

	if (!platform) {
		return {modelUrl: undefined, datasetUrl: undefined};
	}

	return {
		modelUrl: `${zooModel.model.baseURL}/${
			platform.modelPaths[zooModel.quantization] ?? ''
		}`,
		datasetUrl: `${zooModel.model.baseURL}/${
			platform.sample_binary?.[zooModel.quantization] ?? ''
		}`
	};
}

/**
 * Fetches and aggregates model zoo data from all configured URLs.
 * Returns a flat array of all available models across all model zoo sources.
 */
export async function fetchModelZooData(
	getPreference: (id: string) => Promise<any>
): Promise<ModelData[]> {
	const urls: string[] = (await getPreference(
		'modelZoo.urls'
	)) as string[];

	if (!urls || !Array.isArray(urls)) {
		return [];
	}

	const results = await Promise.all(
		urls.map(async url => {
			try {
				const modelZooUrl = new URL(url);
				modelZooUrl.pathname = modelZooUrl.pathname.replace(
					/\/$/,
					''
				);
				const response = await fetch(
					modelZooUrl.toString() + '/model_index.json'
				);

				if (!response.ok) {
					throw new Error(
						`Failed to fetch model zoo data from ${url}: ${response.statusText}`
					);
				}

				const resp: ModelZooData = await response.json();

				if (!resp.models || !Array.isArray(resp.models)) {
					throw new Error(
						`Invalid model zoo data from ${url}: "models" field is missing or not an array`
					);
				}

				resp.models.forEach(model => {
					model.baseURL = modelZooUrl.toString();
				});

				return resp;
			} catch (error) {
				console.error(error);

				return undefined;
			}
		})
	);

	return (
		results
			.filter((data): data is ModelZooData => data !== undefined)
			.reduce<ModelData[]>((acc, data) => {
				acc.push(...data.models);

				return acc;
			}, [])
			// Filter out invalid models
			// Currently only single file TensorFlow models are supported
			.filter(model => model.framework === 'tensorflow')
			.map(model => {
				(model as any).supportedPlatforms =
					model.supportedPlatforms.filter(
						p =>
							// Check if the the quantization is made up of a single file path (string) and not an array of paths (which is invalid)
							!Array.isArray(
								p.modelPaths[
									p.compilation?.quantization?.default ??
										Object.keys(p.modelPaths)[0]
								]
							)
					);

				return model;
			})
			.filter(model => model.supportedPlatforms.length > 0)
	);
}

export function getZooModelDisplayName(
	modelFile: ModelZooSelectionData | string
): string {
	return typeof modelFile === 'string'
		? modelFile
		: `${modelFile.model.displayName ?? modelFile.model.name} (${modelFile.quantization})`;
}
