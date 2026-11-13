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

import {useEffect, useRef, useState} from 'react';
import {
	ProgressRing,
	CompletedIcon,
	FilledCircledCheckmarkIcon,
	InfoIcon
} from 'cfs-react-library';
import styles from './license-page.module.scss';
import AccordionList, {
	AccordionItem
} from '@common/components/accordion-list/AccordionList';
import ActionBar from '../action-bar/ActionBar';
import {useIndexingLock} from '../../hooks/useIndexingLock';
import LicenseComponent from '../license-component/LicenseComponent';
import {type InstallPlanResult} from '../../hooks/useInstallPlan';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {
	buildPackageReference,
	installPackages
} from '../../state/slices/packages/packages.reducer';
import {useAppDispatch} from '../../state/store';

type LicenseAcceptPageProps = {
	readonly onBack: () => void;
	readonly onAcceptAndInstall: () => void;
	readonly installPlanResult: InstallPlanResult;
};

/**
 * True once every package in the install set has been opened by the user.
 */
function isInstallSetFullyReviewed(
	installSetLength: number,
	reviewed: Set<string>
): boolean {
	return installSetLength > 0 && reviewed.size === installSetLength;
}

export default function LicenseAcceptPage({
	onBack,
	onAcceptAndInstall,
	installPlanResult
}: LicenseAcceptPageProps) {
	const l10n = useLocaleContext()?.license;
	const actionBarL10n = useLocaleContext()?.actionBar;
	const indexingLock = useIndexingLock();
	const dispatch = useAppDispatch();

	// Use the install plan passed from parent (shared with ReviewSummary)
	const {
		plan,
		loading: planLoading,
		error: planError
	} = installPlanResult;

	// Use the license information directly from the plan (already includes license text)
	const packagesRequiringLicense =
		plan?.requiresLicenseAcceptance ?? [];

	const [activeId, setActiveId] = useState(
		packagesRequiringLicense[0]
			? buildPackageReference(
					packagesRequiringLicense[0].reference.name,
					packagesRequiringLicense[0].reference.version
				)
			: ''
	);

	const [reviewed, setReviewed] = useState<Set<string>>(
		() => new Set(activeId ? [activeId] : [])
	);

	const activeLicenseInfo = packagesRequiringLicense.find(
		info =>
			buildPackageReference(
				info.reference.name,
				info.reference.version
			) === activeId
	);

	const allReviewed = isInstallSetFullyReviewed(
		packagesRequiringLicense.length,
		reviewed
	);

	// Auto-install when plan loads with no licenses requiring acceptance
	// ONLY proceed if there are no errors (planError from useInstallPlan handles timeout too)
	// Waits while custom remotes are indexed, like the install buttons.
	// Runs once: installing re-renders the parent, which recreates
	// onAcceptAndInstall and would otherwise rerun this effect.
	const autoInstalled = useRef(false);
	useEffect(() => {
		if (
			!autoInstalled.current &&
			plan &&
			plan.requiresLicenseAcceptance.length === 0 &&
			!planError &&
			indexingLock === undefined
		) {
			autoInstalled.current = true;
			// Handle empty install (all packages already installed) - just transition without dispatching
			if (plan.toInstall.length === 0) {
				onAcceptAndInstall();
				return;
			}

			void dispatch(
				installPackages({
					packages: plan.toInstall,
					options: {
						acceptLicense: true
					}
				})
			);
			onAcceptAndInstall();
		}
	}, [plan, planError, indexingLock, dispatch, onAcceptAndInstall]);

	// Set the first package as active when packages load
	useEffect(() => {
		if (
			packagesRequiringLicense.length > 0 &&
			!activeId &&
			packagesRequiringLicense[0]
		) {
			const firstId = buildPackageReference(
				packagesRequiringLicense[0].reference.name,
				packagesRequiringLicense[0].reference.version
			);
			setActiveId(firstId);
			setReviewed(new Set([firstId]));
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [packagesRequiringLicense.length, activeId]);

	const resolvedLicenseName = activeLicenseInfo?.license ?? '';

	const licenseContent =
		activeLicenseInfo?.licenseText ??
		l10n?.fallbackLicenseText?.replace(
			'{license}',
			resolvedLicenseName
		) ??
		`This package uses the ${resolvedLicenseName} license.`;

	const handleAcceptAndInstall = () => {
		if (!plan) return;

		// Handle empty install (all packages already installed) - just transition without dispatching
		if (plan.toInstall.length === 0) {
			onAcceptAndInstall();
			return;
		}

		void dispatch(
			installPackages({
				packages: plan.toInstall,
				options: {
					acceptLicense: true
				}
			})
		);
		onAcceptAndInstall();
	};

	// Show loading state while gathering package information
	if (planLoading) {
		return (
			<div className={styles.outerFrame}>
				<div className={styles.main}>
					<div className={styles.loadingContainer}>
						<ProgressRing position='center' />
						<span className={styles.loadingMessage}>
							{l10n?.gatheringPackageInfo ??
								'Gathering package information for installation'}
						</span>
					</div>
				</div>
				<ActionBar
					secondaryAction={{
						label: actionBarL10n?.back ?? '',
						onClick: onBack
					}}
				/>
			</div>
		);
	}

	// Show error state if plan fetch failed (including timeouts)
	if (planError) {
		return (
			<div className={styles.outerFrame}>
				<div className={styles.main}>
					<div className={styles.loadingContainer}>
						<span className={styles.errorMessage}>
							{l10n?.planFetchError ??
								'Unable to load license information.'}
						</span>
					</div>
				</div>
				<ActionBar
					secondaryAction={{
						label: actionBarL10n?.back ?? '',
						onClick: onBack
					}}
				/>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.sidebar}>
				<AccordionList
					title={l10n?.sidebarTitle ?? 'Licenses'}
					caption={
						l10n?.reviewedCount
							?.replace('{reviewed}', String(reviewed.size))
							?.replace(
								'{total}',
								String(packagesRequiringLicense.length)
							) ??
						`${reviewed.size} of ${packagesRequiringLicense.length} reviewed`
					}
					className={styles.accordionContainer}
				>
					{packagesRequiringLicense.map(info => {
						const id = buildPackageReference(
							info.reference.name,
							info.reference.version
						);

						return (
							<AccordionItem
								key={id}
								active={activeId === id}
								subTitle={`${info.reference.name} v${info.reference.version}`}
								icon={
									reviewed.has(id) ? (
										<FilledCircledCheckmarkIcon
											className={styles.viewedIcon}
										/>
									) : (
										<CompletedIcon className={styles.notViewedIcon} />
									)
								}
								onClick={() => {
									setActiveId(id);
									setReviewed(prev => new Set(prev).add(id));
								}}
							>
								{info.license}
							</AccordionItem>
						);
					})}
				</AccordionList>
				<div className={styles.inlineMessage}>
					<InfoIcon
						className={styles.infoIcon}
						aria-hidden='true'
						focusable='false'
					/>
					{l10n?.sidebarInfo ??
						'View each license to enable installation.'}
				</div>
			</div>
			<div className={styles.outerFrame}>
				<div className={styles.main}>
					<div className={styles.mainContainer}>
						<div className={styles.mainInnerContainer}>
							<LicenseComponent
								title={l10n?.reviewLicensesTitle ?? ''}
								name={resolvedLicenseName}
								target={
									activeLicenseInfo
										? `${activeLicenseInfo.reference.name} ${activeLicenseInfo.reference.version}`
										: ''
								}
								isLoading={false}
								licenseContent={licenseContent}
							/>
						</div>
					</div>
				</div>
				<ActionBar
					dataTest='license-action-bar'
					secondaryAction={{
						label: actionBarL10n?.back ?? '',
						onClick: onBack
					}}
					primaryAction={{
						label: actionBarL10n?.acceptLicense ?? '',
						disabled: !allReviewed || indexingLock !== undefined,
						disabledReason: indexingLock,
						onClick: handleAcceptAndInstall
					}}
				/>
			</div>
		</div>
	);
}
