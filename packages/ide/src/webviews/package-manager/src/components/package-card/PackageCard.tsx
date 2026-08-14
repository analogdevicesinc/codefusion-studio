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

import {
	Button,
	CheckBox,
	CompletedIcon,
	ConflictIcon,
	DeleteIcon,
	DropDown,
	ProgressRing,
	Tooltip,
	WarningIcon
} from 'cfs-react-library';
import ChevronRight from '../../../../common/icons/ChevronRight';
import HmcBadge from '../ui-fragments/HmcBadge';
import styles from './package-card.module.scss';
import {useEffect, useRef, useState} from 'react';
import RightArrow from '../../../../common/icons/RightArrow';
import {
	useLocaleContext,
	type TLocaleContext
} from '@common/contexts/LocaleContext';
import type {
	CfsPackage,
	CfsPackageReference
} from 'cfs-package-manager';
import type {RequestType} from 'vscode-messenger-common';
import type {PackageListEntry} from '@constants/messages/package-manager-messages';
import {useAppDispatch} from '../../state/store';
import {
	setPackageSelected,
	changeSelectedVersion,
	fetchPageDetails,
	buildPackageReference,
	uninstallPackages
} from '../../state/slices/packages/packages.reducer';
import {
	useDetailsError,
	useSelectedPackages,
	useSelectedVersion
} from '../../state/slices/packages/packages.selector';
import {
	compareVersions,
	formatCachedVersions,
	getDefaultVersion,
	isUpdateAvailable,
	satisfiesAll
} from '../../utils';
import {useMessenger} from '../../../../common/contexts/MessengerContext';
import UninstallPackageModal from '../uninstall-package-modal/UninstallPackageModal';
import {
	openLicensePreviewRequest,
	getPackageDependentsRequest,
	getPreferenceRequest,
	setPreferenceRequest,
	HIDE_UNINSTALL_CONFIRMATION_KEY
} from '@constants/messages/package-manager-messages';
import ToolIcon from '../../../../common/icons/Tool';
import {LocalizedMessage} from '../../../../common/components/l10n/LocalizedMessage';

// Type-assert to resolve ESLint inference issues with newly-added exports
const getPreferenceReq = getPreferenceRequest as RequestType<
	{key: string},
	boolean
>;
const setPreferenceReq = setPreferenceRequest as RequestType<
	{key: string; value: boolean},
	void
>;
const getDependentsReq = getPackageDependentsRequest as RequestType<
	{reference: CfsPackageReference},
	CfsPackageReference[]
>;

/**
 * A required package whose selected version falls outside its workspace
 * constraints. Non-required packages are never out of range.
 */
export const isVersionOutOfRange = (
	entry: PackageListEntry,
	version: string
): boolean => {
	const {isRequired, requiredVersions} = entry;

	if (
		!isRequired ||
		!requiredVersions ||
		requiredVersions.length === 0
	)
		return false;

	return !satisfiesAll(version, requiredVersions);
};

/**
 * True when a selected package is pinned to the version that is already
 * installed as installing it would be a no-op, so it is flagged as an error.
 */
const isInstalledVersionChosen = (
	installedVersion: string | undefined,
	currentVersion: string,
	isSelected: boolean
): boolean =>
	isSelected &&
	installedVersion !== undefined &&
	currentVersion === installedVersion;

type PackageCardProps = {
	readonly entry: PackageListEntry;
	readonly details: Record<string, CfsPackage>;
};

type UninstallModalState = {
	readonly isOpen: boolean;
	readonly dependents?: CfsPackageReference[];
};

type PackageDetailsProps = {
	readonly entry: PackageListEntry;
	readonly detail: CfsPackage | undefined;
	readonly hasDetailsError: boolean;
	readonly l10n: TLocaleContext['packageCard'];
	readonly onViewLicense: () => void;
};

const MAX_NAME_LENGTH = 20;

function computeRequiredRange(
	versions: string[],
	requiredVersions: string[] | undefined
): {min: string; max: string} | undefined {
	if (!requiredVersions || requiredVersions.length === 0)
		return undefined;
	const satisfying = versions.filter(v =>
		satisfiesAll(v, requiredVersions)
	);
	if (satisfying.length === 0) return undefined;

	return {min: satisfying[satisfying.length - 1], max: satisfying[0]};
}

