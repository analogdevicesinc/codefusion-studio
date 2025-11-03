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
	setUARTPort,
	toggleAIProfilingEnabled,
	toggleProfilingEnabled
} from '../slices/profiling/profiling.reducer';
import {updateProfilingConfig} from '../../utils/api';
import {RootState} from '../store';

export const persistedProfilingActions: Array<
	ActionCreatorWithPayload<any>
> = [toggleProfilingEnabled, toggleAIProfilingEnabled, setUARTPort];

export function getProfilingPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	return actionsArray.map(action => {
		const listenerMiddleware = createListenerMiddleware();

		listenerMiddleware.startListening({
			actionCreator: action,
			effect(action, listenerApi) {
				const projectId = (action.payload as {projectId: string})
					.projectId;
				updateProfilingConfig(
					(listenerApi.getState() as RootState).profilingReducer
						.zephelin[projectId],
					'Zephelin',
					projectId
				);
			}
		});

		return listenerMiddleware.middleware;
	});
}
