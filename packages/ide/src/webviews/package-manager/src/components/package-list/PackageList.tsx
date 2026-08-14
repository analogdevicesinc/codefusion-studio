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

import {CheckBox} from 'cfs-react-library';
import PackageLoading from '../package-loading/PackageLoading';
import ConflictIcon from '../../../../common/icons/Conflict';
import PackageCard from '../package-card/PackageCard';
import styles from './package-list.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';

import {useAppDispatch} from '../../state/store';
import {toggleSelectAllPackages} from '../../state/slices/packages/packages.reducer';
import {
	useCurrentPageEntries,
	useDetails,
	usePackageListTotal,
	usePackageListLoading,
	usePackagesError,
	useIsSelectAllChecked,
	useIsIndeterminate,
	useSelectedPackages,
	usePageSize
} from '../../state/slices/packages/packages.selector';
import EmptyPackageContainer from '../empty-package-container/EmptyPackageContainer';

const maxLoadingPlaceholders = 20;

/**
 * Select-all checkbox intended to be placed inside the sticky
 * header wrapper in MainPackageContainer.
 */
export function SelectAllCheckbox() {
	const l10n = useLocaleContext()?.packageList;
	const pageEntries = useCurrentPageEntries();
	const loading = usePackageListLoading();
	const error = usePackagesError();
	const isSelectAllChecked = useIsSelectAllChecked();
	const isIndeterminate = useIsIndeterminate();
	const selectedCount = useSelectedPackages().length;
	const dispatch = useAppDispatch();

	const handleSelectAll = () => {
		dispatch(toggleSelectAllPackages(pageEntries));
	};

	if (loading || error !== undefined || pageEntries.length === 0) {
		return null;
	}

	return (
		<div className={styles.selectAllContainer}>
			<label className={styles.checkboxContainer}>
				<CheckBox
					checked={isSelectAllChecked}
					indeterminate={isIndeterminate}
					onClick={handleSelectAll}
				/>
				{l10n?.selectAll ?? 'Select All'}
			</label>
			{selectedCount > 0 && (
				<span className={styles.selectedCount}>
					{(selectedCount === 1
						? (l10n?.selectedCountSingular ?? '{count} item selected')
						: (l10n?.selectedCount ?? '{count} items selected')
					).replace('{count}', selectedCount.toString())}
				</span>
			)}
		</div>
	);
}

export default function PackageList() {
	const pageEntries = useCurrentPageEntries();
	const details = useDetails();
	const total = usePackageListTotal();

	const loading = usePackageListLoading();
	const error = usePackagesError();
	const pageSize = usePageSize();

	if (loading) {
		return (
			<div className={styles.container}>
				<div className={styles.cardsList}>
					{Array.from({
						length: Math.min(pageSize, maxLoadingPlaceholders)
					}).map((_, i) => (
						// eslint-disable-next-line react/no-array-index-key
						<PackageLoading key={i} />
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className={styles.container}>
				<div className={styles.errorContainer}>
					<ConflictIcon />
					<span className={styles.errorText}>{error}</span>
				</div>
			</div>
		);
	}

	if (total === 0) {
		return <EmptyPackageContainer />;
	}

	return (
		<div className={styles.container}>
			<div className={styles.cardsList}>
				{pageEntries.map(entry => (
					<PackageCard
						key={entry.name}
						entry={entry}
						details={details}
					/>
				))}
			</div>
		</div>
	);
}
