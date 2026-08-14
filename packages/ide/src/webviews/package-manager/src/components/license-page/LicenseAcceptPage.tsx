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

import {useState} from 'react';
import type {CfsPackageReference} from 'cfs-package-manager';
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
import LicenseComponent from '../license-component/LicenseComponent';
import {
	useLicenseMap,
	type LicenseDataState
} from '../license-component/useLicenseData';
import {useInstallSet} from '../../hooks/useInstallSet';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useSelectedPackages} from '../../state/slices/packages/packages.selector';
import {
	buildPackageReference,
	installPackages
} from '../../state/slices/packages/packages.reducer';
import {useAppDispatch} from '../../state/store';

type LicenseAcceptPageProps = {
	readonly onBack: () => void;
	readonly onAcceptAndInstall: () => void;
};

/**
 * True until the install set is resolved and every package in it has its
 * license data fetched.
 */
function areLicensesLoading(
	installSetLoading: boolean,
	installSet: CfsPackageReference[],
	getLicense: (
		packageName: string,
		packageVersion: string
	) => LicenseDataState
): boolean {
	if (installSetLoading) {
		return true;
	}

	return installSet.some(
		pkg => getLicense(pkg.name, pkg.version).loading
	);
}

/**
 * The backend installs every package in the install set (selected packages + dependencies) with the same acceptLicense flag.
 * An error in any of them must block installation rather than being treated as accepted.
 */
function hasAnyLicenseError(
	installSet: CfsPackageReference[],
	getLicense: (
		packageName: string,
		packageVersion: string
	) => LicenseDataState
): boolean {
	return installSet.some(
		pkg => getLicense(pkg.name, pkg.version).error !== undefined
	);
}

/**
 * True once every package in the install set has been opened by the user and
 * nothing (license fetch, or dependency resolution for the install set
 * itself) failed along the way.
 */
function isInstallSetFullyReviewed(
	installSet: CfsPackageReference[],
	reviewed: Set<string>,
	licensesLoading: boolean,
	hasBlockingErrors: boolean
): boolean {
	return (
		!licensesLoading &&
		installSet.length > 0 &&
		reviewed.size === installSet.length &&
		!hasBlockingErrors
	);
}

export default function LicenseAcceptPage({
	onBack,
	onAcceptAndInstall
}: LicenseAcceptPageProps) {
	const l10n = useLocaleContext()?.license;
	const actionBarL10n = useLocaleContext()?.actionBar;
	const selectedPackages = useSelectedPackages();
	const dispatch = useAppDispatch();

	// The backend installs dependencies alongside the selected packages, so
	// every dependency license it will silently accept must be reviewed too.
	const {
		packages: installSet,
		loading: installSetLoading,
		error: installSetError
	} = useInstallSet(selectedPackages);

	const [activeId, setActiveId] = useState(
		installSet[0]
			? buildPackageReference(
					installSet[0].name,
					installSet[0].version
				)
			: ''
	);

	const [reviewed, setReviewed] = useState<Set<string>>(
		() => new Set(activeId ? [activeId] : [])
	);

	const activePkg =
		installSet.find(
			pkg => buildPackageReference(pkg.name, pkg.version) === activeId
		) ?? installSet[0];

	const {getLicense} = useLicenseMap(installSet);
	const {licenseData, error, loading} = getLicense(
		activePkg?.name ?? '',
		activePkg?.version ?? ''
	);

	const licensesLoading = areLicensesLoading(
		installSetLoading,
		installSet,
		getLicense
	);

	const hasBlockingErrors =
		installSetError || hasAnyLicenseError(installSet, getLicense);

	const allReviewed = isInstallSetFullyReviewed(
		installSet,
		reviewed,
		licensesLoading,
		hasBlockingErrors
	);

	const resolvedLicenseName = licenseData?.licenseId ?? '';

	const licenseContent =
		error ??
		licenseData?.licenseText ??
		l10n?.fallbackLicenseText?.replace(
			'{license}',
			resolvedLicenseName
		) ??
		`This package uses the ${resolvedLicenseName} license.`;

	const handleAcceptAndInstall = () => {
		if (hasBlockingErrors) return;

		void dispatch(
			installPackages({
				packages: installSet,
				options: {
					acceptLicense: true
				}
			})
		);
		onAcceptAndInstall();
	};

	return (
		<div className={styles.container}>
			<div className={styles.sidebar}>
				<AccordionList
					title={l10n?.sidebarTitle ?? 'Licenses'}
					caption={
						licensesLoading
							? undefined
							: (l10n?.reviewedCount
									?.replace('{reviewed}', String(reviewed.size))
									?.replace('{total}', String(installSet.length)) ??
								`${reviewed.size} of ${installSet.length} reviewed`)
					}
					className={styles.accordionContainer}
				>
					{licensesLoading ? (
						<div className={styles.accordionLoading}>
							<ProgressRing position='center' />
						</div>
					) : (
						installSet.map(pkg => {
							const id = buildPackageReference(pkg.name, pkg.version);
							const licenseName =
								getLicense(pkg.name, pkg.version).licenseData
									?.licenseId ?? pkg.name;

							return (
								<AccordionItem
									key={id}
									active={activeId === id}
									subTitle={`${pkg.name} v${pkg.version}`}
									icon={
										reviewed.has(id) ? (
											<FilledCircledCheckmarkIcon
												className={styles.viewedIcon}
											/>
										) : (
											<CompletedIcon
												className={styles.notViewedIcon}
											/>
										)
									}
									onClick={() => {
										setActiveId(id);
										setReviewed(prev => new Set(prev).add(id));
									}}
								>
									{licenseName}
								</AccordionItem>
							);
						})
					)}
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
									activePkg
										? `${activePkg.name} ${activePkg.version}`
										: ''
								}
								isLoading={loading}
								licenseContent={licenseContent}
							/>
						</div>
					</div>
				</div>
				<ActionBar
					secondaryAction={{
						label: actionBarL10n?.back ?? '',
						onClick: onBack
					}}
					primaryAction={{
						label: actionBarL10n?.acceptLicense ?? '',
						disabled: !allReviewed,
						onClick: handleAcceptAndInstall
					}}
				/>
			</div>
		</div>
	);
}
