/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import {setActiveScreen} from '../state/slices/app-context/appContext.reducer';
import {useActiveScreen} from '../state/slices/app-context/appContext.selector';
import {useAppDispatch} from '../state/store';
import {navigationItems} from '../common/constants/navigation';
import {
	useCoresToPersist,
	useCurrentCoreConfigStep,
	useSelectedBoardPackage,
	useSelectedCores,
	useSelectedCoreToConfigId,
	useSelectedSoc,
	useWorkspaceConfig,
	useWorkspaceTemplate,
	useWorkspaceTemplateType
} from '../state/slices/workspace-config/workspace-config.selector';
import {
	removeSelectedCores,
	setConfigErrors,
	setWorkspaceTemplate,
	setCoreConfig,
	setCoreToConfigId,
	setCurrentCoreConfigStep,
	toggleCoreEnabled
} from '../state/slices/workspace-config/workspace-config.reducer';
import {
	configErrors,
	ERROR_TYPES
} from '../common/constants/validation-errors';
import {
	LOCAL_STORAGE_CORE_CONFIG,
	LOCAL_STORAGE_CORE_CONFIG_ERRORS
} from '../common/constants/identifiers';
import type {StatePlatformConfig} from '../common/types/state';
import useCoreValidation from './useCoreValidation';
import {createWorkspace} from '../utils/api';
import {
	getEnabledCores,
	getTrustZoneIds,
	isPathInvalid,
	isWorkspaceNameInvalid
} from '../utils/workspace-config';

const CONTINUE_LABEL = 'Continue';

