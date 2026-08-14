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

import {Button, EmptyState} from 'cfs-react-library';
import styles from './empty-package-container.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	useRequiredOnly,
	useSearchQuery,
	useStatusFilter,
	useSocFilter,
	useTypeFilter
} from '../../state/slices/packages/packages.selector';
import {clearFilters} from '../../state/slices/packages/packages.reducer';
import {useAppDispatch} from '../../state/store';

export default function EmptyPackageContainer() {
	const l10n = useLocaleContext()?.emptyPackageContainer;
	const searchQuery = useSearchQuery();
	const statusFilter = useStatusFilter();
	const socFilter = useSocFilter();
	const typeFilter = useTypeFilter();
	const requiredOnly = useRequiredOnly();
	const dispatch = useAppDispatch();

	const hasActiveServerSideFilters = Boolean(
		searchQuery || socFilter.length > 0 || typeFilter.length > 0
	);

	const hasActiveFilters =
		hasActiveServerSideFilters ||
		statusFilter.length > 0 ||
		requiredOnly;

	const handleClearFilters = () => {
		dispatch(clearFilters());
	};

	const title = hasActiveFilters
		? l10n?.emptyPackageFilterTitle
		: l10n?.emptyPackageTitle;

	const description = hasActiveFilters
		? l10n?.emptyPackageFilterDescription
		: l10n?.emptyPackageDescription;

	return (
		<EmptyState
			type='info'
			title={title}
			description={description}
			className={styles.fullHeight}
		>
			<div slot='body' className={styles.description}>
				{hasActiveFilters ? (
					<Button appearance='primary' onClick={handleClearFilters}>
						{l10n?.clearFilters}
					</Button>
				) : (
					l10n?.emptyPackageSignInNote
				)}
			</div>
		</EmptyState>
	);
}
