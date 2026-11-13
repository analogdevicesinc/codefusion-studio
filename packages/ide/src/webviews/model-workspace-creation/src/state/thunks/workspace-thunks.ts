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

import {createAsyncThunk} from '@reduxjs/toolkit';
import type {RootState} from '../store';
import {
	validateWorkspace,
	type SocCatalog
} from '../slices/workspace-reducer';
import {messenger} from '@common/contexts/MessengerContext';
import {
	generateWorkspace,
	runCompatibilityCheck
} from '@constants/messages/model-to-workspace';
import type {ModelZooSelectionData} from '../../../../common/components/cfs-model-zoo/CfsModelZoo';
import {resolveZooModelUrl} from '../../../../common/components/cfs-model-zoo/model-zoo-utils';
import type {AIModelCfsWorkspace} from 'cfs-types';

/**
 * Reason why the user should be warned before creating the workspace.
 * - `incompatible`: at least one selected core reported the model as incompatible
 * - `error`: the compatibility check failed for at least one selected core
 * - `untested`: the compatibility check has not completed yet
 */
export type CompatibilityWarning =
	| 'incompatible'
	| 'error'
	| 'untested';

/**
 * Determines whether the compatibility status of the selected cores warrants
 * a warning before the workspace is created.
 */
export function getCompatibilityWarning(
	state: RootState
): CompatibilityWarning | undefined {
	const {soc, runModelOn, compatibilityStatus} =
		state.workspaceConfigReducer;
	const compatStatus = soc ? compatibilityStatus[soc] : undefined;

	if (compatStatus === 'error') {
		return 'error';
	}

	if (typeof compatStatus !== 'object') {
		return 'untested';
	}

	// The check has finished, so a selected core without a result means the
	// check could not produce one for it.
	// runModelOn holds dataModelCoreIDs, which key the compatibility status.
	const selectedStatuses = runModelOn.map(
		coreId => compatStatus[coreId] ?? 'error'
	);

	if (selectedStatuses.some(status => status === 'error')) {
		return 'error';
	}

	if (selectedStatuses.some(status => status === false)) {
		return 'incompatible';
	}

	return undefined;
}

export type GenerateWorkspaceResult =
	| {success: true}
	| {success: false; compatibilityWarning: CompatibilityWarning};

export const validateAndGenerateWorkspace = createAsyncThunk<
	GenerateWorkspaceResult,
	{catalog: SocCatalog; ignoreCompatibilityWarning?: boolean}
>(
	'workspace/validateAndGenerate',
	async (
		{catalog, ignoreCompatibilityWarning},
		{getState, dispatch}
	) => {
		dispatch(validateWorkspace(catalog));

		const state = getState() as RootState;
		const errors = state.workspaceConfigReducer.errors ?? {};

		if (Object.keys(errors).length > 0) {
			throw new Error('Validation failed');
		}

		if (!ignoreCompatibilityWarning) {
			const compatibilityWarning = getCompatibilityWarning(state);

			if (compatibilityWarning) {
				return {success: false, compatibilityWarning};
			}
		}

		const {modelFile, soc, board, runModelOn} =
			state.workspaceConfigReducer;

		// Only a single core is supported for now
		const [coreId] = runModelOn;

		let generateWorkspaceUpdate: Partial<AIModelCfsWorkspace> = {
			coreId
		};

		// Resolve zoo model selection to a URL string before generating
		if (typeof modelFile !== 'string') {
			const zooModel = modelFile as ModelZooSelectionData;
			const resolvedUrls = resolveZooModelUrl(
				zooModel,
				soc!,
				board!,
				coreId!
			);

			if (!resolvedUrls) {
				throw new Error(
					'Could not resolve model URL for the selected platform'
				);
			}

			generateWorkspaceUpdate = {
				...generateWorkspaceUpdate,
				modelFile: resolvedUrls.modelUrl ?? '',
				sampleData: resolvedUrls.datasetUrl ?? ''
			};
		}

		// Resolves once the workspace and its AI model code are generated,
		// rejects if the extension failed to generate them.
		await messenger.sendRequest(
			generateWorkspace,
			{type: 'extension'},
			generateWorkspaceUpdate
		);

		return {success: true};
	}
);

export const checkCompatibility = createAsyncThunk(
	'workspaceConfig/checkCompatibility',
	async (_, {getState, rejectWithValue}) => {
		const state = getState() as RootState;
		const {soc, board, modelFile, sampleData, runModelOn} =
			state.workspaceConfigReducer;

		// Check if all required values exist
		if (!soc || !board || !modelFile) {
			return undefined;
		}

		// Resolve zoo model selection to a URL string
		let resolvedModelFile: string;
		let resolvedDatasetFile: string | undefined;

		if (typeof modelFile === 'string') {
			resolvedModelFile = modelFile;
			resolvedDatasetFile = sampleData;
		} else {
			const zooModel = modelFile as ModelZooSelectionData;
			const resolvedUrls = resolveZooModelUrl(
				zooModel,
				soc,
				board,
				runModelOn[0]
			);

			if (!resolvedUrls) {
				return rejectWithValue(
					'Could not resolve model URL for the selected platform'
				);
			}

			resolvedModelFile = resolvedUrls.modelUrl ?? '';
			resolvedDatasetFile = resolvedUrls.datasetUrl;
		}

		try {
			const result = await messenger.sendRequest(
				runCompatibilityCheck,
				{type: 'extension'},
				{
					soc,
					modelFile: resolvedModelFile,
					sampleData: resolvedDatasetFile,
					board
				}
			);

			return result;
		} catch (error) {
			return rejectWithValue(error);
		}
	}
);
