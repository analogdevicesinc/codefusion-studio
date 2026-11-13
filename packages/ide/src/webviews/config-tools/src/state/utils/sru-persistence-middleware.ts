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
	createListenerMiddleware,
	isAnyOf,
	type ActionCreatorWithPayload
} from '@reduxjs/toolkit';
import {updateSruConfig} from '../../utils/api';
import {
	setSruConnection,
	resetSruConnection,
	restoreSruConnection,
	setUserDescription,
	setSignalAlias,
	setSignalInversion
} from '../slices/sru/sru.reducer';
import type {RootState} from '../store';
import {reportPersistedActionTelemetry} from './telemetry-reporter';

export const persistedSruActions: Array<
	ActionCreatorWithPayload<any>
> = [
	setSruConnection,
	resetSruConnection,
	restoreSruConnection,
	setUserDescription,
	setSignalAlias,
	setSignalInversion
];

const DEBOUNCE_MS = 50;

export function getSruPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	const listenerMiddleware = createListenerMiddleware();

	listenerMiddleware.startListening({
		matcher: isAnyOf(...actionsArray),
		async effect(action, listenerApi) {
			listenerApi.cancelActiveListeners();

			reportPersistedActionTelemetry(
				action as {type: string; payload: unknown},
				listenerApi.getOriginalState() as RootState
			);

			await listenerApi.delay(DEBOUNCE_MS);

			const state = listenerApi.getState() as RootState;

			updateSruConfig({
				connections: state.sruReducer.modifiedConnections,
				descriptions: state.sruReducer.userDescriptions,
				signalAliases: state.sruReducer.signalAliases,
				signalInversions: state.sruReducer.signalInversions
			})?.catch(e => {
				console.error(
					'There was an error in the SRU persistence process: ',
					e
				);
			});
		}
	});

	return [listenerMiddleware.middleware];
}
