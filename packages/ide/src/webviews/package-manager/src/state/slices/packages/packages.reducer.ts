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
	current,
	type PayloadAction
} from '@reduxjs/toolkit';
import type {
	CfsCachedPackage,
	CfsPackage,
	CfsPackageInstallOptions,
	CfsPackageReference
} from 'cfs-package-manager';
import type {
	GetPackageListParams,
	GetPackageListResponse,
	GetPackageDetailsResponse,
	GetSocListResponse,
	MissingRequiredPackage,
	PackageListEntry,
	SocFilterOption
} from '@constants/messages/package-manager-messages';
import {
	getLoggedInStatusRequest,
	getPackageListRequest,
	getPackageDetailsRequest,
	getPackageCacheStateRequest,
	getSocListRequest,
	uninstallPackagesRequest,
	installPackagesRequest
} from '@constants/messages/package-manager-messages';
import {messenger} from '../../../../../common/contexts/MessengerContext';
import {getDefaultVersion} from '../../../utils';

const DEFAULT_PAGE_SIZE = 10;

/** Key used for the per-reference details cache. */
export const buildPackageReference = (
	name: string,
	version: string
): string => `${name}/${version}`;

/**
 * Optimistically marks the named packages as uninstalled: clears their
 * installed version and drops it from the cached versions.
 */
function clearInstalled(
	entries: PackageListEntry[],
	names: Set<string>
): void {
	for (const entry of entries) {
		if (
			names.has(entry.name) &&
			entry.installedVersion !== undefined
		) {
			entry.cachedVersions = entry.cachedVersions.filter(
				version => version !== entry.installedVersion
			);
			entry.installedVersion = undefined;
			entry.state = 'not-installed';
		}
	}
}

/** Restores previously snapshotted entries (by name) after a failed uninstall. */
function restoreEntries(
	entries: PackageListEntry[],
	snapshots: PackageListEntry[] | undefined
): void {
	if (!snapshots) return;

	for (const saved of snapshots) {
		const index = entries.findIndex(
			entry => entry.name === saved.name
		);

		if (index !== -1) {
			entries[index] = saved;
		}
	}
}

/**
 * Marks an entry as failed to install, restoring the version recorded before
 * the install started (if any) instead of always clearing it. Without this,
 * failing to update an already-installed package would wipe out the record
 * of the still-installed prior version.
 */
function markInstallFailed(
	entry: PackageListEntry,
	snapshot: PackageListEntry | undefined
): void {
	entry.state = 'installation-failed';
	entry.installedVersion = snapshot?.installedVersion;
}

/**
 * Replaces an entry's cache-derived fields with what conan actually reports
 */
function applyCacheState(
	entry: PackageListEntry,
	cached: CfsCachedPackage[]
): void {
	entry.cachedVersions = cached.map(pkg => pkg.reference.version);
	entry.installedVersion =
		cached.find(pkg => pkg.isInstalled)?.reference.version ??
		entry.builtInVersion;

	// A failed install keeps its state so the failure stays on screen.
	if (entry.state !== 'installation-failed') {
		entry.state =
			entry.installedVersion === undefined
				? 'not-installed'
				: 'installed';
	}
}

/**
 * Marks an entry as installed at the resolved version, recording that version
 * in the local cache. Used both for explicitly requested packages and for
 * dependencies the backend auto-installed alongside them.
 */
function markInstalled(
	entry: PackageListEntry,
	version: string
): void {
	entry.state = 'installed';
	entry.installedVersion = version;

	if (!entry.cachedVersions.includes(version)) {
		entry.cachedVersions = [...entry.cachedVersions, version];
	}
}

/**
 * Lifecycle of the bulk install kicked off from the license page. The backend
 * installs every package together, so this is a single status for the whole
 * batch rather than per-package. Drives the install-progress page.
 */
export type InstallStatus = 'idle' | 'installing' | 'done' | 'error';

