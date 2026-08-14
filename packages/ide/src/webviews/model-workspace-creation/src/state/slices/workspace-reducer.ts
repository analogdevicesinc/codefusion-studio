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
import {castDraft, type Draft} from 'immer';
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {
	checkCompatibility,
	validateAndGenerateWorkspace
} from '../thunks/workspace-thunks';
import {getLocalization} from '../../../../common/utils/localization';
import type {ModelZooSelectionData} from '../../../../common/components/cfs-model-zoo/CfsModelZoo';
import {getZooModelPlatform} from '../../../../common/components/cfs-model-zoo/model-zoo-utils';
import type {CorePart, SoC} from 'cfs-ccm-lib/dist';

export type SocCatalog = Array<
	SoC & {
		cores: Array<CorePart & {aiSupported: boolean}>;
	}
>;

// Core -> compatible status
type CompatibilityStatus =
	| Record<string, boolean | 'error'>
	| 'testing'
	| 'error'
	| undefined;

type WorkspaceConfigState = {
	modelFile: string | Draft<ModelZooSelectionData>;
	sampleData: string;
	workspaceName: string;
	soc?: string;
	board?: string;
	runModelOn: string[];
	errors?: {
		modelFile?: string;
		sampleData?: string;
		workspaceName?: string;
		board?: string;
		soc?: string;
		runModelOn?: string;
		compatibility?: string;
	};
	compatibilityStatus: Record<string, CompatibilityStatus>;
};

export const workspaceConfigInitialState: WorkspaceConfigState = {
	modelFile: '',
	sampleData: '',
	workspaceName: '',
	runModelOn: [],
	compatibilityStatus: {}
};

const workspaceConfigSlice = createSlice({
	name: 'workspaceConfig',
	initialState: workspaceConfigInitialState,
	reducers: {
		setModelFile(
			state,
			action: PayloadAction<string | ModelZooSelectionData>
		) {
			state.modelFile = castDraft(action.payload);
			delete state.errors?.modelFile;
			delete state.errors?.compatibility;
			state.compatibilityStatus = {};
		},
		setSampleData(state, action: PayloadAction<string>) {
			state.sampleData = action.payload;
			delete state.errors?.sampleData;
			state.compatibilityStatus = {};
		},
		setWorkspaceName(state, action: PayloadAction<string>) {
			state.workspaceName = action.payload;
			delete state.errors?.workspaceName;
		},
		setSoc(state, action: PayloadAction<string>) {
			if (state.soc !== action.payload) {
				state.soc = action.payload;
				state.board = undefined;
				state.runModelOn = [];
				delete state.errors?.compatibility;
				delete state.errors?.soc;
			}
		},
		setBoard(state, action: PayloadAction<string>) {
			state.board = action.payload;

			if (action.payload) {
				delete state.errors?.board;
			}
		},
		toggleRunModelOnCore(state, action: PayloadAction<string>) {
			const index = state.runModelOn.indexOf(action.payload);

			if (index === -1) {
				state.runModelOn.push(action.payload);
				delete state.errors?.runModelOn;
			} else {
				state.runModelOn.splice(index, 1);
			}
		},
		clearRunModelOn(state) {
			state.runModelOn = [];
		},
		validateWorkspace(state, action: PayloadAction<SocCatalog>) {
			state.errors = {};

			const l10n = getLocalization('model-wrksp')?.validationErrors;

			if (
				typeof state.modelFile === 'string' &&
				state.modelFile.trim() === ''
			) {
				state.errors.modelFile = l10n?.pleaseSelectFile;
			} else if (typeof state.modelFile !== 'string') {
				// Zoo model: validate that the selected soc/board/core combination is supported
				if (state.soc && state.board && state.runModelOn.length > 0) {
					const zooModel =
						state.modelFile as unknown as ModelZooSelectionData;
					const socEntry = action.payload.find(
						s => s.name === state.soc
					);
					const unsupportedCores = state.runModelOn.filter(core => {
						const dataModelCoreID = socEntry?.cores.find(
							c => c.id === core
						)?.dataModelCoreID;

						if (!dataModelCoreID) return false;

						return !getZooModelPlatform({
							selectedZooModel: zooModel.model,
							soc: state.soc!,
							board: state.board!,
							core: dataModelCoreID
						});
					});

					if (unsupportedCores.length > 0) {
						state.errors.modelFile =
							l10n?.modelDoesNotSupportPlatform;
					}
				}
			}

			if (state.soc?.trim()) {
				const compatStatus =
					state.compatibilityStatus[state.soc ?? ''];

				if (
					!compatStatus ||
					compatStatus === 'error' ||
					Object.values(compatStatus).some(
						status => status === 'error'
					)
				) {
					state.errors.compatibility = l10n?.compatibilityCheckFailed;
				}

				// Only validate board and runModelOn if a SoC is selected
				if (!state.board?.trim()) {
					state.errors.board = l10n?.selectBoardRequired;
				}

				if (!state.runModelOn?.length) {
					state.errors.runModelOn = l10n?.selectedCoreRequired;
				}
			} else {
				state.errors.soc = l10n?.selectSocRequired;
			}

			// Check for invalid filename characters in workspace name
			const invalidCharsPattern = /[<>:"|?*/\\]/;

			if (
				state.workspaceName.trim() &&
				invalidCharsPattern.test(state.workspaceName)
			) {
				state.errors.workspaceName = l10n?.invalidFilenameCharacters;
			}
		}
	},
	extraReducers(builder) {
		builder.addCase(validateAndGenerateWorkspace.rejected, () => {
			// Errors are already set
		});
		builder.addCase(checkCompatibility.pending, state => {
			if (state.soc) {
				state.compatibilityStatus[state.soc] = 'testing';
			}
		});
		builder.addCase(checkCompatibility.fulfilled, (state, action) => {
			if (state.soc) {
				state.compatibilityStatus[state.soc] = action.payload;
			}
		});
		builder.addCase(checkCompatibility.rejected, state => {
			if (state.soc) {
				state.compatibilityStatus[state.soc] = 'error';
			}
		});
	}
});

export const {
	setModelFile,
	setSampleData,
	setWorkspaceName,
	validateWorkspace,
	setSoc,
	setBoard,
	toggleRunModelOnCore,
	clearRunModelOn
} = workspaceConfigSlice.actions;

export const workspaceConfigReducer = workspaceConfigSlice.reducer;
