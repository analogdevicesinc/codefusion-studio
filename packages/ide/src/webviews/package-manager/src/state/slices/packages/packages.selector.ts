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

import {createSelector} from '@reduxjs/toolkit';
import type {
	PackageListEntry,
	PackageVersionMeta
} from '@constants/messages/package-manager-messages';
import {useAppSelector, type RootState} from '../../store';
import {compareVersions, isUpdateAvailable} from '../../../utils';

export const usePackageListLoading = () =>
	useAppSelector(state => state.packagesReducer.packageListLoading);

export const usePackagesError = () =>
	useAppSelector(state => state.packagesReducer.error);

export const useSearchQuery = () =>
	useAppSelector(state => state.packagesReducer.searchQuery);

export const useStatusFilter = () =>
	useAppSelector(state => state.packagesReducer.statusFilter);

export const useSocFilter = () =>
	useAppSelector(state => state.packagesReducer.socFilter);

export const useTypeFilter = () =>
	useAppSelector(state => state.packagesReducer.typeFilter);

export const useRequiredOnly = () =>
	useAppSelector(state => state.packagesReducer.requiredOnly);

export const useIsLoggedIn = () =>
	useAppSelector(state => state.packagesReducer.isLoggedIn);

export const usePage = () =>
	useAppSelector(state => state.packagesReducer.page);

export const usePageSize = () =>
	useAppSelector(state => state.packagesReducer.pageSize);

/** The full, unfiltered package list (every package/version known to the backend). */
export const usePackageList = () =>
	useAppSelector(state => state.packagesReducer.packageList);

/** Required packages absent from the visible catalog (no access). */
export const useMissingRequiredPackages = () =>
	useAppSelector(
		state => state.packagesReducer.missingRequiredPackages
	);

export const useSelectedPackages = () =>
	useAppSelector(state => state.packagesReducer.selectedPackages);

/**
 * Dependency closure of the current selection, resolved once and shared by the
 * review and licence pages.
 */
export const useDependencyResolution = () =>
	useAppSelector(state => state.packagesReducer.dependencyResolution);

export const useSelectedVersion = (name: string) =>
	useAppSelector(
		state => state.packagesReducer.selectedVersions[name]
	);

export const useNoSelectionError = () =>
	useAppSelector(state => state.packagesReducer.noSelectionError);

/** The catalog metadata of one package version, if the catalog knows it. */
export const useVersionMeta = (
	name: string,
	version: string
): PackageVersionMeta | undefined =>
	useAppSelector(
		state =>
			state.packagesReducer.packageList.find(
				entry => entry.name === name
			)?.releases?.[version]
	);

/**
 * True when at least one selected package is pinned to the version that is
 * already installed. Installing it would be a no-op, so the flow is blocked
 * until the user changes the version or deselects it.
 */
const selectHasInstalledVersionSelected = createSelector(
	[
		(state: RootState) => state.packagesReducer.selectedPackages,
		(state: RootState) => state.packagesReducer.packageList
	],
	(selectedPackages, packageList) =>
		selectedPackages.some(selected => {
			const entry = packageList.find(e => e.name === selected.name);

			return entry?.installedVersion === selected.version;
		})
);

export const useHasInstalledVersionSelected = () =>
	useAppSelector(selectHasInstalledVersionSelected);

/** Status of the bulk install started from the license page. */
export const useInstallStatus = () =>
	useAppSelector(state => state.packagesReducer.installStatus);

/** The exact set of packages the current install is installing. */
export const useInstallTargets = () =>
	useAppSelector(state => state.packagesReducer.installTargets);

/**
 * References (`name/version`) the current install skipped because they were
 * already installed at that version, so they can be reported as such instead of
 * as failures.
 */
export const useAlreadyInstalledRefs = () =>
	useAppSelector(state => state.packagesReducer.alreadyInstalled);

/** The newest version of a package list entry. */
const latestVersionOf = (entry: PackageListEntry): string =>
	[...entry.versions].sort((a, b) => compareVersions(b, a))[0] ?? '';

/** The metadata of every version of an entry the catalog knows. */
const releasesOf = (entry: PackageListEntry): PackageVersionMeta[] =>
	Object.values(entry.releases ?? {});

/** Whether the name, or any version's description or SoCs, contain the query. */
const matchesSearch = (
	entry: PackageListEntry,
	query: string
): boolean =>
	entry.name.toLowerCase().includes(query) ||
	releasesOf(entry).some(
		meta =>
			meta.description?.toLowerCase().includes(query) === true ||
			meta.socs.some(soc => soc.toLowerCase().includes(query))
	);

/**
 * The package list after every filter. SoC and type match when any
 * version of the package does (case-insensitive).
 */
