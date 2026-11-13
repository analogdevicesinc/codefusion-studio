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
	createAsyncThunk,
	createSlice,
	isFulfilled,
	isPending,
	isRejected,
	type Draft,
	type PayloadAction
} from '@reduxjs/toolkit';
import {
	type CustomRemoteIndexing,
	addRemoteRequest,
	getCustomRemoteIndexingRequest,
	getRemotesRequest,
	removeRemoteRequest,
	setRemoteCredentialsRequest,
	setRemoteEnabledRequest
} from '@constants/messages/package-manager-messages';
import {messenger} from '../../../../../common/contexts/MessengerContext';
import {toRemoteCredentials} from '../../../utils/remotes';
import type {Remote, RemoteFormValues} from './remotes.types';

export type RemotesState = {
	remotes: Remote[];
	/**
	 * `idle` until the list is first requested and `loading` until it first
	 * arrives. Later refreshes keep the current list on screen, so they stay
	 * `ready` even when they fail.
	 */
	status: 'idle' | 'loading' | 'ready' | 'error';
	/** Why the list could not be loaded, while `status` is `error`. */
	error?: string;
	/** Latest list request. Responses to older ones are dropped. */
	listRequestId?: string;
	/**
	 * Remotes with a change in flight. Only these are locked: the package
	 * manager applies one change at a time, so other remotes can be changed
	 * meanwhile.
	 */
	busyRemotes: string[];
	/**
	 * Toggles in flight, by remote name. Their cards keep showing the new
	 * state until they settle, even when a list read before they were
	 * applied arrives in the meantime.
	 */
	pendingToggles: Record<string, boolean>;
	/** Whether a new remote is being added. */
	isAddingRemote: boolean;
	/** Custom remotes whose packages are being indexed. */
	indexingRemotes: string[];
};

const remotesInitialState: RemotesState = {
	remotes: [],
	status: 'idle',
	busyRemotes: [],
	pendingToggles: {},
	isAddingRemote: false,
	indexingRemotes: []
};

/** Shows the toggles still in flight on a newly received list. */
function applyPendingToggles(state: Draft<RemotesState>) {
	for (const remote of state.remotes) {
		const enabled = state.pendingToggles[remote.name];

		if (enabled !== undefined) {
			remote.disabled = !enabled;
		}
	}
}

/** Fetches the remote list, ordered for display by the extension. */
export const fetchRemotes = createAsyncThunk<Remote[]>(
	'remotes/fetchRemotes',
	async () =>
		messenger.sendRequest(getRemotesRequest, {type: 'extension'})
);

/** Reads which custom remotes are being indexed. */
export const fetchRemoteIndexing =
	createAsyncThunk<CustomRemoteIndexing>(
		'remotes/fetchRemoteIndexing',
		async () =>
			messenger.sendRequest(getCustomRemoteIndexingRequest, {
				type: 'extension'
			})
	);

/** Adds a custom remote, logging in to it when the form has credentials. */
export const addRemote = createAsyncThunk<
	Remote[] | undefined,
	RemoteFormValues
>('remotes/addRemote', async values =>
	messenger.sendRequest(
		addRemoteRequest,
		{type: 'extension'},
		{
			name: values.name,
			url: values.url,
			credentials: toRemoteCredentials(values)
		}
	)
);

/** Logs in to a custom remote with new credentials, or out of it. */
export const updateRemoteAuth = createAsyncThunk<
	Remote[] | undefined,
	RemoteFormValues
>('remotes/updateRemoteAuth', async values =>
	messenger.sendRequest(
		setRemoteCredentialsRequest,
		{type: 'extension'},
		{name: values.name, credentials: toRemoteCredentials(values)}
	)
);

/** Deletes a custom remote. */
export const removeRemote = createAsyncThunk<
	Remote[] | undefined,
	{name: string}
>('remotes/removeRemote', async params =>
	messenger.sendRequest(
		removeRemoteRequest,
		{type: 'extension'},
		params
	)
);

/**
 * Enables or disables a remote. The card shows the new state right away and
 * reverts if the change fails. Unless the response carries the updated list,
 * the list is then read again, which also drops any older read still in
 * flight.
 */
export const setRemoteEnabled = createAsyncThunk<
	Remote[] | undefined,
	{name: string; enabled: boolean}
