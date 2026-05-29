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
import {createSlice, type PayloadAction} from '@reduxjs/toolkit';
import {
	checkCompatibility,
	validateAndGenerateWorkspace
} from "../thunks/workspace-thunks";
import { getLocalization } from "../../../../common/utils/localization";

// Core -> compatible status
type CompatibilityStatus =
	| Record<string, boolean | 'error'>
	| 'testing'
	| 'error'
	| undefined;

type WorkspaceConfigState = {
	modelFile: string;
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
	};
	compatibilityStatus: Record<string, CompatibilityStatus>;
};

export const workspaceConfigInitialState: WorkspaceConfigState = {
	modelFile: "",
	sampleData: "",
	workspaceName: "",
	runModelOn: [],
	compatibilityStatus: {}
};

const workspaceConfigSlice = createSlice({
	name: 'workspaceConfig',
	initialState: workspaceConfigInitialState,
	reducers: {
		setModelFile(state, action: PayloadAction<string>) {
			state.modelFile = action.payload;
			delete state.errors?.modelFile;
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
			}
		},
		setBoard(state, action: PayloadAction<string>) {
			state.board = action.payload;
		},
		toggleRunModelOnCore(state, action: PayloadAction<string>) {
			const index = state.runModelOn.indexOf(action.payload);

			if (index === -1) {
				state.runModelOn.push(action.payload);
			} else {
				state.runModelOn.splice(index, 1);
			}
		},
		clearRunModelOn(state) {
			state.runModelOn = [];
		},
		validateWorkspace(state) {
			state.errors = {};

			const l10n = getLocalization('model-wrksp')?.validationErrors;

			if (state.modelFile.trim() === '') {
				state.errors.modelFile = l10n?.pleaseSelectFile;
			}

			if (!state.soc?.trim()) {
				state.errors.soc = l10n?.selectSocRequired;
			}

			if (!state.board?.trim()) {
				state.errors.board = l10n?.selectBoardRequired;
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
		builder.addCase(checkCompatibility.pending, (state) => {
			if (state.soc) {
				state.compatibilityStatus[state.soc] = "testing";
			}
		});
		builder.addCase(checkCompatibility.fulfilled, (state, action) => {
			if (state.soc) {
				state.compatibilityStatus[state.soc] = action.payload;
			}
		});
		builder.addCase(checkCompatibility.rejected, (state) => {
			if (state.soc) {
				state.compatibilityStatus[state.soc] = "error";
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
