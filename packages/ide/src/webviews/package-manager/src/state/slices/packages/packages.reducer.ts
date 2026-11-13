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
	miniSerializeError,
	type PayloadAction
} from '@reduxjs/toolkit';
import type {
	CfsCachedPackage,
	CfsDependencyConflict,
	CfsPackageInstallOptions,
	CfsPackageReference
} from 'cfs-package-manager';
import type {
	DependencyResolutionResponse,
	GetPackageListResponse,
	GetSocListResponse,
	MissingRequiredPackage,
	PackageListEntry,
	SocFilterOption
} from '@constants/messages/package-manager-messages';
import {
	getLoggedInStatusRequest,
	getPackageListRequest,
	getPackageDependenciesBatchRequest,
	getPackageCacheStateRequest,
	getSocListRequest,
	uninstallPackagesRequest,
	installPackagesRequest
} from '@constants/messages/package-manager-messages';
import {messenger} from '../../../../../common/contexts/MessengerContext';
import {getDefaultVersion} from '../../../utils';

const DEFAULT_PAGE_SIZE = 10;

/** The `name/version` key used for selections, licences and dependencies. */
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
 * Rolls an entry back to what it looked like before the install started. The
 * failure itself is reported by the install progress page, so the list entry
 * carries no trace of it — it simply keeps whatever was installed before.
 */
function revertInstall(
	entry: PackageListEntry,
	snapshot: PackageListEntry | undefined
): void {
	entry.state = snapshot?.state ?? 'not-installed';
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

	entry.state =
		entry.installedVersion === undefined
			? 'not-installed'
			: 'installed';
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
	/** Full ordered package list, with each version's catalog metadata in `releases`. */
	packageList: PackageListEntry[];
	/** Required packages absent from the visible catalog (no access). */
	missingRequiredPackages: MissingRequiredPackage[];
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

	/** SoC filter dropdown options: every SoC in the SoC catalog. */
	socOptions: SocFilterOption[];
	socListLoading: boolean;
	/** Latest SoC-list fetch; an older response is dropped. */
	socListRequestId?: string;

	noSelectionError: boolean;
	isLoggedIn: boolean;
	packageListLoading: boolean;
	/** Package list-level error. */
	error?: string;
	/**
	 * Tracks the most recently dispatched package-list fetch by requestId. A
	 * response whose requestId no longer matches the latest is dropped, so a
	 * slow earlier request can't overwrite a newer one (e.g. a login-triggered
	 * refetch racing the initial mount fetch).
	 */
	packageListRequestId?: string;
	/**
	 * Latest cache-refresh requestId per package name
	 */
	cacheRefreshRequestIds: Record<string, string>;
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
	/**
	 * Dependency closure of the current selection, resolved once and shared by
	 * the review and licence pages.
	 */
	dependencyResolution: DependencyResolutionState;
};

/**
 * Result of resolving the selected packages as one dependency graph.
 */
export type DependencyResolutionState = {
	/**
	 * Selection this result belongs to, or undefined before the first run.
	 * A resolution is reused while the selection is unchanged.
	 */
	key?: string;
	/**
	 * The dispatch this result came from, so a slow earlier request cannot
	 * overwrite a newer one.
	 */
	requestId?: string;
	/** Closure per requested reference, keyed by `name/version`. */
	byRef: Record<string, CfsPackageReference[]>;
	loading: boolean;
	/**
	 * The disputed dependency, when resolution failed because the selected
	 * packages cannot agree on a version.
	 */
	conflict?: CfsDependencyConflict;
	/**
	 * Message from the failed resolution, undefined when it succeeded. A graph
	 * failure may still fill `byRef`, so empty never means "no dependencies".
	 */
	failure?: string;
};

/**
 * Identity of a selection, order-independent, used to decide whether an
 * existing dependency resolution still applies.
 */
export const buildSelectionKey = (
	references: CfsPackageReference[]
): string =>
	references
		.map(reference =>
			buildPackageReference(reference.name, reference.version)
		)
		.sort()
		.join(',');

/** True when the action belongs to the resolution currently in flight. */
const isCurrentResolution = (
	state: PackagesState,
	requestId: string
): boolean => state.dependencyResolution.requestId === requestId;

const packagesInitialState: PackagesState = {
	packageList: [],
	missingRequiredPackages: [],
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
	// Loading until the first response, so the dropdown never flashes
	// "no results" between mount (or an auth reset) and the fetch.
	socListLoading: true,
	socListRequestId: undefined,

	noSelectionError: false,
	isLoggedIn: true,
	packageListLoading: true,
	error: undefined,
	packageListRequestId: undefined,
	cacheRefreshRequestIds: {},
	uninstallRollbacks: {},
	installRollbacks: {},
	alreadyInstalled: [],
	installStatus: 'idle',
	installTargets: [],
	dependencyResolution: {
		key: undefined,
		byRef: {},
		loading: false,
		conflict: undefined,
		failure: undefined
	}
};

/**
 * Fetches the full, ordered package list with every version's catalog
 * metadata embedded.
 */
export const fetchPackageList =
	createAsyncThunk<GetPackageListResponse>(
		'packages/fetchPackageList',
		async () =>
			messenger.sendRequest(getPackageListRequest, {
				type: 'extension'
			})
	);