export default function useScreenNavigation() {
	const dispatch = useAppDispatch();
	const activeScreen = useActiveScreen();
	const selectedWorkspaceCreationPath = useWorkspaceTemplateType();
	const selectedSoc = useSelectedSoc();
	const selectedTemplate = useWorkspaceTemplate();
	const {packageId, boardId} = useSelectedBoardPackage();
	const selectedCores = useSelectedCores();
	const currentlyConfiguredCoreId = useSelectedCoreToConfigId();
	const {getPrimaryCoreError} = useCoreValidation();

	const enabledCores = getEnabledCores(selectedCores);
	const coresToPersist = useCoresToPersist();

	const totalEnabledCores = enabledCores.length;

	const currentStep = useCurrentCoreConfigStep();

	const goToNextCoreConfigStep = () => {
		if (currentStep + 1 < totalEnabledCores) {
			// if trustzone cores are enabled they take precedence, so disable the base core
			Object.values(selectedCores)
				.filter(
					core =>
						!core.id.endsWith('-secure') &&
						!core.id.endsWith('-nonsecure')
				)
				.forEach(core => {
					const baseId = core.id;
					const {secureCoreId, nonSecureCoreId} =
						getTrustZoneIds(baseId);
					// Check if TrustZone cores are enabled
					if (
						(selectedCores[secureCoreId]?.isEnabled ||
							selectedCores[nonSecureCoreId]?.isEnabled) &&
						core.isEnabled
					) {
						dispatch(toggleCoreEnabled(baseId));
					}
				});
			const nextCore = enabledCores[currentStep + 1];
			dispatch(setCoreToConfigId(nextCore.id));

			dispatch(setCurrentCoreConfigStep(currentStep + 1));
		} else {
			dispatch(setActiveScreen(navigationItems.pathSelection));
		}
	};

	const goToPrevCoreConfigStep = () => {
		if (currentStep > 0) {
			dispatch(setCurrentCoreConfigStep(currentStep - 1));
			const prevCore = enabledCores[currentStep - 1];

			dispatch(setCoreToConfigId(prevCore.id));
		} else {
			// Reset base core isEnabled to true on core config step if TrustZone core exist and base core is disabled
			Object.values(selectedCores)
				.filter(
					core =>
						!core.id.endsWith('-secure') &&
						!core.id.endsWith('-nonsecure')
				)
				.forEach(core => {
					const baseId = core.id;
					const {secureCoreId, nonSecureCoreId} =
						getTrustZoneIds(baseId);
					if (
						(selectedCores[secureCoreId]?.isEnabled ||
							selectedCores[nonSecureCoreId]?.isEnabled) &&
						!core.isEnabled
					) {
						dispatch(toggleCoreEnabled(baseId));
					}
				});
			dispatch(setActiveScreen(navigationItems.coresSelection));
		}
	};

	const selectedCoresIds = Object.values(selectedCores).map(
		core => core.id
	);

	const workspaceConfig = useWorkspaceConfig();

	const navigationButtonsSpecs: Record<
		string,
		{
			forwardLabel: string;
			forwardAction: () => void;
			backAction?: () => void;
			backLabel?: string;
		}
	> = {
		[navigationItems.socSelection]: {
			forwardLabel: CONTINUE_LABEL,
			forwardAction() {
				if (selectedSoc) {
					dispatch(setActiveScreen(navigationItems.boardSelection));
				} else {
					dispatch(
						setConfigErrors({
							id: configErrors.soc,
							notifications: [ERROR_TYPES.noSelection]
						})
					);
				}
			}
		},
		[navigationItems.boardSelection]: {
			forwardLabel: CONTINUE_LABEL,
			forwardAction() {
				if (packageId) {
					dispatch(setActiveScreen(navigationItems.workspaceOptions));
				} else {
					dispatch(
						setConfigErrors({
							id: configErrors.boardPackage,
							notifications: [ERROR_TYPES.noSelection]
						})
					);
				}
			},
			backAction() {
				dispatch(setActiveScreen(navigationItems.socSelection));
			}
		},
		[navigationItems.workspaceOptions]: {
			forwardLabel: CONTINUE_LABEL,
			forwardAction() {
				// Detect if there has been a change in path from predefined template flow to custom path flow.
				// If there is a change, we reset the cores selection

				if (
					selectedWorkspaceCreationPath === 'custom' &&
					selectedTemplate?.pluginId
				) {
					dispatch(removeSelectedCores(selectedCoresIds));
					dispatch(setWorkspaceTemplate(undefined));

					dispatch(setActiveScreen(navigationItems.coresSelection));
				} else {
					// If the user is changing from custom path to predefined path, we don't reset cores as that will happen on template selection.
					dispatch(
						setActiveScreen(
							selectedWorkspaceCreationPath === 'custom'
								? navigationItems.coresSelection
								: navigationItems.workspaceOptions
						)
					);
				}

				if (selectedWorkspaceCreationPath === 'predefined') {
					const {pluginId, pluginVersion} = selectedTemplate ?? {};

					if (pluginId && pluginVersion) {
						dispatch(setActiveScreen(navigationItems.pathSelection));
					} else {
						dispatch(
							setConfigErrors({
								id: configErrors.multiCoreTemplate,
								notifications: [ERROR_TYPES.noSelection]
							})
						);
					}
				}

				// If the user is changing from custom path to predefined path, we don't reset cores as that will happen on template selection.
			},
			backAction() {
				dispatch(setActiveScreen(navigationItems.boardSelection));
			}
		},
		[navigationItems.coresSelection]: {
			forwardLabel: CONTINUE_LABEL,
			forwardAction() {
				const errorTypes = getPrimaryCoreError(selectedCores);

				dispatch(
					setConfigErrors({
						id: configErrors.cores,
						notifications: errorTypes
					})
				);

				if (!errorTypes.length) {
					dispatch(setActiveScreen(navigationItems.coreConfig));

					const currentCore = enabledCores[currentStep];
					dispatch(setCoreToConfigId(currentCore.id));
				}
			},
			backAction() {
				dispatch(setActiveScreen(navigationItems.workspaceOptions));
			}
		},
		[navigationItems.coreConfig]: {
			forwardLabel: 'Continue',
			backLabel: 'Back',
			forwardAction() {
				const storedConfig = localStorage.getItem(
					LOCAL_STORAGE_CORE_CONFIG
				);

				const storedConfigErrors = localStorage.getItem(
					LOCAL_STORAGE_CORE_CONFIG_ERRORS
				);

				const appliedConfig = JSON.parse(storedConfig ?? '{}') as {
					pluginId: string;
					pluginVersion: string;
					firmwarePlatform: string;
					platformConfig: StatePlatformConfig;
				};

				if (
					Object.keys(appliedConfig).length &&
					!storedConfigErrors
				) {
					dispatch(
						setCoreConfig({
							id: currentlyConfiguredCoreId ?? '',
							config: appliedConfig
						})
					);

					dispatch(
						setConfigErrors({
							id: configErrors.cores,
							notifications: []
						})
					);

					dispatch(
						setConfigErrors({
							id: configErrors.coreConfig,
							notifications: []
						})
					);
					goToNextCoreConfigStep();
				} else {
					dispatch(
						setConfigErrors({
							id: configErrors.coreConfig,
							notifications: [ERROR_TYPES.noCoreConfig]
						})
					);
				}
			},
			backAction() {
				goToPrevCoreConfigStep();
			}
		},
		[navigationItems.pathSelection]: {
			forwardLabel: 'Create Workspace',
			forwardAction() {
				const {name: workspaceName, path} = workspaceConfig;
				const invalidName = isWorkspaceNameInvalid(workspaceName);
				const invalidPath = isPathInvalid(path);
				const {
					pluginId: workspacePluginId,
					pluginVersion: workspacePluginVersion
				} = selectedTemplate ?? {};

				if (workspaceName && path && !invalidName && !invalidPath) {
					createWorkspace({
						soc: selectedSoc,
						package: packageId,
						workspacePluginId,
						workspacePluginVersion,
						workspaceName,
						location: path,
						board: boardId,
						projects: coresToPersist
					}).catch(error => {
						dispatch(
							setConfigErrors({
								id: configErrors.workspaceDetails,
								notifications: [error.message]
							})
						);
					});
				} else {
					dispatch(
						setConfigErrors({
							id: configErrors.workspaceDetails,
							notifications: [],
							form: {
								isEmptyName: !workspaceName,
								isEmptyPath: !path,
								isInvalidName: invalidName,
								isInvalidPath: invalidPath
							}
						})
					);
				}
			},
			backAction() {
				if (selectedWorkspaceCreationPath === 'custom') {
					dispatch(setActiveScreen(navigationItems.coreConfig));
				} else {
					dispatch(setActiveScreen(navigationItems.workspaceOptions));
				}
			}
		}
	};

	return {
		activeScreen,
		navigationSpecs: navigationButtonsSpecs[activeScreen]
	};
}