const selectFilteredPackageList = createSelector(
	[
		(state: RootState) => state.packagesReducer.packageList,
		(state: RootState) => state.packagesReducer.searchQuery,
		(state: RootState) => state.packagesReducer.statusFilter,
		(state: RootState) => state.packagesReducer.requiredOnly,
		(state: RootState) => state.packagesReducer.socFilter,
		(state: RootState) => state.packagesReducer.typeFilter
	],
	(
		packageList,
		searchQuery,
		statusFilter,
		requiredOnly,
		socFilter,
		typeFilter
	) => {
		const query = searchQuery.trim().toLowerCase();
		const selectedSocs = new Set(socFilter.map(s => s.toLowerCase()));
		const selectedTypes = new Set(
			typeFilter.map(t => t.toLowerCase())
		);

		return packageList.filter(entry => {
			if (query && !matchesSearch(entry, query)) {
				return false;
			}

			if (requiredOnly && !entry.isRequired) {
				return false;
			}

			if (statusFilter.length > 0) {
				const isInstalled = entry.installedVersion !== undefined;
				const hasUpdate =
					entry.installedVersion !== undefined &&
					isUpdateAvailable(
						entry.installedVersion,
						latestVersionOf(entry)
					);

				const matches = statusFilter.some(status => {
					if (status === 'installed') return isInstalled;
					if (status === 'not-installed') return !isInstalled;
					if (status === 'update-available') return hasUpdate;

					return false;
				});

				if (!matches) {
					return false;
				}
			}

			if (selectedSocs.size > 0 || selectedTypes.size > 0) {
				const matchesVersion = (meta: PackageVersionMeta) =>
					(selectedSocs.size === 0 ||
						meta.socs.some(soc =>
							selectedSocs.has(soc.toLowerCase())
						)) &&
					(selectedTypes.size === 0 ||
						(meta.type !== undefined &&
							selectedTypes.has(meta.type.toLowerCase())));

				if (!releasesOf(entry).some(matchesVersion)) {
					return false;
				}
			}

			return true;
		});
	}
);

/** SoC filter options: every SoC in the SoC catalog. */
export const useSocOptions = () =>
	useAppSelector(state => state.packagesReducer.socOptions);

export const useSocListLoading = () =>
	useAppSelector(state => state.packagesReducer.socListLoading);

/** Package types offered by the type filter: every type some listed version has. */
const selectTypeOptions = createSelector(
	[(state: RootState) => state.packagesReducer.packageList],
	packageList => {
		const types = new Set<string>();

		for (const entry of packageList) {
			for (const meta of releasesOf(entry)) {
				if (meta.type) {
					types.add(meta.type);
				}
			}
		}

		return [...types].sort((a, b) => a.localeCompare(b));
	}
);

export const useTypeOptions = () => useAppSelector(selectTypeOptions);

/** Total number of packages after filtering — drives pagination. */
export const usePackageListTotal = () =>
	useAppSelector(state => selectFilteredPackageList(state).length);

/** The package list entries visible on the current page. */
const selectCurrentPageEntries = createSelector(
	[
		selectFilteredPackageList,
		(state: RootState) => state.packagesReducer.page,
		(state: RootState) => state.packagesReducer.pageSize
	],
	(filtered, page, pageSize) => {
		const pageCount = Math.max(
			1,
			Math.ceil(filtered.length / pageSize)
		);
		const safePage = Math.min(Math.max(1, page), pageCount);
		const start = (safePage - 1) * pageSize;

		return filtered.slice(start, start + pageSize);
	}
);

export const useCurrentPageEntries = () =>
	useAppSelector(selectCurrentPageEntries);

const isRefSelected = (
	name: string,
	version: string,
	selected: Array<{name: string; version: string}>
) => selected.some(s => s.name === name && s.version === version);

/** How many of the current page's entries have a selected version. */
const selectSelectedCount = createSelector(
	[
		(state: RootState) => state.packagesReducer.selectedPackages,
		selectCurrentPageEntries
	],
	(selected, pageEntries) =>
		pageEntries.filter(entry =>
			entry.versions.some(version =>
				isRefSelected(entry.name, version, selected)
			)
		).length
);

const selectIsSelectAllChecked = createSelector(
	[selectSelectedCount, selectCurrentPageEntries],
	(count, pageEntries) =>
		pageEntries.length > 0 && count === pageEntries.length
);

const selectIsIndeterminate = createSelector(
	[selectSelectedCount, selectCurrentPageEntries],
	(count, pageEntries) => count > 0 && count < pageEntries.length
);

export const useIsSelectAllChecked = () =>
	useAppSelector(selectIsSelectAllChecked);

export const useIsIndeterminate = () =>
	useAppSelector(selectIsIndeterminate);