function getVersionLabel(
	v: string,
	installedVersion: string | undefined,
	latestVersion: string | undefined,
	l10n: TLocaleContext['packageCard']
): string {
	if (installedVersion === v) {
		return (
			l10n?.versionInstalled?.replace('{version}', `v${v}`) ?? `v${v}`
		);
	}

	if (latestVersion === v) {
		return (
			l10n?.versionLatest?.replace('{version}', `v${v}`) ?? `v${v}`
		);
	}

	return `v${v}`;
}

type PackageActionButtonProps = {
	readonly isBuiltIn: boolean | undefined;
	readonly l10n: TLocaleContext['packageCard'];
	readonly onDelete: () => void;
};

function PackageActionButton({
	isBuiltIn,
	l10n,
	onDelete
}: PackageActionButtonProps) {
	return (
		<Tooltip
			title={
				isBuiltIn
					? l10n?.builtinPackageTooltip
					: l10n?.uninstallPackageTooltip
			}
			position='top'
			type='short'
		>
			<Button
				appearance='icon'
				onClick={isBuiltIn ? undefined : onDelete}
			>
				{isBuiltIn ? <ToolIcon /> : <DeleteIcon />}
			</Button>
		</Tooltip>
	);
}

function PackageDetails({
	entry,
	detail,
	hasDetailsError,
	l10n,
	onViewLicense
}: PackageDetailsProps) {
	if (!detail) {
		if (hasDetailsError) {
			return (
				<div className={styles.packageDetailsRow}>
					<div className={styles.rowValue}>
						{l10n?.detailsError ?? 'Failed to load package details.'}
					</div>
				</div>
			);
		}

		return (
			<div className={styles.detailsLoading}>
				<ProgressRing position='center' />
			</div>
		);
	}

	const cachedVersions = formatCachedVersions(entry);

	return (
		<>
			<div className={styles.packageDetailsRow}>
				<div className={styles.rowHeader}>
					{l10n?.detail?.description}
				</div>
				<div className={styles.rowValue}>{detail.description}</div>
			</div>
			<div className={styles.packageDetailsRow}>
				<div className={styles.rowHeader}>{l10n?.detail?.type}</div>
				<div className={styles.rowValue}>{detail.type ?? '—'}</div>
			</div>
			<div className={styles.packageDetailsRow}>
				<div className={styles.rowHeader}>
					{l10n?.detail?.cfsCompatibility}
				</div>
				<div className={styles.rowValue}>{detail.cfsVersion}</div>
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
						onClick={onViewLicense}
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
		</>
	);
}

function PackageStatus({
	entry,
	isExpanded,
	onDelete,
	onExpand
}: {
	readonly entry: PackageListEntry;
	readonly isExpanded: boolean;
	readonly onDelete: () => void;
	readonly onExpand: () => void;
}) {
	const l10n = useLocaleContext()?.packageCard;
	const installedVersion = entry.installedVersion ?? '';

	const getStatusMessageId = () => {
		if (entry.builtIn) {
			return 'packageCard.versionBuiltin';
		}

		switch (entry.state) {
			case 'installed':
				return 'packageCard.status.installed';
			case 'installing':
				return 'packageCard.status.installing';
			case 'not-installed':
				return 'packageCard.status.notInstalled';
			case 'installation-failed':
				return 'packageCard.status.installationFailed';
			default:
				return undefined;
		}
	};

	const getStatusIcon = () => {
		switch (entry.state) {
			case 'installed':
				return <CompletedIcon />;
			case 'installing':
				return (
					<ProgressRing
						position='center'
						size={16}
						className={styles.loadingIcon}
					/>
				);
			case 'not-installed':
				return null;
			case 'installation-failed':
				return <ConflictIcon className={styles.errorIcon} />;
			default:
				return null;
		}
	};

	const statusMessageId = getStatusMessageId();

	return (
		<div className={styles.status}>
			<div className={styles.version}>
				{statusMessageId && (
					<>
						<LocalizedMessage
							id={statusMessageId}
							params={{version: `v${installedVersion}`}}
						/>
						{getStatusIcon()}
					</>
				)}
			</div>
			<div className={styles.version}>
				{entry.installedVersion !== undefined &&
					entry.state !== 'installing' && (
						<PackageActionButton
							isBuiltIn={entry.builtIn}
							l10n={l10n}
							onDelete={onDelete}
						/>
					)}
				<Button appearance='icon' onClick={onExpand}>
					<ChevronRight
						className={
							isExpanded ? styles.chevronUp : styles.chevronDown
						}
					/>
				</Button>
			</div>
		</div>
	);
}

