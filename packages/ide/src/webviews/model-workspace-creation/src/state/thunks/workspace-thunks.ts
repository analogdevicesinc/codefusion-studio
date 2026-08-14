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
import {resolveCoreDataModelId} from '../../contexts/CatalogContext';
import type {AIModelCfsWorkspace} from 'cfs-types';

export const validateAndGenerateWorkspace = createAsyncThunk(
	'workspace/validateAndGenerate',
	async (catalog: SocCatalog, {getState, dispatch}) => {
		dispatch(validateWorkspace(catalog));

		const state = getState() as RootState;
		const errors = state.workspaceConfigReducer.errors ?? {};

		if (Object.keys(errors).length > 0) {
			throw new Error('Validation failed');
		}

		const {modelFile, soc, board, runModelOn} =
			state.workspaceConfigReducer;

		let generateWorkspaceUpdate:
			| Partial<AIModelCfsWorkspace>
			| undefined;

		// Resolve zoo model selection to a URL string before generating
		if (typeof modelFile !== 'string') {
			const zooModel = modelFile as ModelZooSelectionData;
			const coreId =
				resolveCoreDataModelId(soc!, runModelOn[0]) ?? runModelOn[0];
			const resolvedUrls = resolveZooModelUrl(
				zooModel,
				soc!,
				board!,
				coreId
			);

			if (!resolvedUrls) {
				throw new Error(
					'Could not resolve model URL for the selected platform'
				);
			}

			generateWorkspaceUpdate = {
				modelFile: resolvedUrls.modelUrl ?? '',
				sampleData: resolvedUrls.datasetUrl ?? ''
			};
		}

		messenger.sendNotification(
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
			const coreId =
				resolveCoreDataModelId(soc, runModelOn[0]) ?? runModelOn[0];
			const resolvedUrls = resolveZooModelUrl(
				zooModel,
				soc,
				board,
				coreId
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
