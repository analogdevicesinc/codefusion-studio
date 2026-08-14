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

import {useCallback, useEffect, useState} from 'react';
import styles from './review-summary.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	Button,
	CollapseAllIcon,
	ExpandAllIcon
} from 'cfs-react-library';
import PackageReviewGroup from '../package-review-group/PackageReviewGroup';
import {
	buildDependencyCardKey,
	useDependencyGroups
} from './useDependencyGroups';
import ActionBar from '../action-bar/ActionBar';
import {useAppDispatch} from '../../state/store';
import {
	fetchPageDetails,
	buildPackageReference
} from '../../state/slices/packages/packages.reducer';
import {
	useSelectedPackages,
	useDetails
} from '../../state/slices/packages/packages.selector';

type ReviewSummaryProps = {
	readonly onBack: () => void;
	readonly onContinue: () => void;
};

export default function ReviewSummary({
	onBack,
	onContinue
}: ReviewSummaryProps) {
	const l10n = useLocaleContext()?.reviewSummary;
	const actionBarL10n = useLocaleContext()?.actionBar;
	const dispatch = useAppDispatch();
	const selectedPackages = useSelectedPackages();
	const details = useDetails();
	const groups = useDependencyGroups(selectedPackages);
	const [expandedKeys, setExpandedKeys] = useState<
		ReadonlySet<string>
	>(new Set());

	const allKeys = groups.flatMap(group =>
		group.dependencies.map((dependency, i) =>
			buildDependencyCardKey(group.reference, dependency, i)
		)
	);

	// Expand/Collapse all are disabled until every group has resolved
	const isResolving = groups.some(group => group.loading);
	const allExpanded = allKeys.every(key => expandedKeys.has(key));
	const allCollapsed = allKeys.every(key => !expandedKeys.has(key));

	const expandAll = () => {
		setExpandedKeys(new Set(allKeys));
	};

	const collapseAll = () => {
		setExpandedKeys(new Set());
	};

	const handleToggle = useCallback((key: string) => {
		setExpandedKeys(prev => {
			const next = new Set(prev);

			if (next.has(key)) {
				next.delete(key);
			} else {
				next.add(key);
			}

			return next;
		});
	}, []);

	useEffect(() => {
		const missing = selectedPackages.filter(
			pkg => !details[buildPackageReference(pkg.name, pkg.version)]
		);

		if (missing.length > 0) {
			void dispatch(fetchPageDetails(missing));
		}
	}, [dispatch, selectedPackages, details]);

	return (
		<div className={styles.outerFrame}>
			<div className={styles.scrollArea}>
				<div className={styles.container}>
					<div className={styles.header}>
						<div className={styles.headerContent}>
							<div className={styles.textGroup}>
								<span className={styles.title}>{l10n?.title}</span>
								<span className={styles.description}>
									{l10n?.description}
								</span>
							</div>
							<div className={styles.buttonGroup}>
								<Button
									appearance='icon'
									disabled={isResolving || allExpanded}
									onClick={expandAll}
								>
									<ExpandAllIcon />
								</Button>
								<Button
									appearance='icon'
									disabled={isResolving || allCollapsed}
									onClick={collapseAll}
								>
									<CollapseAllIcon />
								</Button>
							</div>
						</div>
					</div>

					<div className={styles.packageList}>
						{groups.map(group => (
							<PackageReviewGroup
								key={buildPackageReference(
									group.reference.name,
									group.reference.version
								)}
								reference={group.reference}
								dependencies={group.dependencies}
								isLoading={group.loading}
								expandedKeys={expandedKeys}
								onToggle={handleToggle}
							/>
						))}
					</div>
				</div>
			</div>
			<ActionBar
				secondaryAction={{
					label: actionBarL10n?.back ?? '',
					onClick: onBack
				}}
				primaryAction={{
					label: actionBarL10n?.continue ?? '',
					onClick: onContinue
				}}
			/>
		</div>
	);
}
