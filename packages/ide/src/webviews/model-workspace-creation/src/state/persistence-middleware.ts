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

import {
	type ActionCreatorWithPayload,
	createListenerMiddleware
} from '@reduxjs/toolkit';
import {
	setBoard,
	setModelFile,
	setSampleData,
	setSoc,
	setWorkspaceName,
	toggleRunModelOnCore
} from "./slices/workspace-reducer";
import {messenger} from '../../../common/contexts/MessengerContext';
import { updateWorkspaceConfig } from "@constants/messages/model-to-workspace";
import {type RootState} from './store';

export const persistedModelWorkspaceActions: Array<
	ActionCreatorWithPayload<any>
> = [
	setModelFile,
	setSampleData,
	setWorkspaceName,
	setSoc,
	setBoard,
	toggleRunModelOnCore
];

export function getModelWorkspacePersistenceListenerMiddleware() {
	return persistedModelWorkspaceActions.map(action => {
		const listenerMiddleware = createListenerMiddleware();

		listenerMiddleware.startListening({
			actionCreator: action,
			async effect(_, listenerApi) {

				const state = (listenerApi.getState() as RootState)
					.workspaceConfigReducer;


				messenger.sendNotification(
					updateWorkspaceConfig,
					{ type: "extension" },
					{
						modelFile: state.modelFile,
						sampleData: state.sampleData,
						workspaceName: state.workspaceName,
						soc: state.soc,
						board: state.board
					}
				);
			}
		});

		return listenerMiddleware.middleware;
	});
}
