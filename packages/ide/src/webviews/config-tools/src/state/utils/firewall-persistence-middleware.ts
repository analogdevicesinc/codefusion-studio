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
	createListenerMiddleware,
	isAnyOf
} from '@reduxjs/toolkit';
import {
	setFirewallStatus,
	setFirewallBinaryFilePath,
	addFirewallZone,
	removeFirewallZone,
	updateFirewallZone,
	removeFirewallEntry,
	updateResponderConfig
} from '../slices/firewall/firewall.reducer';
import {updateFirewallConfig} from '../../utils/api';
import {type RootState} from '../store';
import {formatFirewallPersistencePayload} from '../../utils/firewall-persistence';
import {reportPersistedActionTelemetry} from './telemetry-reporter';

export const persistedFirewallActions: Array<
	ActionCreatorWithPayload<any>
> = [
	setFirewallStatus,
	setFirewallBinaryFilePath,
	addFirewallZone,
	removeFirewallZone,
	updateFirewallZone,
	removeFirewallEntry,
	updateResponderConfig
];

const DEBOUNCE_MS = 50;

export function getFirewallPersistenceListenerMiddleware(
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

			const firewall = formatFirewallPersistencePayload(
				state.firewallReducer
			);

			updateFirewallConfig({firewall})?.catch(e => {
				console.error(
					'There was an error in the Firewall persistence process: ',
					e
				);
			});
		}
	});

	return [listenerMiddleware.middleware];
}