type PackagesState = {
	/** Full ordered package list (required-first, alphabetical). */
	packageList: PackageListEntry[];
	/** Required packages absent from the catalog search (no access). */
	missingRequiredPackages: MissingRequiredPackage[];
	/** Detailed metadata cache, keyed by `name/version` -> CfsPackage. */
	details: Record<string, CfsPackage>;
	/** Current page (1-based). */
	page: number;
	/** Items per page. */
	pageSize: number;

	selectedPackages: CfsPackageReference[];
	selectedVersions: Record<string, string>;
	searchQuery: string;
	statusFilter: string[];
	socFilter: string[];
	typeFilter: string[];
	/** When true, only packages required by a workspace manifest are shown. */
	requiredOnly: boolean;

	/** SoC filter dropdown options, from the auth-gated catalog. */
	socOptions: SocFilterOption[];

	noSelectionError: boolean;
	isLoggedIn: boolean;
	packageListLoading: boolean;
	detailsLoading: boolean;
	/** Package list-level error. A details fetch failure must NOT set this. */
	error?: string;
	/** Error from the most recent page-details fetch */
	detailsError?: string;
	/**
	 * Tracks the most recently dispatched package-list / SoC-list fetch by
	 * requestId. A response whose requestId no longer matches the latest is
	 * dropped, so a slow earlier request can't overwrite a newer one (e.g. a
	 * login-triggered refetch racing the initial mount fetch).
	 */
	packageListRequestId?: string;
	socListRequestId?: string;
	/**
	 * Latest cache-refresh requestId per package name
	 */
	cacheRefreshRequestIds: Record<string, string>;
	/**
	 * Identity generation, bumped on reset so that detail fetches from a prior
	 * identity are dropped.
	 */
	detailsEpoch: number;
	/**
	 * Snapshots of package-list entries optimistically modified by an in-flight
	 * uninstall, keyed by thunk requestId, so a failed uninstall can be rolled
	 * back without disturbing other concurrent uninstalls.
	 */
	uninstallRollbacks: Record<string, PackageListEntry[] | undefined>;
	/**
	 * Snapshots of package-list entries optimistically modified by an in-flight
	 * install, keyed by package name, so a failed install can restore the
	 * previously installed version instead of erasing it.
	 */
	installRollbacks: Record<string, PackageListEntry | undefined>;
	/**
	 * References (`name/version`) the current install skipped because they were
	 * already installed at exactly that version, as reported by the backend's
	 * pre-install plan. They are absent from the install result — which reports
	 * only what it actually installed, so without this they are
	 * indistinguishable from failures.
	 */
	alreadyInstalled: string[];
	/** Status of the bulk install kicked off from the license page. */
	installStatus: InstallStatus;
	/**
	 * The exact set of packages (selected + dependencies) passed to the current
	 * install. Recorded when the install starts so the install-progress page can
	 * list what is being installed without recomputing the set.
	 */
	installTargets: CfsPackageReference[];
};

const packagesInitialState: PackagesState = {
	packageList: [],
	missingRequiredPackages: [],
	details: {},
	page: 1,
	pageSize: DEFAULT_PAGE_SIZE,

	selectedPackages: [],
	selectedVersions: {},
	searchQuery: '',
	statusFilter: [],
	socFilter: [],
	typeFilter: [],
	requiredOnly: false,

	socOptions: [],

	noSelectionError: false,
	isLoggedIn: true,
	packageListLoading: true,
	detailsLoading: false,
	error: undefined,
	detailsError: undefined,
	packageListRequestId: undefined,
	socListRequestId: undefined,
	cacheRefreshRequestIds: {},
	detailsEpoch: 0,
	uninstallRollbacks: {},
	installRollbacks: {},
	alreadyInstalled: [],
	installStatus: 'idle',
	installTargets: []
};

/**
 * Fetches the lightweight, ordered package list. Cheap — the list has no
 * per-package metadata; detailed metadata is fetched per page via
 * {@link fetchPageDetails}.
 */
export const fetchPackageList = createAsyncThunk<
	GetPackageListResponse,
	GetPackageListParams
>('packages/fetchPackageList', async params =>
	messenger.sendRequest(
		getPackageListRequest,
		{type: 'extension'},
		params
	)
);

