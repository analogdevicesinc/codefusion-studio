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

import {useEffect, useRef} from 'react';
import {InlineMessage} from 'cfs-react-library';
import styles from './main-package-container.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	PackageFiltersTitle,
	PackageFiltersBar
} from '../package-filters/PackageFilters';
import PackageList, {
	SelectAllCheckbox
} from '../package-list/PackageList';
import MissingPackagesAlert from '../missing-packages-alert/MissingPackagesAlert';
import {useAppDispatch} from '../../state/store';
import {
	fetchPackageList,
	fetchLoggedInStatus,
	fetchPageDetails,
	buildPackageReference
} from '../../state/slices/packages/packages.reducer';
import {
	usePackageList,
	useCurrentPageEntries,
	useDetails,
	useDetailsEpoch,
	useNoSelectionError,
	useHasInstalledVersionSelected,
	useSocFilter,
	useTypeFilter
} from '../../state/slices/packages/packages.selector';
import {getDefaultVersion} from '../../utils';

const DETAILS_BATCH_SIZE = 50;

/**
 * Main display of the package manager webview: filters and the paginated
 * package list. The pagination controls and action bar are pinned at the
 * bottom of the page by the app shell, not rendered here.
 *
 * Data flow:
 * - The lightweight package list is fetched once on mount.
 * - Detailed metadata is fetched lazily, only for the packages on the
 *   page the user is currently viewing.
 * - SoC/type filtering needs metadata for the *whole* list (the filter must
 *   span all pages), so when such a filter is active we batch-fetch details for
 *   every list entry.
 */
export default function MainPackageContainer() {
	const l10n = useLocaleContext()?.packageList;
	const dispatch = useAppDispatch();
	const packageList = usePackageList();
	const pageEntries = useCurrentPageEntries();
	const details = useDetails();
	const socFilter = useSocFilter();
	const typeFilter = useTypeFilter();
	const noSelectionError = useNoSelectionError();
	const detailsEpoch = useDetailsEpoch();
	const hasInstalledVersionSelected =
		useHasInstalledVersionSelected();

	// Guards against redundant requests when rapidly switching pages/filters.
	const requestedRefs = useRef(new Set<string>());

	// Load the package list + login status once on mount.
	useEffect(() => {
		void dispatch(fetchPackageList({}));
		void dispatch(fetchLoggedInStatus());
	}, [dispatch]);

	/**
	 * An auth-change reset bumps the epoch
	 * Different epoch = different auth state, which invalidates pending requests.
	 */
	useEffect(() => {
		requestedRefs.current.clear();
	}, [detailsEpoch]);

	const isMetadataFilterActive =
		socFilter.length > 0 || typeFilter.length > 0;

	// When a soc/type filter is active, ensure details exist for the entire
	// list so the filter can match across all pages (and not just the loaded
	// one). If not, prefetch only the current page's packages.
	useEffect(() => {
		const entries = isMetadataFilterActive
			? packageList
			: pageEntries;

		/**
		 * When metadata filters are active the selector inspects every version
		 * of every entry, so prefetch all of them otherwise just the default.
		 */
		const refs = entries.flatMap(entry =>
			isMetadataFilterActive
				? entry.versions.map(version => ({name: entry.name, version}))
				: [{name: entry.name, version: getDefaultVersion(entry)}]
		);

		const missing = refs.filter(ref => {
			if (ref.version === '') {
				return false;
			}

			const key = buildPackageReference(ref.name, ref.version);

			return !details[key] && !requestedRefs.current.has(key);
		});

		// Chunk to keep IPC payloads and the downstream conan command line bounded.
		for (let i = 0; i < missing.length; i += DETAILS_BATCH_SIZE) {
			const chunk = missing.slice(i, i + DETAILS_BATCH_SIZE);
			const keys = chunk.map(ref =>
				buildPackageReference(ref.name, ref.version)
			);

			for (const key of keys) {
				requestedRefs.current.add(key);
			}

			// Clear on settle so a failed fetch retries on the next render.
			void dispatch(fetchPageDetails(chunk)).finally(() => {
				for (const key of keys) {
					requestedRefs.current.delete(key);
				}
			});
		}
	}, [
		dispatch,
		isMetadataFilterActive,
		packageList,
		pageEntries,
		details
	]);

	return (
		<div className={styles.container}>
			<PackageFiltersTitle />
			<div className={styles.stickyHeader}>
				<PackageFiltersBar />
				<MissingPackagesAlert />
				{noSelectionError && (
					<InlineMessage
						type='error'
						className={styles.errorContainer}
					>
						{l10n?.noSelectionError ??
							'Please make a selection in order to continue.'}
					</InlineMessage>
				)}
				{hasInstalledVersionSelected && (
					<InlineMessage
						type='error'
						className={styles.errorContainer}
					>
						{l10n?.alreadyInstalledError ??
							'Some selected packages are already installed.'}
					</InlineMessage>
				)}
				<SelectAllCheckbox />
			</div>
			<PackageList />
		</div>
	);
}
