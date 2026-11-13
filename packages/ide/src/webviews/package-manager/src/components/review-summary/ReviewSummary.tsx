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

import {useCallback, useState} from 'react';
import styles from './review-summary.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	CollapseAllIcon,
	ExpandAllIcon,
	SegmentedControls
} from 'cfs-react-library';
import PackageReviewGroup from '../package-review-group/PackageReviewGroup';
import {
	buildDependencyCardKey,
	useDependencyGroups
} from './useDependencyGroups';
import ConflictNotice from './ConflictNotice';
import ActionBar from '../action-bar/ActionBar';
import {useIndexingLock} from '../../hooks/useIndexingLock';
import {useAppDispatch} from '../../state/store';
import {
	buildPackageReference,
	installPackages
} from '../../state/slices/packages/packages.reducer';
import {useSelectedPackages} from '../../state/slices/packages/packages.selector';
import {type InstallPlanResult} from '../../hooks/useInstallPlan';

type ReviewSummaryProps = {
	readonly onBack: () => void;
	readonly onContinue: () => void;
	readonly onInstall: () => void;
	readonly installPlanResult: InstallPlanResult;
};

export default function ReviewSummary({
	onBack,
	onContinue,
	onInstall,
	installPlanResult
}: ReviewSummaryProps) {
	const l10n = useLocaleContext()?.reviewSummary;
	const actionBarL10n = useLocaleContext()?.actionBar;
	const indexingLock = useIndexingLock();
	const dispatch = useAppDispatch();
	const selectedPackages = useSelectedPackages();
	const {groups, culprits, conflictingPackage, failure} =
		useDependencyGroups(selectedPackages);

	// Use the install plan passed from parent (shared between ReviewSummary and LicenseAcceptPage)
	const {plan} = installPlanResult;
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

	const handleContinue = () => {
		const {loading: planLoading} = installPlanResult;

		// Optimization: if plan has FINISHED loading and no licenses need acceptance,
		// skip the license page entirely and install directly
		if (
			!planLoading &&
			plan &&
			plan.requiresLicenseAcceptance.length === 0
		) {
			void dispatch(
				installPackages({
					packages: plan.toInstall,
					options: {
						acceptLicense: true
					}
				})
			);
			onInstall();
		} else {
			// Plan is still loading, has licenses to review, or errored.
			// In all cases, go to license page which will handle these states.
			onContinue();
		}
	};

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
								<SegmentedControls
									dataTest='review-summary:expand-collapse'
									ariaLabel={l10n?.title}
									options={[
										{
											key: 'expand-all',
											content: <ExpandAllIcon />,
											tooltip: l10n?.expandAllTooltip ?? 'Expand',
											ariaLabel: l10n?.expandAllTooltip ?? 'Expand',
											disabled: isResolving || allExpanded,
											onClick: expandAll
										},
										{
											key: 'collapse-all',
											content: <CollapseAllIcon />,
											tooltip: l10n?.collapseAllTooltip ?? 'Collapse',
											ariaLabel:
												l10n?.collapseAllTooltip ?? 'Collapse',
											disabled: isResolving || allCollapsed,
											onClick: collapseAll
										}
									]}
								/>
							</div>
						</div>
					</div>
					{failure === undefined ? null : (
						<ConflictNotice culprits={culprits} failure={failure} />
					)}

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
								conflictingPackage={conflictingPackage}
								expandedKeys={expandedKeys}
								onToggle={handleToggle}
							/>
						))}
					</div>
				</div>
			</div>
			<ActionBar
				dataTest='review-action-bar'
				secondaryAction={{
					label: actionBarL10n?.back ?? '',
					onClick: onBack
				}}
				primaryAction={{
					label: actionBarL10n?.continue ?? '',
					onClick: handleContinue,
					disabled:
						isResolving ||
						failure !== undefined ||
						indexingLock !== undefined,
					disabledReason: indexingLock
				}}
			/>
		</div>
	);
}