/** Fetches detailed metadata for a set of references (one page). */
export const fetchPageDetails = createAsyncThunk<
	{response: GetPackageDetailsResponse; epoch: number},
	CfsPackageReference[],
	{rejectValue: {epoch: number; message?: string}}
>(
	'packages/fetchPageDetails',
	async (references, {getState, rejectWithValue}) => {
		/**
		 * Inject the current epoch into the fulfilled action so the reducer can drop
		 * stale responses, as well as rejected actions.
		 */
		const {detailsEpoch} = (
			getState() as {packagesReducer: PackagesState}
		).packagesReducer;

		try {
			const response = await messenger.sendRequest(
				getPackageDetailsRequest,
				{type: 'extension'},
				{references}
			);

			return {response, epoch: detailsEpoch};
		} catch (error) {
			return rejectWithValue({
				epoch: detailsEpoch,
				message:
					error instanceof Error ? error.message : String(error)
			});
		}
	}
);

export const fetchLoggedInStatus = createAsyncThunk<{
	loggedIn: boolean;
}>('packages/fetchLoggedInStatus', async () =>
	messenger.sendRequest(getLoggedInStatusRequest, {
		type: 'extension'
	})
);

/**
 * Fetches the SoC filter options from the catalog.
 */
export const fetchSocList = createAsyncThunk<GetSocListResponse>(
	'packages/fetchSocList',
	async () =>
		messenger.sendRequest(getSocListRequest, {type: 'extension'})
);

/**
 * Re-reads the local conan cache for the named packages. Dispatched after a
 * package installs or uninstalls
 */
export const refreshPackageCacheState = createAsyncThunk<
	{cached: CfsCachedPackage[]},
	string[]
>('packages/refreshPackageCacheState', async names =>
	messenger.sendRequest(
		getPackageCacheStateRequest,
		{type: 'extension'},
		{names: [...new Set(names)]}
	)
);

export const installPackages = createAsyncThunk<
	{
		successful: boolean;
		installed: CfsPackageReference[];
		alreadyInstalled: CfsPackageReference[];
	},
	{packages: CfsPackageReference[]; options: CfsPackageInstallOptions}
>('packages/installPackages', async (params, {dispatch}) => {
	const response = await messenger.sendRequest(
		installPackagesRequest,
		{type: 'extension'},
		params
	);

	void dispatch(
		refreshPackageCacheState([
			...params.packages.map(pkg => pkg.name),
			...response.installed.map(ref => ref.name)
		])
	);

	return response;
});

/**
 * Uninstalls one or more packages. The backend resolves and removes dependents
 * too, returning the full set of names actually uninstalled.
 */
export const uninstallPackages = createAsyncThunk<
	{successful: boolean; uninstalledNames: string[]},
	{names: string[]}
>('packages/uninstallPackages', async (params, {dispatch}) => {
	const response = await messenger.sendRequest(
		uninstallPackagesRequest,
		{type: 'extension'},
		params
	);

	// Refresh the requested names plus any dependents the backend removed.
	void dispatch(
		refreshPackageCacheState([
			...params.names,
			...response.uninstalledNames
		])
	);

	return response;
});

