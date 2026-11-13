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

import {useEffect} from 'react';
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
import {fetchRemoteIndexing} from '../../state/slices/remotes/remotes.reducer';
import {
	fetchPackageList,
	fetchLoggedInStatus
} from '../../state/slices/packages/packages.reducer';
import {
	useNoSelectionError,
	useHasInstalledVersionSelected
} from '../../state/slices/packages/packages.selector';

/**
 * Main display of the package manager webview: filters and the paginated
 * package list. The pagination controls and action bar are pinned at the
 * bottom of the page by the app shell, not rendered here.
 */
export default function MainPackageContainer() {
	const l10n = useLocaleContext()?.packageList;
	const dispatch = useAppDispatch();
	const noSelectionError = useNoSelectionError();
	const hasInstalledVersionSelected =
		useHasInstalledVersionSelected();

	// Load the package list, login status and indexing state once on mount.
	useEffect(() => {
		void dispatch(fetchPackageList());
		void dispatch(fetchLoggedInStatus());
		// Indexing that started before the panel opened locks actions too
		void dispatch(fetchRemoteIndexing());
	}, [dispatch]);

	return (
		<div className={styles.container}>
			<PackageFiltersTitle />
			<div className={styles.stickyHeader}>
				<PackageFiltersBar />
				<MissingPackagesAlert />
				{noSelectionError && (
					<InlineMessage
						type='error'
						dataTest='no-selection-error'
						className={styles.errorContainer}
					>
						{l10n?.noSelectionError ??
							'Please make a selection in order to continue.'}
					</InlineMessage>
				)}
				{hasInstalledVersionSelected && (
					<InlineMessage
						type='error'
						dataTest='already-installed-error'
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
