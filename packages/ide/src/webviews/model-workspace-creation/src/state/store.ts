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

import {combineReducers, configureStore} from '@reduxjs/toolkit';
import type {
	Action,
	ThunkAction,
	ThunkDispatch,
	UnknownAction
} from '@reduxjs/toolkit';

import {
	type TypedUseSelectorHook,
	useDispatch,
	useSelector
} from 'react-redux';
import {workspaceConfigReducer} from './slices/workspace-reducer';
import {getModelWorkspacePersistenceListenerMiddleware} from './persistence-middleware';
import {messenger} from '../../../common/contexts/MessengerContext';
import { getWorkspaceConfig } from "@constants/messages/model-to-workspace";
import { checkCompatibility } from "./thunks/workspace-thunks";

type ResolvedType<T> = T extends Promise<infer R> ? R : T;
export type Store = ResolvedType<
	ReturnType<typeof getPreloadedStateStore>
>;

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = ThunkDispatch<
	RootState,
	void,
	UnknownAction
>;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	unknown,
	Action
>;

const rootReducer = combineReducers({
	workspaceConfigReducer
});

export const useAppSelector: TypedUseSelectorHook<RootState> =
	useSelector;

export const useAppDispatch = () => useDispatch<AppDispatch>();

export async function getPreloadedStateStore() {
	const workspaceConfig = await messenger.sendRequest(
		getWorkspaceConfig,
		{type: 'extension'}
	);

	const store = configureStore({
		reducer: rootReducer,
		middleware: (getDefaultMiddleware) =>
			getDefaultMiddleware().prepend(
				...getModelWorkspacePersistenceListenerMiddleware()
			),
		preloadedState: {
			workspaceConfigReducer: {
				modelFile: workspaceConfig.modelFile ?? "",
				sampleData: workspaceConfig.sampleData ?? "",
				workspaceName: workspaceConfig.workspaceName ?? "",
				soc: workspaceConfig.soc,
				board: workspaceConfig.board,
				runModelOn: [],
				compatibilityStatus: {}
			}
		}
	});
		void (store.dispatch as AppDispatch)(checkCompatibility());

		return store;
}
