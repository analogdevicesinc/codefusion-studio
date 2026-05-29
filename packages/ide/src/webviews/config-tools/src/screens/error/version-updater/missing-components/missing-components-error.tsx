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
import {memo, useCallback, useEffect, useMemo, useState} from 'react';
import styles from '../../error.module.scss';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import ConflictIcon from '@common/icons/Conflict';
import type {TLocaleContext} from '@common/types/l10n';
import {localizeMessage} from '@common/utils/localization';
import UpdateResolutionCard from '../update-resolution-card/update-resolution-card';
import EightColumnLayout from '../../../../components/eight-column-layout/EightColumnLayout';
import {Button} from 'cfs-react-library';
import {installPackage} from '../../../../utils/api';
import {configureStore} from '@reduxjs/toolkit';
import {Provider} from 'react-redux';
import type {CfsPackageReference} from 'cfs-package-manager';
import semver from 'semver';
import {
	filterLatestCompatiblePackageForGivenComponentVersion,
	filterPackagesForGivenComponentVersion,
	formatVersionForDisplay,
	getLatestCompatible,
	searchRemotePackagesForComponents,
	updateVersionInCfsConfigFile
} from '../../../../utils/version-update';
import {documentReload} from '@common/api';
import type {
	CfsMissingComponent,
	CfsUpdateResolution,
	CfsUpdateResolutionType
} from 'cfs-types';

const UPDATE_PROGRESS_TITLE = 'Applying Selected Updates';
const UPDATE_PROGRESS_SUBTITLE =
	'Please do not close or navigate away until all selections have been validated.';

export type CfsUpdateStatus = {
	componentId: string;
	success: boolean;
	error?: string;
};

type ComponentResolutionState = {
	component: CfsMissingComponent;
	resolution: CfsUpdateResolutionType;
	allowFutureCompatibleVersion: boolean;
	latestRemoteVersion?: {
		componentVersion: string;
		packageReference: CfsPackageReference;
	};
	requiredVersion?: {
		componentVersion: string;
		packageReference: CfsPackageReference;
	};
	latestLocalCompatibleComponentVersion?: string;
};

type MissingComponentsErrorProps = Readonly<{
	components: CfsMissingComponent[];
}>;

export type UpdateResolutionStatusType =
	| 'LOADING_RESOLUTIONS'
	| 'UPDATE_IN_PROGRESS'
	| 'UPDATE_FAILED'
	| 'UPDATE_COMPLETED';

export type DropDownOptionsWithVersion = {
	value: CfsUpdateResolutionType;
	label: string;
	version: string;
};

function createInitialComponentState(
	component: CfsMissingComponent
): ComponentResolutionState {
	return {
		component,
		resolution: 'INSTALL_REQUIRED_VERSION',
		allowFutureCompatibleVersion: true
	};
}