// eslint-disable-next-line complexity
export default function PackageCard({
	entry,
	details
}: PackageCardProps) {
	const l10n = useLocaleContext()?.packageCard;
	const messenger = useMessenger();
	const dispatch = useAppDispatch();
	const selected = useSelectedPackages();
	const detailsError = useDetailsError();

	// Versions, latest first.
	const versions = [...entry.versions].sort((a, b) =>
		compareVersions(b, a)
	);
	const latestVersion = versions[0];
	const {installedVersion, requiredVersions} = entry;

	const requiredRange = computeRequiredRange(
		versions,
		requiredVersions
	);
	const defaultVersion = getDefaultVersion(entry);

	// The version chosen in the store, or the default if untouched.
	const selectedVersion = useSelectedVersion(entry.name);
	const currentVersion = selectedVersion ?? defaultVersion;

	const versionOutOfRange = isVersionOutOfRange(
		entry,
		currentVersion
	);

	const [expanded, setExpanded] = useState(false);
	const [uninstallModalState, setUninstallModalState] =
		useState<UninstallModalState>({
			isOpen: false,
			dependents: undefined
		});

	// Refs already requested by this card's lazy-fetch effect.
	const requestedRefs = useRef(new Set<string>());

	const packageName = entry.name;
	const isTruncated = packageName.length > MAX_NAME_LENGTH;
	const displayName = isTruncated
		? `${packageName.slice(0, MAX_NAME_LENGTH)}…`
		: packageName;

	const installedReference: CfsPackageReference | undefined =
		installedVersion === undefined
			? undefined
			: {name: entry.name, version: installedVersion};
	const hasUpdate =
		installedVersion !== undefined &&
		latestVersion !== undefined &&
		isUpdateAvailable(installedVersion, latestVersion);

	const selectedReference = {
		name: entry.name,
		version: currentVersion
	};

	const isSelected = selected.some(s => s.name === entry.name);

	// Selecting the exact version that is already installed would be a no-op
	// install, so flag it and require a different version (or deselecting).
	const isInstalledVersionSelected = isInstalledVersionChosen(
		installedVersion,
		currentVersion,
		isSelected
	);

	// Detailed metadata for the selected version (undefined while loading).
	const detail: CfsPackage | undefined =
		details[buildPackageReference(entry.name, currentVersion)];

	/*
	 * The page batch only prefetches the default version. If the user selects
	 * a different version whose details are not cached yet, fetch it lazily.
	 */
	useEffect(() => {
		if (currentVersion === '' || currentVersion === defaultVersion) {
			return;
		}

		const key = buildPackageReference(entry.name, currentVersion);

		if (details[key] || requestedRefs.current.has(key)) {
			return;
		}

		requestedRefs.current.add(key);

		// Clear on settle so a failed fetch retries on the next render.
		void dispatch(
			fetchPageDetails([{name: entry.name, version: currentVersion}])
		).finally(() => {
			requestedRefs.current.delete(key);
		});
	}, [dispatch, entry.name, currentVersion, defaultVersion, details]);

	const toggleExpand = () => {
		setExpanded(!expanded);
	};

	const handleDeleteClick = () => {
		const openOrSkip = async () => {
			if (!installedReference) {
				return;
			}

			const [hideModal, dependents] = await Promise.all([
				messenger.sendRequest(
					getPreferenceReq,
					{type: 'extension'},
					{key: HIDE_UNINSTALL_CONFIRMATION_KEY}
				),
				messenger.sendRequest(
					getDependentsReq,
					{type: 'extension'},
					{reference: installedReference}
				)
			]);

			// Uninstall immediately if the user has opted out of the confirmation
			// and there are no dependents; otherwise show the modal.
			if (hideModal && dependents.length === 0) {
				void dispatch(uninstallPackages({names: [entry.name]}));

				return;
			}

			setUninstallModalState({isOpen: true, dependents});
		};

		void openOrSkip().catch(error => {
			console.error(
				'Failed to determine whether to show uninstall confirmation',
				error
			);
		});
	};

	const handleUninstall = (hideConfirmation: boolean) => {
		if (hideConfirmation) {
			// Persist the "don't show again" preference.
			void messenger.sendRequest(
				setPreferenceReq,
				{type: 'extension'},
				{key: HIDE_UNINSTALL_CONFIRMATION_KEY, value: true}
			);
		}

		void dispatch(uninstallPackages({names: [entry.name]}));

		setUninstallModalState({isOpen: false, dependents: undefined});
	};

	const handleSelectPackage = () => {
		dispatch(
			setPackageSelected({
				pkg: selectedReference,
				selected: !isSelected
			})
		);
	};

	const handleVersionChange = (version: string) => {
		dispatch(
			changeSelectedVersion({
				name: entry.name,
				newVersion: version
			})
		);
	};

	const getVersionOptions = () =>
		versions.map(v => ({
			id: v,
			value: v,
			label: getVersionLabel(v, installedVersion, latestVersion, l10n)
		}));

	const versionOptions = getVersionOptions();

	// VSCodeDropdown caches the selected option's label at mount and
	// ignores later label changes for the same value (e.g. a version's
	// label switches from plain to "(installed)" once install
	// completes). Keying on the active option forces a remount so the
	// displayed label stays in sync.
	const activeVersionLabel =
		versionOptions.find(option => option.value === currentVersion)
			?.label ?? '';

	const handleViewLicense = async () => {
		await messenger.sendRequest(
			openLicensePreviewRequest,
			{type: 'extension'},
			{
				name: packageName,
				version: currentVersion,
				license: detail?.license ?? ''
			}
		);
	};

	return (
		<div
			className={`${styles.container} ${
				isSelected ? styles.active : ''
			}`}
		>
			<div className={styles.cardCheckboxContainer}>
				<CheckBox
					key={`${currentVersion}-${isSelected}`}
					checked={isSelected}
					className={
						isInstalledVersionSelected
							? styles.checkboxError
							: undefined
					}
					onClick={handleSelectPackage}
				/>
			</div>
			<div className={styles.cardContent}>
				<div className={styles.cardHeader}>
					<div className={styles.nameAndBadge}>
						<div className={styles.nameContainer}>
							{(entry.isRequired || hasUpdate) && <WarningIcon />}
							{isTruncated ? (
								<Tooltip
									title={packageName}
									position='top'
									type='short'
								>
									<span className={styles.packageName}>
										{displayName}
									</span>
								</Tooltip>
							) : (
								<span className={styles.packageName}>
									{displayName}
								</span>
							)}
						</div>
						{hasUpdate && (
							<HmcBadge>{l10n?.updateAvailable}</HmcBadge>
						)}
					</div>
					<PackageStatus
						entry={entry}
						isExpanded={expanded}
						onDelete={handleDeleteClick}
						onExpand={toggleExpand}
					/>
				</div>
				<div className={styles.versionSelection}>
					<DropDown
						key={`${currentVersion}::${activeVersionLabel}`}
						className={styles.versionDropdown}
						currentControlValue={currentVersion}
						controlId='1'
						options={versionOptions}
						error={versionOutOfRange || isInstalledVersionSelected}
						onHandleDropdown={handleVersionChange}
					/>
					{requiredRange && (
						<span className={styles.requiredVersion}>
							{requiredRange.min === requiredRange.max ? (
								<LocalizedMessage
									id='packageCard.versionSingleRequired'
									params={{
										version: `v${requiredRange.min}`
									}}
								/>
							) : (
								<LocalizedMessage
									id='packageCard.versionRangeRequired'
									params={{
										min: `v${requiredRange.min}`,
										max: `v${requiredRange.max}`
									}}
								/>
							)}
						</span>
					)}
				</div>
				{versionOutOfRange && (
					<div className={styles.errorMessage}>
						{l10n?.versionOutOfRange ??
							'Selected version is outside of the recommended range.'}
					</div>
				)}
				{isInstalledVersionSelected && (
					<div className={styles.errorMessage}>
						{l10n?.versionAlreadyInstalled ??
							'This version is already installed. Select a different version to continue.'}
					</div>
				)}

				{expanded && (
					<div className={styles.packageDetailsCard}>
						<PackageDetails
							entry={entry}
							detail={detail}
							hasDetailsError={Boolean(detailsError)}
							l10n={l10n}
							onViewLicense={handleViewLicense}
						/>
					</div>
				)}
			</div>
			<UninstallPackageModal
				isOpen={uninstallModalState.isOpen}
				packages={installedReference ? [installedReference] : []}
				dependents={uninstallModalState.dependents}
				onClose={() => {
					setUninstallModalState({
						isOpen: false,
						dependents: undefined
					});
				}}
				onConfirm={handleUninstall}
			/>
		</div>
	);
}
