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
	combineReducers,
	configureStore,
	createAction
} from '@reduxjs/toolkit';
import type {Action, ThunkAction} from '@reduxjs/toolkit';
import {
	type TypedUseSelectorHook,
	useDispatch,
	useSelector
} from 'react-redux';
import type {Messenger} from 'vscode-messenger-webview';
import {messenger} from '@common/contexts/MessengerContext';
import {
	isLoggedInStatusType,
	packageManagerRemotesUpdatedType
} from '@constants/messages/package-manager-messages';
import {
	fetchPackageList,
	fetchSocList,
	setIsLoggedIn,
	packagesReducer
} from './slices/packages/packages.reducer';

const combinedReducer = combineReducers({
	packagesReducer
});

export type RootState = ReturnType<typeof combinedReducer>;

/**
 * Root-level reset action. Dispatching it makes {@link rootReducer} drop the
 * entire store so every slice falls back to its initial state, reproducing a
 * fresh page load.
 */
export const resetStore = createAction('store/reset');

/**
 * Wraps the combined reducer so that {@link resetStore} clears all slice state:
 * passing `undefined` state makes each slice reducer return its own initial
 * state. The `detailsEpoch` generation is carried forward incremented rather
 * than reset, so detail fetches in flight for the previous identity are dropped
 * instead of repopulating the cleared cache. Every other action is delegated
 * unchanged.
 */
const rootReducer = (
	state: RootState | undefined,
	action: Action
): RootState => {
	if (resetStore.match(action)) {
		const cleared = combinedReducer(undefined, action);
		const previousEpoch: number =
			state?.packagesReducer.detailsEpoch ?? 0;

		return {
			...cleared,
			packagesReducer: {
				...cleared.packagesReducer,
				detailsEpoch: previousEpoch + 1
			}
		};
	}

	return combinedReducer(state, action);
};

export const store = configureStore({
	reducer: rootReducer,
	middleware: getDefaultMiddleware =>
		getDefaultMiddleware({
			thunk: {
				extraArgument: messenger
			}
		})
});

export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
	ReturnType,
	RootState,
	Messenger,
	Action
>;

export const useAppSelector: TypedUseSelectorHook<RootState> =
	useSelector;
export const useAppDispatch = () => useDispatch<AppDispatch>();

// Reset to a fresh-load baseline whenever the auth identity actually changes (login, logout, or account switch).
function subscribeToAuthChanges() {
	// Last reconciled identity, seeded from initial state so the first notification counts as a change.
	let lastAuthKey = store.getState().packagesReducer.isLoggedIn
		? 'logged-in'
		: 'logged-out';

	messenger.onNotification(
		isLoggedInStatusType,
		({loggedIn, authSignature}) => {
			const authKey =
				authSignature ?? (loggedIn ? 'logged-in' : 'logged-out');

			if (authKey !== lastAuthKey) {
				store.dispatch(resetStore());
			}

			lastAuthKey = authKey;
			store.dispatch(setIsLoggedIn(loggedIn));
			void store.dispatch(fetchPackageList({}));
			void store.dispatch(fetchSocList());
		}
	);
}

// Remotes changes invalidate cached package details and visibility, so reset
// store state to drop stale cache, restore login status, then reload the list.
function subscribeToRemotesChanges() {
	messenger.onNotification(
		packageManagerRemotesUpdatedType,
		(_params: void) => {
			const {isLoggedIn} = store.getState().packagesReducer;
			store.dispatch(resetStore());
			store.dispatch(setIsLoggedIn(isLoggedIn));
			void store.dispatch(fetchPackageList({}));
		}
	);
}

subscribeToAuthChanges();
subscribeToRemotesChanges();