const packagesSlice = createSlice({
	name: 'packages',
	initialState: packagesInitialState,
	reducers: {
		togglePackageSelected(
			state,
			action: PayloadAction<CfsPackageReference>
		) {
			const pkg = action.payload;
			const index = state.selectedPackages.findIndex(
				selected =>
					selected.name === pkg.name &&
					selected.version === pkg.version
			);

			if (index === -1) {
				state.selectedPackages.push(pkg);
			} else {
				state.selectedPackages.splice(index, 1);
			}
		},
		setPackageSelected(
			state,
			action: PayloadAction<{
				pkg: CfsPackageReference;
				selected: boolean;
			}>
		) {
			const {pkg, selected} = action.payload;
			const others = state.selectedPackages.filter(
				item => item.name !== pkg.name
			);
			state.selectedPackages = selected ? [...others, pkg] : others;

			if (state.selectedPackages.length > 0) {
				state.noSelectionError = false;
			}
		},
		toggleSelectAllPackages(
			state,
			action: PayloadAction<PackageListEntry[]>
		) {
			const entries = action.payload;
			const isEntrySelected = (entry: PackageListEntry) =>
				entry.versions.some(version =>
					state.selectedPackages.some(
						s => s.name === entry.name && s.version === version
					)
				);

			if (entries.length > 0 && entries.every(isEntrySelected)) {
				const pageNames = new Set(entries.map(e => e.name));
				state.selectedPackages = state.selectedPackages.filter(
					s => !pageNames.has(s.name)
				);

				return;
			}

			entries.forEach(entry => {
				if (!isEntrySelected(entry)) {
					state.selectedPackages.push({
						name: entry.name,
						version:
							state.selectedVersions[entry.name] ??
							getDefaultVersion(entry)
					});
				}
			});

			if (state.selectedPackages.length > 0) {
				state.noSelectionError = false;
			}
		},
		setNoSelectionError(state, action: PayloadAction<boolean>) {
			state.noSelectionError = action.payload;
		},
		changeSelectedVersion(
			state,
			action: PayloadAction<{
				name: string;
				newVersion: string;
			}>
		) {
			const {name, newVersion} = action.payload;
			// Remember the pick regardless of selection so select-all honors it.
			state.selectedVersions[name] = newVersion;
			const tracked = state.selectedPackages.find(
				item => item.name === name
			);

			if (tracked) {
				tracked.version = newVersion;
			}
		},
		setSearchQuery(state, action: PayloadAction<string>) {
			state.searchQuery = action.payload;
			state.page = 1;
		},
		setStatusFilter(state, action: PayloadAction<string[]>) {
			state.statusFilter = action.payload;
			state.page = 1;
		},
		setSocFilter(state, action: PayloadAction<string[]>) {
			state.socFilter = action.payload;
			state.page = 1;
		},
		setTypeFilter(state, action: PayloadAction<string[]>) {
			state.typeFilter = action.payload;
			state.page = 1;
		},
		clearFilters(state) {
			state.searchQuery = '';
			state.statusFilter = [];
			state.socFilter = [];
			state.typeFilter = [];
			state.requiredOnly = false;
			state.page = 1;
		},
		toggleRequiredOnly(state) {
			state.requiredOnly = !state.requiredOnly;
			state.page = 1;
		},
		setPage(state, action: PayloadAction<number>) {
			state.page = action.payload;
		},
		setPageSize(state, action: PayloadAction<number>) {
			state.pageSize = action.payload;
			state.page = 1;
		},
		setIsLoggedIn(state, action: PayloadAction<boolean>) {
			state.isLoggedIn = action.payload;
		}
	},
	extraReducers(builder) {
		builder
			// Package list fetching handling
			.addCase(fetchPackageList.pending, (state, action) => {
				state.packageListRequestId = action.meta.requestId;
				state.packageListLoading = true;
				state.error = undefined;
				state.packageList = [];
				state.missingRequiredPackages = [];
			})
			.addCase(fetchPackageList.fulfilled, (state, action) => {
				// Drop a stale response superseded by a newer fetch.
				if (action.meta.requestId !== state.packageListRequestId) {
					return;
				}

				state.packageListLoading = false;
				state.packageList = action.payload.packageList;
				state.missingRequiredPackages =
					action.payload.missingRequiredPackages;
			})
			.addCase(fetchPackageList.rejected, (state, action) => {
				if (action.meta.requestId !== state.packageListRequestId) {
					return;
				}

				state.packageListLoading = false;
				state.error = action.error.message;
			})
			// Page details fetching handling
			.addCase(fetchPageDetails.pending, state => {
				state.detailsLoading = true;
				state.detailsError = undefined;
			})
			.addCase(fetchPageDetails.fulfilled, (state, action) => {
				state.detailsLoading = false;

				/**
				 * Drop a response if the epoch doesn't match the current one.
				 * (i.e Auth changed)
				 */
				if (action.payload.epoch !== state.detailsEpoch) {
					return;
				}

				const requested = action.meta.arg;
				action.payload.response.packages.forEach((pkg, index) => {
					const ref = requested[index];

					if (ref) {
						state.details[
							buildPackageReference(ref.name, ref.version)
						] = pkg;
					}
				});
			})
			.addCase(fetchPageDetails.rejected, (state, action) => {
				state.detailsLoading = false;

				// Drop a rejection when the epoch doesn't match the current one.
				if (
					action.payload &&
					action.payload.epoch !== state.detailsEpoch
				) {
					return;
				}

				state.detailsError =
					action.payload?.message ?? action.error.message;
			})
			// Logged-in status fetching handling
			.addCase(fetchLoggedInStatus.fulfilled, (state, action) => {
				state.isLoggedIn = action.payload.loggedIn;
			})
			.addCase(fetchLoggedInStatus.rejected, state => {
				state.isLoggedIn = false;
			})
			.addCase(fetchSocList.pending, (state, action) => {
				state.socListRequestId = action.meta.requestId;
			})
			.addCase(fetchSocList.fulfilled, (state, action) => {
				if (action.meta.requestId !== state.socListRequestId) {
					return;
				}

				state.socOptions = action.payload.socs;
			})
			// Install handling
			.addCase(installPackages.pending, (state, action) => {
				state.installStatus = 'installing';
				const {packages} = action.meta.arg;
				state.installTargets = packages;
				state.alreadyInstalled = [];
				const packageNames = new Set(packages.map(pkg => pkg.name));

				// Set PackageListEntry.state to 'installing' for each package being installed
				state.packageList.forEach(entry => {
					if (packageNames.has(entry.name)) {
						state.installRollbacks[entry.name] = current(entry);
						entry.state = 'installing';

						entry.installedVersion = packages.find(
							pkg => pkg.name === entry.name
						)?.version;
					}
				});
			})
			.addCase(installPackages.fulfilled, (state, action) => {
				const {packages} = action.meta.arg;
				const {
					successful,
					installed,
					alreadyInstalled = []
				} = action.payload;
				state.installStatus = successful ? 'done' : 'error';
				const requestedNames = new Set(packages.map(pkg => pkg.name));
				// Resolved version per installed name (the backend may resolve a
				// concrete version from a requested semver range).
				const installedVersions = new Map(
					installed.map(ref => [ref.name, ref.version])
				);
				// Reported by the backend's pre-install plan: requested packages
				// it skipped because they were already present at that exact
				// version. Absent from `installed`, but not failures.
				const alreadyInstalledRefs = new Set(
					alreadyInstalled.map(ref =>
						buildPackageReference(ref.name, ref.version)
					)
				);
				state.alreadyInstalled = [...alreadyInstalledRefs];

				// Only touch the packages requested by this call, so a
				// concurrent install of other packages is left untouched.
				packages.forEach(pkg => {
					const entry = state.packageList.find(
						e => e.name === pkg.name
					);

					if (!entry || entry.state !== 'installing') return;

					const resolvedVersion = installedVersions.get(entry.name);
					const snapshot = state.installRollbacks[entry.name];

					if (successful && resolvedVersion !== undefined) {
						markInstalled(entry, resolvedVersion);
					} else if (
						alreadyInstalledRefs.has(
							buildPackageReference(pkg.name, pkg.version)
						)
					) {
						// Skipped by the backend as a no-op, not failed: it is
						// installed at the requested version already.
						markInstalled(entry, pkg.version);
					} else {
						markInstallFailed(entry, snapshot);
					}

					Reflect.deleteProperty(state.installRollbacks, entry.name);
				});

				// Mark the successfully installed dependencies that were not explicitly requested
				if (successful) {
					installed.forEach(ref => {
						if (requestedNames.has(ref.name)) return;

						const entry = state.packageList.find(
							e => e.name === ref.name
						);

						// Only mark dependencies that are not already installed or being installed
						if (!entry || entry.state === 'installing') return;

						markInstalled(entry, ref.version);
					});
				}

				// Drop selections that are now installed
				state.selectedPackages = state.selectedPackages.filter(
					selected => {
						const entry = state.packageList.find(
							e => e.name === selected.name
						);

						return !(
							entry?.state === 'installed' &&
							entry.installedVersion === selected.version
						);
					}
				);
			})
			.addCase(installPackages.rejected, (state, action) => {
				state.installStatus = 'error';
				const {packages} = action.meta.arg;

				// Only touch the packages requested by this call, so a
				// concurrent install of other packages is left untouched.
				packages.forEach(pkg => {
					const entry = state.packageList.find(
						e => e.name === pkg.name
					);

					if (!entry || entry.state !== 'installing') return;

					markInstallFailed(
						entry,
						state.installRollbacks[entry.name]
					);
					Reflect.deleteProperty(state.installRollbacks, entry.name);
				});
			})
			// Uninstall handling
			.addCase(uninstallPackages.pending, (state, action) => {
				const {names} = action.meta.arg;
				const {requestId} = action.meta;
				const nameSet = new Set(names);

				state.uninstallRollbacks[requestId] = state.packageList
					.filter(
						entry =>
							nameSet.has(entry.name) &&
							entry.installedVersion !== undefined
					)
					.map(entry => current(entry));

				clearInstalled(state.packageList, nameSet);
			})
			.addCase(uninstallPackages.fulfilled, (state, action) => {
				const {requestId} = action.meta;

				if (action.payload.successful) {
					// The backend may have auto-uninstalled dependents that were
					// not part of the optimistic update; clear them too.
					const requestedSet = new Set(action.meta.arg.names);
					const extraSet = new Set(
						action.payload.uninstalledNames.filter(
							name => !requestedSet.has(name)
						)
					);

					// Clear the installed version for any extra uninstalled packages
					if (extraSet.size > 0) {
						clearInstalled(state.packageList, extraSet);
					}
				} else {
					const alreadyRemoved = new Set(
						action.payload.uninstalledNames
					);
					const toRestore = state.uninstallRollbacks[
						requestId
					]?.filter(entry => !alreadyRemoved.has(entry.name));
					restoreEntries(state.packageList, toRestore);

					// If the backend reports failure but also returns some successfully uninstalled packages, clear those to avoid UI inconsistency (since the optimistic update assumed success).
					if (alreadyRemoved.size > 0) {
						clearInstalled(state.packageList, alreadyRemoved);
					}
				}

				Reflect.deleteProperty(state.uninstallRollbacks, requestId);
			})
			.addCase(uninstallPackages.rejected, (state, action) => {
				const {requestId} = action.meta;

				restoreEntries(
					state.packageList,
					state.uninstallRollbacks[requestId]
				);
				Reflect.deleteProperty(state.uninstallRollbacks, requestId);
			})
			// Post-install/uninstall reconciliation with the real conan cache
			.addCase(refreshPackageCacheState.pending, (state, action) => {
				for (const name of new Set(action.meta.arg)) {
					state.cacheRefreshRequestIds[name] = action.meta.requestId;
				}
			})
			.addCase(
				refreshPackageCacheState.fulfilled,
				(state, action) => {
					const {requestId} = action.meta;

					for (const name of new Set(action.meta.arg)) {
						// Drop a name a newer refresh has already claimed.
						if (state.cacheRefreshRequestIds[name] !== requestId) {
							continue;
						}

						Reflect.deleteProperty(
							state.cacheRefreshRequestIds,
							name
						);

						const entry = state.packageList.find(
							e => e.name === name
						);

						// A concurrent install owns its entry until it settles.
						if (!entry || entry.state === 'installing') continue;

						applyCacheState(
							entry,
							action.payload.cached.filter(
								pkg => pkg.reference.name === name
							)
						);
					}
				}
			);
	}
});

export const {
	togglePackageSelected,
	setPackageSelected,
	toggleSelectAllPackages,
	setNoSelectionError,
	changeSelectedVersion,
	setSearchQuery,
	setStatusFilter,
	setSocFilter,
	setTypeFilter,
	toggleRequiredOnly,
	setPage,
	setPageSize,
	setIsLoggedIn,
	clearFilters
} = packagesSlice.actions;
export const packagesReducer = packagesSlice.reducer;