>('remotes/setRemoteEnabled', async (params, {dispatch}) => {
	let remotes: Remote[] | undefined;

	try {
		remotes = await messenger.sendRequest(
			setRemoteEnabledRequest,
			{type: 'extension'},
			params
		);
	} catch (error) {
		// The package manager saves the new state before applying it, so a
		// failed change can still show up. Show what it reports.
		void dispatch(fetchRemotes());
		throw error;
	}

	// Applied, but the list couldn't be read back.
	if (!remotes) {
		void dispatch(fetchRemotes());
	}

	return remotes;
});

const remotesSlice = createSlice({
	name: 'remotes',
	initialState: remotesInitialState,
	reducers: {
		/** Remotes the extension sent along with a change it made. */
		remotesReceived(state, action: PayloadAction<Remote[]>) {
			if (state.status === 'idle') {
				return;
			}

			// Newer than any list request still in flight.
			state.listRequestId = undefined;
			state.remotes = action.payload;
			applyPendingToggles(state);
			state.status = 'ready';
			state.error = undefined;
		},
		/** The extension started or finished indexing custom remotes. */
		remoteIndexingChanged(
			state,
			action: PayloadAction<CustomRemoteIndexing>
		) {
			state.indexingRemotes = action.payload.remotes;
		}
	},
	extraReducers(builder) {
		builder
			.addCase(fetchRemoteIndexing.fulfilled, (state, action) => {
				state.indexingRemotes = action.payload.remotes;
			})
			.addCase(fetchRemotes.pending, (state, action) => {
				state.listRequestId = action.meta.requestId;

				if (state.status !== 'ready') {
					state.status = 'loading';
					state.error = undefined;
				}
			})
			.addCase(fetchRemotes.fulfilled, (state, action) => {
				if (action.meta.requestId !== state.listRequestId) {
					return;
				}

				state.listRequestId = undefined;
				state.remotes = action.payload;
				applyPendingToggles(state);
				state.status = 'ready';
			})
			.addCase(fetchRemotes.rejected, (state, action) => {
				if (action.meta.requestId !== state.listRequestId) {
					return;
				}

				state.listRequestId = undefined;

				if (state.status !== 'ready') {
					state.status = 'error';
					state.error = action.error.message;
				}
			})
			.addCase(setRemoteEnabled.pending, (state, action) => {
				const {name, enabled} = action.meta.arg;
				const remote = state.remotes.find(r => r.name === name);

				state.pendingToggles[name] = enabled;

				if (remote) {
					remote.disabled = !enabled;
				}
			})
			// Runs before the matchers below, so the list in the response is
			// taken as is for this remote.
			.addCase(setRemoteEnabled.fulfilled, (state, action) => {
				delete state.pendingToggles[action.meta.arg.name];
			})
			.addCase(setRemoteEnabled.rejected, (state, action) => {
				const {name, enabled} = action.meta.arg;
				const remote = state.remotes.find(r => r.name === name);

				delete state.pendingToggles[name];

				if (remote) {
					remote.disabled = enabled;
				}
			})
			.addCase(addRemote.pending, state => {
				state.isAddingRemote = true;
			})
			.addCase(addRemote.fulfilled, state => {
				state.isAddingRemote = false;
			})
			.addCase(addRemote.rejected, state => {
				state.isAddingRemote = false;
			})
			.addMatcher(
				isPending(
					addRemote,
					updateRemoteAuth,
					removeRemote,
					setRemoteEnabled
				),
				(state, action) => {
					state.busyRemotes.push(action.meta.arg.name);
				}
			)
			.addMatcher(
				isFulfilled(
					addRemote,
					updateRemoteAuth,
					removeRemote,
					setRemoteEnabled
				),
				(state, action) => {
					const remoteName = action.meta.arg.name;
					state.busyRemotes = state.busyRemotes.filter(
						name => name !== remoteName
					);

					// Applied, but the extension couldn't read the list back.
					// Keep the current one, including an optimistic toggle.
					if (!action.payload) {
						return;
					}

					// The response already reflects this change, so it supersedes
					// any list request still in flight, which may predate it.
					state.listRequestId = undefined;
					state.remotes = action.payload;
					applyPendingToggles(state);
					state.status = 'ready';
					state.error = undefined;
				}
			)
			.addMatcher(
				isRejected(
					addRemote,
					updateRemoteAuth,
					removeRemote,
					setRemoteEnabled
				),
				(state, action) => {
					const remoteName = action.meta.arg.name;
					state.busyRemotes = state.busyRemotes.filter(
						name => name !== remoteName
					);
				}
			);
	}
});

export const {remotesReceived, remoteIndexingChanged} =
	remotesSlice.actions;
export const remotesReducer = remotesSlice.reducer;
