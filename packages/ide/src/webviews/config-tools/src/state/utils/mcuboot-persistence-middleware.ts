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
	setMcubootEnableState,
	addSigningKey,
	removeSigningKey
} from '../slices/app-context/appContext.reducer';
import {
	addApplicationPackage,
	removeApplicationPackage,
	updateApplicationPackage,
	clearSignKeyReferences
} from '../slices/application-packages/applicationPackages.reducer';
import {updateMcubootConfig} from '../../utils/api';
import {type RootState} from '../store';
import {
	formatSettingsPersistencePayload,
	formatApplicationPackagesPersistencePayload
} from '../../utils/mcuboot-persistence';

export const persistedMcubootActions: Array<
	ActionCreatorWithPayload<any>
> = [
	setMcubootEnableState,
	addSigningKey,
	removeSigningKey,
	addApplicationPackage,
	removeApplicationPackage,
	updateApplicationPackage,
	clearSignKeyReferences
];

const DEBOUNCE_MS = 50;

export function getMcubootPersistenceListenerMiddleware(
	actionsArray: Array<ActionCreatorWithPayload<unknown>>
) {
	const listenerMiddleware = createListenerMiddleware();

	listenerMiddleware.startListening({
		matcher: isAnyOf(...actionsArray),
		async effect(_, listenerApi) {
			listenerApi.cancelActiveListeners();

			await listenerApi.delay(DEBOUNCE_MS);

			const state = listenerApi.getState() as RootState;

			const settings = formatSettingsPersistencePayload(
				state.appContextReducer.mcubootEnableState,
				state.appContextReducer.signingKeys
			);

			const applicationPackages =
				formatApplicationPackagesPersistencePayload(
					state.applicationPackagesReducer.applicationPackages
				);

			updateMcubootConfig({
				settings,
				applicationPackages
			})?.catch(e => {
				console.error(
					'There was an error in the MCUBoot persistence process: ',
					e
				);
			});
		}
	});

	return [listenerMiddleware.middleware];
}