/**
 * Resolves the dependency closure of the whole selection in one backend call.
 *
 * Review and licence acceptance need the same answer and the selection cannot
 * change between them, so re-dispatching for an unchanged selection is a no-op.
 */
export const fetchDependencyResolution = createAsyncThunk<
	{key: string} & DependencyResolutionResponse,
	CfsPackageReference[],
	{rejectValue: {key: string; message: string}}
>(
	'packages/fetchDependencyResolution',
	async (references, {rejectWithValue}) => {
		const key = buildSelectionKey(references);

		if (references.length === 0) {
			return {key, dependencies: {}};
		}

		try {
			const response = await messenger.sendRequest(
				getPackageDependenciesBatchRequest,
				{type: 'extension'},
				{references}
			);

			// A conflict arrives as a resolved response, not a rejection, so
			// the structured cause survives the messenger boundary.
			return {key, ...response};
		} catch (error) {
			// The messenger rejects with a plain `{message, data}` object, not an
			// Error, because an Error does not survive postMessage.
			return rejectWithValue({
				key,
				message: miniSerializeError(error).message ?? String(error)
			});
		}
	},
	{
		condition(references, {getState}) {
			const {dependencyResolution} = (
				getState() as {packagesReducer: PackagesState}
			).packagesReducer;

			if (
				dependencyResolution.key !== buildSelectionKey(references)
			) {
				return true;
			}

			// Same selection: only worth retrying if it failed for a reason
			// that might not recur. A conflict is a settled answer.
			return (
				!dependencyResolution.loading &&
				dependencyResolution.failure !== undefined &&
				dependencyResolution.conflict === undefined
			);
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
 * Fetches the SoC filter options from the SoC catalog.
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
				// Drop selections and remembered versions the refreshed list no
				// longer offers, e.g. from a remote that was just disabled.
				const isListed = (name: string, version: string) =>
					state.packageList.some(
						entry =>
							entry.name === name && entry.versions.includes(version)
					);
				state.selectedPackages = state.selectedPackages.filter(pkg =>
					isListed(pkg.name, pkg.version)
				);
				state.selectedVersions = Object.fromEntries(
					Object.entries(state.selectedVersions).filter(
						([name, version]) => isListed(name, version)
					)
				);
			})
			.addCase(fetchPackageList.rejected, (state, action) => {
				if (action.meta.requestId !== state.packageListRequestId) {
					return;
				}

				state.packageListLoading = false;
				state.error = action.error.message;
			})
			// Dependency resolution shared by the review and licence pages
			.addCase(fetchDependencyResolution.pending, (state, action) => {
				// Claim the key up front so a second page asking for the same
				// selection is skipped rather than resolving it again.
				state.dependencyResolution = {
					key: buildSelectionKey(action.meta.arg),
					requestId: action.meta.requestId,
					byRef: {},
					loading: true,
					conflict: undefined,
					failure: undefined
				};
			})
			.addCase(
				fetchDependencyResolution.fulfilled,
				(state, action) => {
					if (!isCurrentResolution(state, action.meta.requestId)) {
						return;
					}

					state.dependencyResolution = {
						key: action.payload.key,
						requestId: action.meta.requestId,
						byRef: action.payload.dependencies,
						loading: false,
						conflict: action.payload.conflict,
						failure: action.payload.failure
					};
				}
			)
			.addCase(
				fetchDependencyResolution.rejected,
				(state, action) => {
					if (!isCurrentResolution(state, action.meta.requestId)) {
						return;
					}

					// Keep the key so the failure sticks to this selection, and
					// leave byRef empty rather than reporting "no dependencies".
					state.dependencyResolution = {
						key:
							action.payload?.key ??
							buildSelectionKey(action.meta.arg),
						requestId: action.meta.requestId,
						byRef: {},
						loading: false,
						failure:
							action.payload?.message ??
							action.error.message ??
							'Dependency resolution failed'
					};
				}
			)
			// Logged-in status fetching handling
			.addCase(fetchLoggedInStatus.fulfilled, (state, action) => {
				state.isLoggedIn = action.payload.loggedIn;
			})
			.addCase(fetchLoggedInStatus.rejected, state => {
				state.isLoggedIn = false;
			})
			// SoC filter options
			.addCase(fetchSocList.pending, (state, action) => {
				state.socListRequestId = action.meta.requestId;
				state.socListLoading = true;
			})
			.addCase(fetchSocList.fulfilled, (state, action) => {
				if (action.meta.requestId !== state.socListRequestId) {
					return;
				}

				state.socOptions = action.payload.socs;
				state.socListLoading = false;
			})
			.addCase(fetchSocList.rejected, (state, action) => {
				if (action.meta.requestId !== state.socListRequestId) {
					return;
				}

				state.socListLoading = false;
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
						revertInstall(entry, snapshot);
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

				// The install flow is over; start the list from a clean slate.
				state.selectedPackages = [];
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

					revertInstall(entry, state.installRollbacks[entry.name]);
					Reflect.deleteProperty(state.installRollbacks, entry.name);
				});

				// The install flow is over; start the list from a clean slate.
				state.selectedPackages = [];
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
