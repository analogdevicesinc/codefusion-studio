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
	createListenerMiddleware,
	type ActionCreatorWithPayload
} from '@reduxjs/toolkit';
import {updatePersistedDfgConfig} from '../../utils/api';
import {
	addNewStream,
	type DFGStreamUI,
	removeStream,
	updateGasketOptions,
	updateStream
} from '../slices/gaskets/gasket.reducer';
import type {RootState} from '../store';
import {type DFGStream} from 'cfs-types';

export const persistedDfgActions: Array<
	ActionCreatorWithPayload<any>
> = [updateStream, addNewStream, removeStream, updateGasketOptions];

export function getDFGPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	return actionsArray.map(action => {
		const listenerMiddleware = createListenerMiddleware();

		listenerMiddleware.startListening({
			actionCreator: action,
			async effect(_, listenerApi) {
				const state = listenerApi.getState() as RootState;
				const streams = formatDfgStreamsForPersistence(
					state.gasketsReducer.Streams
				);
				const gaskets = state.gasketsReducer.GasketOptions;
				await updatePersistedDfgConfig(streams, gaskets);
			}
		});

		return listenerMiddleware.middleware;
	});
}

/**
 * Prepares all non-persistable data from the streams in the list.
 * @param streams
 * @returns A clean copy of Streams list
 */
function formatDfgStreamsForPersistence(
	streams: DFGStreamUI[]
): DFGStream[] {
	return structuredClone(streams).map((s: DFGStreamUI) => {
		const {Uuid, ...rest} = s;

		return rest;
	});
}
