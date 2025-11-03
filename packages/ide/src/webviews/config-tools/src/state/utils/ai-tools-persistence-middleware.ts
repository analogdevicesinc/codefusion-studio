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

import {
	type ActionCreatorWithPayload,
	createListenerMiddleware
} from '@reduxjs/toolkit';
import {
	deleteModel,
	saveEditingModel,
	toggleModelActive
} from '../slices/ai-tools/aiModel.reducer';
import {updatePersistedConfig} from '../../utils/api';
import {type RootState} from '../store';

export const persistedAIToolsActions: Array<
	ActionCreatorWithPayload<any>
> = [saveEditingModel, toggleModelActive, deleteModel];

export function getAiToolsPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	return actionsArray.map(action => {
		const listenerMiddleware = createListenerMiddleware();

		listenerMiddleware.startListening({
			actionCreator: action,
			effect(_, listenerApi) {
				const state = listenerApi.getState() as RootState;
				// Strip the 'id' field from models before persisting
				const modelsWithoutId = state.aiModelReducer.aiModels.map(
					({id, ...model}) => model
				);
				updatePersistedConfig({
					aiModels: modelsWithoutId
				})?.catch(e => {
					console.error(
						'There was an error in the persistence process: ',
						e
					);
				});
			}
		});

		return listenerMiddleware.middleware;
	});
}