function MissingComponentsError({
	components
}: MissingComponentsErrorProps) {
	const [componentStates, setComponentStates] = useState<
		Record<string, ComponentResolutionState>
	>(() =>
		Object.fromEntries(
			components.map(c => [c.id, createInitialComponentState(c)])
		)
	);
	const dummyStore = useMemo(
		() => configureStore({reducer: (state = {}) => state}),
		[]
	);
	const [retryCounter, setRetryCounter] = useState<number>(0);
	const [isLoading, setIsLoading] = useState(true);
	const [updateStatus, setUpdateStatus] = useState<
		Record<string, CfsUpdateStatus>
	>({});

	const multipleErrors = components.length > 1;

	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.errors.missingComponents;

	const title = multipleErrors
		? `${components.length} ${i10n?.multiple.title}`
		: `${i10n?.single.title}`;

	const getComponentState = useCallback(
		(componentId: string): ComponentResolutionState =>
			componentStates[componentId] ??
			createInitialComponentState(
				components.find(c => c.id === componentId)!
			),
		[componentStates, components]
	);

	const appendDropdownOption = (
		options: DropDownOptionsWithVersion[],
		optionToAdd: DropDownOptionsWithVersion
	): DropDownOptionsWithVersion[] => {
		if (options.find(o => o.version === optionToAdd.version)) {
			return options;
		}

		options.push(optionToAdd);

		return options;
	};

	const generateResolutionOptions = (
		state: ComponentResolutionState
	): Array<{value: CfsUpdateResolutionType; label: string}> => {
		let options: DropDownOptionsWithVersion[] = [];

		const requiredVersion = semver.coerce(state.component.version);
		const effectiveRequired = requiredVersion?.version ?? null;

		const isAtLeastRequired = (v: string) =>
			!effectiveRequired || semver.gte(v, effectiveRequired);

		const hasLocalOption =
			state.latestLocalCompatibleComponentVersion &&
			isAtLeastRequired(state.latestLocalCompatibleComponentVersion);

		if (
			state.latestLocalCompatibleComponentVersion &&
			hasLocalOption
		) {
			options = appendDropdownOption(options, {
				value: 'UPDATE_CFS_FILE',
				label:
					i10n?.locallyAvailableOption.replace(
						'{version}',
						formatVersionForDisplay(
							state.latestLocalCompatibleComponentVersion
						)
					) ?? '',
				version: state.latestLocalCompatibleComponentVersion
			});
		}

		if (state.requiredVersion) {
			options = appendDropdownOption(options, {
				value: 'INSTALL_REQUIRED_VERSION',
				label:
					i10n?.requestedVersionOption?.replace(
						'{version}',
						formatVersionForDisplay(state.component.version)
					) ?? '',
				version: state.component.version
			});
		}

		if (
			state.latestRemoteVersion &&
			isAtLeastRequired(state.latestRemoteVersion.componentVersion)
		) {
			options = appendDropdownOption(options, {
				value: 'UPDATE_CFS_FILE_AND_INSTALL_LATEST_COMPATIBLE',
				label:
					i10n?.downloadableOption.replace(
						'{version}',
						formatVersionForDisplay(
							state.latestRemoteVersion.componentVersion
						)
					) ?? '',
				version: state.latestRemoteVersion.componentVersion
			});
		}

		return options.map(o => ({
			value: o.value,
			label: o.label
		}));
	};

	const getMissingComponentName = (
		component: CfsMissingComponent
	): string =>
		component.type === 'data-model'
			? [component.soc, component.id].filter(Boolean).join(' ')
			: component.id;

	const getMissingComponentDescription = (
		component: CfsMissingComponent
	): string =>
		localizeMessage(
			i10n,
			component.type === 'plugin'
				? 'errorItem.missingPluginDescription'
				: 'errorItem.missingDataModelDescription',
			{
				componentName: getMissingComponentName(component),
				componentVersion: component.version
			}
		);

	const getUpdateResolutions = (): CfsUpdateResolution[] =>
		components
			.map(component => {
				const state = getComponentState(component.id);
				const isRequired =
					state.resolution === 'INSTALL_REQUIRED_VERSION';
				const packageReferenceToUse = isRequired
					? state.requiredVersion
					: state.latestRemoteVersion;

				return {
					missingComponent: component,
					resolution: state.resolution,
					packageForUpdate: packageReferenceToUse,
					allowFutureCompatibleVersion:
						state.allowFutureCompatibleVersion,
					latestLocalCompatibleComponentVersion:
						state.latestLocalCompatibleComponentVersion
				};
			})
			.filter(r => r !== undefined);

	const updateComponentState = (
		componentId: string,
		update: Partial<Omit<ComponentResolutionState, 'component'>>
	) => {
		setComponentStates(prev => ({
			...prev,
			[componentId]: {
				...getComponentState(componentId),
				...prev[componentId],
				...update
			}
		}));
	};

	const resolutionChangeHandler =
		(component: CfsMissingComponent) => (value: string) => {
			updateComponentState(component.id, {
				resolution: value as CfsUpdateResolutionType
			});
		};

	const allowFutureVersionChangeHandler =
		(component: CfsMissingComponent) => () => {
			const current = getComponentState(component.id);
			updateComponentState(component.id, {
				allowFutureCompatibleVersion:
					!current.allowFutureCompatibleVersion
			});
		};

	const handleRetryClick = async () => {
		removeFailedUpdateStatuses();
		await handleContinueClick();
	};

	const handleContinueClick = async () => {
		setIsLoading(true);
		setRetryCounter(prev => prev + 1);

		const updateResolutions = getUpdateResolutions();
		// Do not process resolutions already resolved in the previous try
		const filteredUpdateResolutions = updateResolutions.filter(
			ur => !updateStatus[ur.missingComponent.id]?.success
		);

		//
		// Install required and install latest available versions
		//
		const allInstallationResolutions =
			filteredUpdateResolutions.filter(
				r =>
					r.resolution === 'INSTALL_REQUIRED_VERSION' ||
					r.resolution ===
						'UPDATE_CFS_FILE_AND_INSTALL_LATEST_COMPATIBLE'
			);

		let installationStatuses: CfsUpdateStatus[] = [];

		if (allInstallationResolutions.length > 0) {
			try {
				const referencesToInstall = allInstallationResolutions
					.map(r => r.packageForUpdate?.packageReference)
					.filter(r => r !== undefined);

				const installPackageStatus = await installPackage(
					referencesToInstall
				);

				installationStatuses = installPackageStatus
					.map(s => {
						const c = updateResolutions.find(
							r =>
								r.packageForUpdate?.packageReference.name ===
								s.reference.name
						);

						if (!c) {
							return undefined;
						}

						return {
							componentId: c.missingComponent.id,
							success: s.success,
							error: s.error?.cause?.stderr
						};
					})
					.filter(s => s !== undefined);
			} catch (err) {
				console.error(
					'Error while starting the update process:',
					err
				);
			}
		}

		appendUpdateStatuses(installationStatuses);

		//
		// Update files to use locally available versions
		//
		const locallyAvailableResolutions =
			filteredUpdateResolutions.filter(
				r => r.resolution === 'UPDATE_CFS_FILE'
			);

		// Consider only resolutions that passed the installation process
		const allInstallationResolutionsPassedInstallation =
			allInstallationResolutions.filter(
				r =>
					installationStatuses.find(
						s => s.componentId === r.missingComponent.id
					)?.success
			);

		// Including "Install Required" resolutions, in case of adding compatibility prefix
		const allCfsConfigUpdateResolutions = [
			...locallyAvailableResolutions,
			...allInstallationResolutionsPassedInstallation
		];

		if (allCfsConfigUpdateResolutions.length > 0) {
			const fileUpdateStatuses = await updateVersionInCfsConfigFile(
				allCfsConfigUpdateResolutions
			);
			appendUpdateStatuses(fileUpdateStatuses);
		}

		setIsLoading(false);
	};

	const handleContinueToSystemPlannerClick = async () => {
		await documentReload();
	};

	const appendUpdateStatuses = (
		updatesToAdd: CfsUpdateStatus[]
	): void => {
		for (const updateToAdd of updatesToAdd) {
			setUpdateStatus(prev => ({
				...prev,
				[updateToAdd.componentId]: updateToAdd
			}));
		}
	};

	const removeFailedUpdateStatuses = (): void => {
		setUpdateStatus(prev => {
			const filteredSuccessful = Object.entries(prev).filter(
				([_, value]) => value.success
			);

			return Object.fromEntries(filteredSuccessful);
		});
	};

	useEffect(() => {
		async function fetchVersions() {
			setIsLoading(true);

			try {
				const remotePackagesForComponents =
					await searchRemotePackagesForComponents(components);

				for (const component of components) {
					const packagesForComponent =
						remotePackagesForComponents.find(
							p => p.id === component.id
						);

					// Locally available
					const latestLocalCompatibleComponentVersion = component
						.availableVersions?.length
						? getLatestCompatible(
								component.version,
								component.availableVersions
							)
						: undefined;

					const formattedComponentName =
						component.type === 'data-model'
							? `${component.soc}:${component.id}`.toLowerCase()
							: component.id;

					// Latest compatible, available on remote for download
					const latestRemoteVersion = packagesForComponent
						? filterLatestCompatiblePackageForGivenComponentVersion(
								packagesForComponent.packages,
								formattedComponentName,
								component.version
							)
						: undefined;

					// Required, available on remote for download
					const requiredVersionList = packagesForComponent
						? filterPackagesForGivenComponentVersion(
								packagesForComponent.packages,
								formattedComponentName,
								component.version
							)
						: undefined;
					const requiredVersion = requiredVersionList?.[0];

					const currentState = getComponentState(component.id);
					const updatedState: ComponentResolutionState = {
						...currentState,
						latestLocalCompatibleComponentVersion,
						latestRemoteVersion,
						requiredVersion
					};

					const options = generateResolutionOptions(updatedState);

					updateComponentState(component.id, {
						latestLocalCompatibleComponentVersion,
						latestRemoteVersion,
						requiredVersion,
						...(options.length > 0 && {
							resolution: options[0].value
						})
					});
				}
			} catch (error) {
				console.log(
					'Failed to fetch remote versions for components.',
					error
				);
			} finally {
				setIsLoading(false);
			}
		}

		void fetchVersions();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [components]);

	const componentStatusErrorMessage = (
		componentResolutionState: ComponentResolutionState
	): string | undefined => {
		const componentInstallationStatus =
			updateStatus[componentResolutionState.component.id];

		const error = componentInstallationStatus?.error;

		if (typeof error === 'string') {
			return error;
		}

		return undefined;
	};

	const componentStatus = (
		componentResolutionState: ComponentResolutionState
	): UpdateResolutionStatusType | undefined => {
		const componentInstallationStatus =
			updateStatus[componentResolutionState.component.id];

		if (componentInstallationStatus) {
			if (componentInstallationStatus.success) {
				return 'UPDATE_COMPLETED';
			}

			if (!componentInstallationStatus.success) {
				return 'UPDATE_FAILED';
			}
		}

		if (
			isLoading &&
			!componentResolutionState?.latestRemoteVersion &&
			componentInstallationStatus === undefined
		) {
			return 'LOADING_RESOLUTIONS';
		}

		if (isLoading && componentResolutionState.latestRemoteVersion) {
			return 'UPDATE_IN_PROGRESS';
		}

		return undefined;
	};

	const isFullyCompleted = useMemo(() => {
		const componentsInstallationStatus = components.map(component => {
			const componentResolutionState = getComponentState(
				component.id
			);

			const componentInstallationStatus = componentResolutionState
				? updateStatus[componentResolutionState.component.id]
				: undefined;

			return Boolean(componentInstallationStatus?.success);
		});

		return !componentsInstallationStatus.includes(false);
	}, [components, getComponentState, updateStatus]);

	// Count components with available resolutions
	const componentsWithAvailableResolutionsCount = useMemo(
		() =>
			components.filter(component => {
				const state = getComponentState(component.id);

				return (
					state.requiredVersion ??
					state.latestLocalCompatibleComponentVersion ??
					state.latestRemoteVersion
				);
			}),
		[components, getComponentState]
	);

	const showButtons =
		componentsWithAvailableResolutionsCount.length > 0;

	const shouldShowContinueButton =
		showButtons && retryCounter === 0 && !isFullyCompleted;

	const shouldShowRetryButton =
		showButtons && retryCounter > 0 && !isFullyCompleted;

	const shouldShowContinueToSystemPlannerButton =
		showButtons && isFullyCompleted;

	const shouldDisableContinueRetryButton = isLoading;

	const titleToUse =
		retryCounter === 0 ? title : UPDATE_PROGRESS_TITLE;

	const subtitleToUse =
		retryCounter === 0 ? '' : UPDATE_PROGRESS_SUBTITLE;

	const iconToUse =
		retryCounter === 0 ? (
			<ConflictIcon width='19.5' height='19.5' />
		) : undefined;

	return (
		<Provider store={dummyStore}>
			<div className={styles.versionUpdateWizard}>
				<EightColumnLayout
					icon={iconToUse}
					header={titleToUse}
					subtitle={subtitleToUse}
					body={
						<div className={styles.errorContainer}>
							<div className={styles.errorList}>
								{components.map(component => {
									const state = getComponentState(component.id);
									const resolutionOptions =
										generateResolutionOptions(state);

									let updateToVersion = component.version;

									if (
										state.resolution === 'UPDATE_CFS_FILE' &&
										state.latestLocalCompatibleComponentVersion
									) {
										updateToVersion =
											state.latestLocalCompatibleComponentVersion;
									} else if (
										state.resolution ===
											'UPDATE_CFS_FILE_AND_INSTALL_LATEST_COMPATIBLE' &&
										state.latestRemoteVersion
									) {
										updateToVersion =
											state.latestRemoteVersion.componentVersion;
									}

									return (
										<UpdateResolutionCard
											key={`update-component-${component.id}`}
											component={component}
											status={componentStatus(state)}
											resolutions={resolutionOptions}
											selected={state.resolution}
											allowFutureCompatibleVersion={
												state.allowFutureCompatibleVersion
											}
											description={getMissingComponentDescription(
												component
											)}
											updateToVersion={updateToVersion}
											errorMessage={componentStatusErrorMessage(
												state
											)}
											onResolutionChange={resolutionChangeHandler(
												component
											)}
											onAllowFutureCompatibleVersion={allowFutureVersionChangeHandler(
												component
											)}
										/>
									);
								})}
							</div>
						</div>
					}
					footer={
						<>
							{shouldShowContinueButton && (
								<Button
									dataTest='version-update:continue-btn'
									disabled={shouldDisableContinueRetryButton}
									onClick={handleContinueClick}
								>
									Continue
								</Button>
							)}

							{shouldShowRetryButton && (
								<Button
									dataTest='version-update:retry-btn'
									disabled={shouldDisableContinueRetryButton}
									onClick={handleRetryClick}
								>
									Retry Updates
								</Button>
							)}

							{shouldShowContinueToSystemPlannerButton && (
								<Button
									dataTest='version-update:continue-to-system-planner-btn'
									disabled={shouldDisableContinueRetryButton}
									onClick={handleContinueToSystemPlannerClick}
								>
									Continue to System Planner
								</Button>
							)}
						</>
					}
				/>
			</div>
		</Provider>
	);
}

export default memo(MissingComponentsError);
