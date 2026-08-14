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
import type {CfsPackage} from 'cfs-package-manager';
import type {
	PackageListEntry,
	PackageListEntryState
} from '@constants/messages/package-manager-messages';
import {useAppSelector, type RootState} from '../../store';
import {compareVersions, isUpdateAvailable} from '../../../utils';
import {buildPackageReference} from './packages.reducer';

export const usePackageListLoading = () =>
	useAppSelector(state => state.packagesReducer.packageListLoading);

export const usePackagesError = () =>
	useAppSelector(state => state.packagesReducer.error);

export const useDetailsError = () =>
	useAppSelector(state => state.packagesReducer.detailsError);

export const useDetailsEpoch = () =>
	useAppSelector(state => state.packagesReducer.detailsEpoch);

export const useSearchQuery = () =>
	useAppSelector(state => state.packagesReducer.searchQuery);

export const useStatusFilter = () =>
	useAppSelector(state => state.packagesReducer.statusFilter);

export const useSocFilter = () =>
	useAppSelector(state => state.packagesReducer.socFilter);

export const useSocOptions = () =>
	useAppSelector(state => state.packagesReducer.socOptions);

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

export const useDetails = () =>
	useAppSelector(state => state.packagesReducer.details);

/** The full, unfiltered package list (every package/version known to the backend). */
export const usePackageList = () =>
	useAppSelector(state => state.packagesReducer.packageList);

/** Required packages absent from the catalog search (no access). */
export const useMissingRequiredPackages = () =>
	useAppSelector(
		state => state.packagesReducer.missingRequiredPackages
	);

export const useSelectedPackages = () =>
	useAppSelector(state => state.packagesReducer.selectedPackages);

export const useSelectedVersion = (name: string) =>
	useAppSelector(
		state => state.packagesReducer.selectedVersions[name]
	);

export const useNoSelectionError = () =>
	useAppSelector(state => state.packagesReducer.noSelectionError);

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

/** Per-package install state keyed by package name. */
const selectPackageStateByName = createSelector(
	[(state: RootState) => state.packagesReducer.packageList],
	packageList => {
		const byName: Record<string, PackageListEntryState> = {};

		for (const entry of packageList) {
			byName[entry.name] = entry.state;
		}

		return byName;
	}
);

/** Looks up any package's current install state by name, e.g. to surface a per-package `installation-failed`. */
export const usePackageStateByName = () =>
	useAppSelector(selectPackageStateByName);

/** The newest version of a package list entry. */
const latestVersionOf = (entry: PackageListEntry): string =>
	[...entry.versions].sort((a, b) => compareVersions(b, a))[0] ?? '';

/**
 * The package list after applying the cheap, list-only filters: name search,
 * the required-only toggle, and the install-status filter. (soc/type metadata
 * filters are not applied here — they require per-package metadata and are
 * handled separately.)
 */
const selectFilteredPackageList = createSelector(
	[
		(state: RootState) => state.packagesReducer.packageList,
		(state: RootState) => state.packagesReducer.searchQuery,
		(state: RootState) => state.packagesReducer.statusFilter,
		(state: RootState) => state.packagesReducer.requiredOnly
	],
	(packageList, searchQuery, statusFilter, requiredOnly) => {
		const query = searchQuery.trim().toLowerCase();

		return packageList.filter(entry => {
			if (query && !entry.name.toLowerCase().includes(query)) {
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

			return true;
		});
	}
);

/**
 * Applies the metadata filters (SoC and type) on top of
 * {@link selectFilteredPackageList}.
 *
 * SoC and type live only on a package's fetched details, not the list entry.
 * When a soc/type filter is active, {@link MainPackageContainer} batch-fetches
 * details for the *entire* list, so every entry has loaded details and this
 * filter spans all pages. A package matches when any of its versions has
 * details satisfying the active filters (case-insensitive). With neither
 * filter set, the package list passes through unchanged.
 */
const selectMetadataFilteredPackageList = createSelector(
	[
		selectFilteredPackageList,
		(state: RootState) => state.packagesReducer.details,
		(state: RootState) => state.packagesReducer.socFilter,
		(state: RootState) => state.packagesReducer.typeFilter
	],
	(packageList, details, socFilter, typeFilter) => {
		if (socFilter.length === 0 && typeFilter.length === 0) {
			return packageList;
		}

		const selectedSocs = new Set(socFilter.map(s => s.toLowerCase()));
		const selectedTypes = new Set(
			typeFilter.map(t => t.toLowerCase())
		);

		/**
		 * A package's `soc` entry can be a single comma-joined string
		 * rather than separate array elements, so split
		 * each entry on commas before matching.
		 *
		 * Undefined `pkg` means details aren't fetched yet — keep the entry.
		 */
		const matchesSoc = (pkg: CfsPackage | undefined) => {
			if (selectedSocs.size === 0 || pkg === undefined) {
				return true;
			}

			return Boolean(
				pkg.soc?.some(entry =>
					entry
						.split(',')
						.some(soc => selectedSocs.has(soc.trim().toLowerCase()))
				)
			);
		};

		const matchesType = (pkg: CfsPackage | undefined) => {
			if (selectedTypes.size === 0 || pkg === undefined) {
				return true;
			}

			return (
				pkg.type !== undefined &&
				selectedTypes.has(pkg.type.toLowerCase())
			);
		};

		return packageList.filter(entry =>
			entry.versions.some(version => {
				const pkg =
					details[buildPackageReference(entry.name, version)];

				return matchesSoc(pkg) && matchesType(pkg);
			})
		);
	}
);

/** Total number of packages after filtering — drives pagination. */
export const usePackageListTotal = () =>
	useAppSelector(
		state => selectMetadataFilteredPackageList(state).length
	);

/** The package list entries visible on the current page. */
const selectCurrentPageEntries = createSelector(
	[
		selectMetadataFilteredPackageList,
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
