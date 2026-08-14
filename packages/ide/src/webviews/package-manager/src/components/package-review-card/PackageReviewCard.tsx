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

import type {CfsPackageReference} from 'cfs-package-manager';
import {
	CompletedIcon,
	ProgressRing,
	WarningIcon
} from 'cfs-react-library';
import styles from './package-review-card.module.scss';
import RightArrow from '@common/icons/RightArrow';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {useMessenger} from '../../../../common/contexts/MessengerContext';
import {openLicensePreviewRequest} from '@constants/messages/package-manager-messages';
import {
	useDetails,
	usePackageList
} from '../../state/slices/packages/packages.selector';
import {buildPackageReference} from '../../state/slices/packages/packages.reducer';
import {formatCachedVersions, isUpdateAvailable} from '../../utils';

type PackageReviewCardProps = {
	readonly reference: CfsPackageReference;
	/** The package's dependencies, summarised as an inline name/version list. */
	readonly dependencies: CfsPackageReference[];
	/** True while the dependency closure is still being resolved. */
	readonly isDependenciesLoading: boolean;
	/** Called when a dependency's title is clicked, to focus its dependency card. */
	readonly onDependencyClick: (
		dependency: CfsPackageReference,
		index: number
	) => void;
};

export default function PackageReviewCard({
	reference,
	dependencies,
	isDependenciesLoading,
	onDependencyClick
}: PackageReviewCardProps) {
	const locale = useLocaleContext();
	const l10n = locale?.packageCard;
	const reviewL10n = locale?.reviewSummary;
	const messenger = useMessenger();
	const details = useDetails();
	const packageList = usePackageList();

	const detail =
		details[buildPackageReference(reference.name, reference.version)];
	const entry = packageList.find(e => e.name === reference.name);

	const hasUpdate =
		entry?.installedVersion !== undefined &&
		isUpdateAvailable(entry.installedVersion, reference.version);

	const handleViewLicense = async () => {
		await messenger.sendRequest(
			openLicensePreviewRequest,
			{type: 'extension'},
			{
				name: reference.name,
				version: reference.version,
				license: detail?.license ?? ''
			}
		);
	};

	const cachedVersions = entry ? formatCachedVersions(entry) : '—';

	return (
		<div className={styles.container}>
			<div className={styles.content}>
				<div className={styles.header}>
					<div className={styles.nameAndBadge}>
						<div className={styles.title}>
							<div className={styles.text}>
								{hasUpdate && <WarningIcon />} {reference.name}
							</div>
						</div>
					</div>
					<span className={styles.status}>v{reference.version}</span>
				</div>

				{detail ? (
					<div className={styles.packageInfoGrid}>
						<div className={styles.packageDetailsRow}>
							<div className={styles.rowHeader}>
								{l10n?.detail?.description}
							</div>
							<div className={styles.rowValue}>
								{detail.description}
							</div>
						</div>
						<div className={styles.packageDetailsRow}>
							<div className={styles.rowHeader}>
								{l10n?.detail?.type}
							</div>
							<div className={styles.rowValue}>
								{detail.type ?? '—'}
							</div>
						</div>
						<div className={styles.packageDetailsRow}>
							<div className={styles.rowHeader}>
								{l10n?.detail?.cfsCompatibility}
							</div>
							<div className={styles.rowValue}>
								{detail.cfsVersion}
							</div>
						</div>
						<div className={styles.packageDetailsRow}>
							<div className={styles.rowHeader}>
								{l10n?.detail?.license}
							</div>
							<div className={styles.rowValue}>
								{detail.license ?? '—'} &nbsp;
								<button
									type='button'
									className={styles.link}
									onClick={handleViewLicense}
								>
									{l10n?.detail?.viewLicense} <RightArrow />{' '}
								</button>
							</div>
						</div>
						<div className={styles.packageDetailsRow}>
							<div className={styles.rowHeader}>
								{l10n?.detail?.cachedVersions}
							</div>
							<div className={styles.rowValue}>{cachedVersions}</div>
						</div>
						<div className={styles.packageDetailsRow}>
							<div className={styles.rowHeader}>
								{l10n?.detail?.supportedSocs}
							</div>
							<div className={styles.rowValue}>
								{detail.soc?.join(', ') ?? '—'}
							</div>
						</div>
					</div>
				) : (
					<div className={styles.detailsLoading}>
						<ProgressRing position='center' />
					</div>
				)}

				<div className={styles.header}>
					<div className={styles.nameAndBadge}>
						<div className={styles.title}>
							<div className={styles.dependenciesText}>
								{reviewL10n?.packageDependencies}
							</div>
							<div className={styles.description}>
								{dependencies.length > 0
									? reviewL10n?.packageDependenciesDescription
									: null}
							</div>
						</div>
					</div>
				</div>

				{isDependenciesLoading ? (
					<div className={styles.detailsLoading}>
						<ProgressRing position='center' />
					</div>
				) : dependencies.length > 0 ? (
					<div className={styles.packageInfoGrid}>
						{dependencies.map((dep, i) => {
							const depEntry = packageList.find(
								e => e.name === dep.name
							);
							const installedVersion = depEntry?.installedVersion;
							const hasUpdate =
								installedVersion !== undefined &&
								isUpdateAvailable(installedVersion, dep.version);
							const rowKey = `${buildPackageReference(
								dep.name,
								dep.version
							)}-${i}`;

							return (
								<div
									key={rowKey}
									className={styles.packageDetailsRow}
								>
									<button
										type='button'
										className={`${styles.rowHeader} ${styles.dependencyTitle}`}
										onClick={() => {
											onDependencyClick(dep, i);
										}}
									>
										{dep.name}
									</button>
									<div className={styles.rowValue}>
										{hasUpdate
											? (l10n?.versionUpdateRequired?.replace(
													'{version}',
													`v${dep.version}`
												) ?? `v${dep.version} (Update Required)`)
											: `v${dep.version}`}
									</div>
									{installedVersion !== undefined && (
										<div className={styles.rowStatus}>
											{l10n?.status?.installed?.replace(
												'{version}',
												`v${installedVersion}`
											) ?? `v${installedVersion} Installed`}{' '}
											<CompletedIcon />
										</div>
									)}
								</div>
							);
						})}
					</div>
				) : (
					<div className={styles.rowValue}>
						{reviewL10n?.noDependencies ?? 'No dependencies.'}
					</div>
				)}
			</div>
		</div>
	);
}
