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

import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {type AIModel} from 'cfs-plugins-api';
import {getAiBackends} from '../../../utils/ai-tools';

export const aiToolsScreens = {
	ModelList: '.model-list',
	AddEditModel: '.add-edit-model'
};

/**
 * Enhanced AIModel type with a unique ID field for frontend state management.
 * The ID is not persisted and is only used for identifying models in the UI.
 */
export type AIModelWithId = AIModel & {
	id: string;
};

export enum CompatabilityStatus {
	Compatible = 'compatible',
	Incompatible = 'incompatible',
	Running = 'running',
	Error = 'error'
}

export type AIModelState = {
	aiModels: AIModelWithId[];
	editingModel?: AIModelWithId;
	editPanelOpen?: boolean;
	compatibilityState: Record<
		string,
		{state: CompatabilityStatus; reportPath?: string} | undefined
	>;
};

const aiModelInitialState: AIModelState = {
	aiModels: [],
	editingModel: undefined,
	compatibilityState: {}
};
type SaveAction = {
	model: AIModelWithId;
	originalName?: string;
};

export const defaultEmptyAIModel: AIModelWithId = {
	Name: '',
	Target: {Core: '', Accelerator: ''},
	Files: {},
	Enabled: true,
	Backend: {
		Name: '',
		Extensions: {}
	},
	id: ''
};

const aiModelContextSlice = createSlice({
	name: 'aiModelContext',
	initialState: aiModelInitialState,
	reducers: {
		editModel(state, action: PayloadAction<AIModelWithId>) {
			state.editingModel = action.payload;
			state.editPanelOpen = true;
		},
		createNewModel(state) {
			state.editPanelOpen = true;
		},
		saveEditingModel(state, action: PayloadAction<SaveAction>) {
			const editingModel = action.payload.model ?? state.editingModel;

			if (
				editingModel &&
				action.payload.originalName &&
				state.aiModels.find(
					model => model.id === action.payload.model.id
				)
			) {
				state.aiModels = state.aiModels.map(model =>
					model.id === action.payload.model.id
						? action.payload.model
						: model
				);
			} else {
				const newModel = {
					...action.payload.model,
					id: action.payload.model.id || crypto.randomUUID()
				};

				state.aiModels.push(newModel);

				ensureMaxActiveModels(state, newModel);
				ensureOnlyOneModelWithSameNameIsEnabled(state, newModel);
			}

			state.editingModel = undefined;
			state.editPanelOpen = false;

			state.compatibilityState = Object.fromEntries(
				Object.entries(state.compatibilityState).filter(
					([key]) => key !== action.payload.model.id
				)
			);
		},
		cancelEditingModel(state) {
			state.editingModel = undefined;
			state.editPanelOpen = false;
		},
		toggleModelActive(
			state,
			action: PayloadAction<{model: AIModelWithId}>
		) {
			const {id, Enabled} = action.payload.model;
			state.aiModels = state.aiModels.map(model => {
				if (model.id === id) {
					return {...model, Enabled: !Enabled};
				}

				return model;
			});
			ensureMaxActiveModels(state, action.payload.model);
			ensureOnlyOneModelWithSameNameIsEnabled(
				state,
				action.payload.model
			);
		},
		deleteModel(state, action: PayloadAction<string>) {
			const modelId = action.payload;
			state.aiModels = state.aiModels.filter(
				model => model.id !== modelId
			);
			state.compatibilityState = Object.fromEntries(
				Object.entries(state.compatibilityState).filter(
					([key]) => key !== modelId
				)
			);
		},
		setCompatibilityState(
			state,
			action: PayloadAction<{
				modelId: string;
				status: CompatabilityStatus | undefined;
				reportPath?: string;
			}>
		) {
			const {modelId, status} = action.payload;
			state.compatibilityState = {
				...state.compatibilityState,
				[modelId]: status
					? {state: status, reportPath: action.payload.reportPath}
					: undefined
			};
		}
	}
});

function ensureMaxActiveModels(
	state: AIModelState,
	changedModel: AIModelWithId
) {
	const backends = getAiBackends();
	const maxActiveModels =
		backends[changedModel.Backend.Name]?.MaxModels;

	if (!maxActiveModels) {
		return;
	}

	const relevantModels = state.aiModels.filter(
		m =>
			m.Target.Core.toUpperCase() ===
				changedModel.Target.Core.toUpperCase() &&
			m.Target.Accelerator === changedModel.Target.Accelerator
	);

	const enabledModels = relevantModels.filter(m => m.Enabled);

	if (enabledModels.length > maxActiveModels) {
		const modelsToDisable = enabledModels.length - maxActiveModels;

		enabledModels
			.filter(m => m.id !== changedModel.id)
			.slice(0, modelsToDisable)
			.forEach(m => {
				m.Enabled = false;
			});
	}
}

function ensureOnlyOneModelWithSameNameIsEnabled(
	state: AIModelState,
	changedModel: AIModelWithId
) {
	const relevantModels = state.aiModels.filter(
		m => m.Name === changedModel.Name && m.id !== changedModel.id
	);

	if (relevantModels.length > 0) {
		relevantModels.forEach(m => {
			m.Enabled = false;
		});
	}
}

export const {
	editModel,
	toggleModelActive,
	saveEditingModel,
	cancelEditingModel,
	createNewModel,
	deleteModel,
	setCompatibilityState
} = aiModelContextSlice.actions;

export const aiModelReducer = aiModelContextSlice.reducer;
