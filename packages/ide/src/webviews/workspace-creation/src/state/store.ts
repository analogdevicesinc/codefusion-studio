/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import type {Action, ThunkAction} from '@reduxjs/toolkit';

import {appContextReducer} from './slices/app-context/appContext.reducer';

import {
	type TypedUseSelectorHook,
	useDispatch,
	useSelector
} from 'react-redux';
import {workspaceConfigReducer} from './slices/workspace-config/workspace-config.reducer';
import {getCurrentConfigOptions} from '../utils/workspace-config';
import {
	getPersistenceListenerMiddleware,
	persistedActions
} from '../utils/persistence-middleware';
import type {
	StateProject,
	StatePlatformConfig,
	WorkspaceConfigState,
	WorkspaceTemplateType
} from '../common/types/state';
import {workspaceConfigInitialState} from './constants/workspace-config';
import type {WorkspaceCore} from '../common/types/config';

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof rootReducer>;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	unknown,
	Action
>;

const persistedConfig = getCurrentConfigOptions();

const rootReducer = combineReducers({
	appContextReducer,
	workspaceConfigReducer
});

export const useAppSelector: TypedUseSelectorHook<RootState> =
	useSelector;

export const useAppDispatch = () => useDispatch<AppDispatch>();

// Apply persisted config to the initial state
const {
	Soc = '',
	Board = '',
	Package = '',
	Projects = [],
	WorkspaceName = '',
	Location = '',
	WorkspacePluginId = '',
	WorkspacePluginVersion = ''
} = persistedConfig;

const initialState = {
	...workspaceConfigInitialState,
	workspaceTemplate: {
		pluginId: WorkspacePluginId,
		pluginVersion: WorkspacePluginVersion
	},
	socId: Soc,
	boardPackage: {
		boardId: Board,
		packageId: Package
	},
	workspaceConfig: {
		name: WorkspaceName,
		path: Location,
		templateType: WorkspacePluginId
			? 'predefined'
			: ('custom' as WorkspaceTemplateType)
	},
	cores: (Projects as WorkspaceCore[]).reduce<
		Record<string, StateProject>
	>(
		(
			acc: Record<string, WorkspaceConfigState['cores'][string]>,
			core
		) => {
			acc[core.Id] = {
				id: core.Id,
				coreId: core.CoreId,
				name: core.Name,
				isPrimary: core.IsPrimary,
				isEnabled: core.IsEnabled,
				pluginId: core.PluginId,
				pluginVersion: core.PluginVersion,
				firmwarePlatform: core.FirmwarePlatform,
				platformConfig: core.PlatformConfig as StatePlatformConfig
			};

			return acc;
		},
		{}
	),
	coreToConfigId: undefined
};

export const store = configureStore({
	reducer: rootReducer,
	middleware: getDefaultMiddleware =>
		getDefaultMiddleware().prepend(
			...getPersistenceListenerMiddleware(persistedActions)
		),
	preloadedState: {
		workspaceConfigReducer: initialState
	}
});
