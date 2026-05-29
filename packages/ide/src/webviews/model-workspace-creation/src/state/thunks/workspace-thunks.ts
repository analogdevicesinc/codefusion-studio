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
import {validateWorkspace} from '../slices/workspace-reducer';
import {messenger} from '@common/contexts/MessengerContext';
import {
	generateWorkspace,
	runCompatibilityCheck
} from "@constants/messages/model-to-workspace";


export const validateAndGenerateWorkspace = createAsyncThunk(
	'workspace/validateAndGenerate',
	async (_, {getState, dispatch}) => {
		dispatch(validateWorkspace());

		const state = getState() as RootState;
		const errors = state.workspaceConfigReducer.errors ?? {};

		if (Object.keys(errors).length > 0) {
			throw new Error('Validation failed');
		}

		messenger.sendNotification(generateWorkspace, {
			type: 'extension'
		});

		return {success: true};
	}
);



export const checkCompatibility = createAsyncThunk(
	"workspaceConfig/checkCompatibility",
	async (_, { getState, rejectWithValue }) => {
		const state = getState() as RootState;
		const {soc, board, modelFile, sampleData} =
			state.workspaceConfigReducer;

		// Check if all required values exist
		if (!soc || !board || !modelFile) {
			return undefined;
		}

		try {
			const result = await messenger.sendRequest(
				runCompatibilityCheck,
				{type: 'extension'},
				{soc, modelFile, sampleData, board}
			);

			return result;
		} catch (error) {
			return rejectWithValue(error);
		}
	}
);
