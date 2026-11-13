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
	customRemoteIndexingType,
	isLoggedInStatusType,
	packageManagerRemotesUpdatedType
} from '@constants/messages/package-manager-messages';
import {
	fetchPackageList,
	fetchSocList,
	setIsLoggedIn,
	packagesReducer
} from './slices/packages/packages.reducer';
import {
	fetchRemotes,
	remotesReceived,
	remoteIndexingChanged,
	remotesReducer
} from './slices/remotes/remotes.reducer';

const combinedReducer = combineReducers({
	packagesReducer,
	remotesReducer
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
 * state. Remote changes still in flight survive, so their remotes stay
 * locked, and so does the extension's indexing state. Every other action is
 * delegated unchanged.
 */
const rootReducer = (
	state: RootState | undefined,
	action: Action
): RootState => {
	if (resetStore.match(action)) {
		const cleared = combinedReducer(undefined, action);
		if (!state) {
			return cleared;
		}
		const {
			busyRemotes,
			pendingToggles,
			isAddingRemote,
			indexingRemotes
		} = state.remotesReducer;

		return {
			...cleared,
			remotesReducer: {
				...cleared.remotesReducer,
				busyRemotes,
				pendingToggles,
				isAddingRemote,
				indexingRemotes
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

/**
 * Reset to a fresh-load baseline whenever the auth identity actually changes
 * (login, logout, or account switch). The host has already rebuilt the package
 * catalog for the new session before sending this, so the refetch sees the
 * right packages.
 */
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
			void store.dispatch(fetchPackageList());
			void store.dispatch(fetchSocList());
		}
	);
}

/**
 * Enabling or disabling a remote changes which packages are listed, so the
 * list is reloaded. Filters and page are kept; selections that are no longer
 * listed are dropped when the list arrives.
 */
function subscribeToRemotesChanges() {
	messenger.onNotification(
		packageManagerRemotesUpdatedType,
		update => {
			void store.dispatch(fetchPackageList());

			// A change made from this webview sends the updated remotes along
			if (update?.remotes) {
				store.dispatch(remotesReceived(update.remotes));
			} else if (store.getState().remotesReducer.status !== 'idle') {
				void store.dispatch(fetchRemotes());
			}
		}
	);
	messenger.onNotification(customRemoteIndexingType, indexing => {
		store.dispatch(remoteIndexingChanged(indexing));
	});
}

subscribeToAuthChanges();
subscribeToRemotesChanges();
