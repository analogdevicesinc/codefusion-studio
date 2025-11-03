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

import {useEffect, useMemo, useState} from 'react';
import debounce from 'lodash.debounce';
import {CheckBox, TextField} from 'cfs-react-library';
import WorkspaceCreationLayout from '../../common/components/WorkspaceCreationLayout';
import BrowseFile from '../core-config/core-config-components/browse-file/BrowseFile';
import {
	useConfigurationErrors,
	useSelectedBoardPackage,
	useSelectedCores,
	useSelectedSoc,
	useWorkspaceName,
	useWorkspacePath,
	useWorkspaceTemplate
} from '../../state/slices/workspace-config/workspace-config.selector';

import {useAppDispatch} from '../../state/store';
import {
	setConfigErrors,
	setWorkspaceName,
	setWorkspacePath
} from '../../state/slices/workspace-config/workspace-config.reducer';
import {configErrors} from '../../common/constants/validation-errors';
import {getDefaultLocation} from '../../utils/user-default-path';

import styles from './PathSelection.module.scss';
import {
	getEnabledCores,
	isPathInvalid,
	isWorkspaceNameInvalid
} from '../../utils/workspace-config';
import {isCypressEnvironment} from '../../../../common/utils/env';

const DEBOUNCE_DELAY = isCypressEnvironment() ? 0 : 250;

function PathSelectionScreen() {
	const dispatch = useAppDispatch();
	const selectedSoc = useSelectedSoc();
	const selectedCores = useSelectedCores();
	const workspacePath = useWorkspacePath();
	const workspaceName = useWorkspaceName();
	const workspaceTemplate = useWorkspaceTemplate();
	const [isDefaultPath, setIsDefaultPath] = useState(false); // We assume that the user can have a persisted path defined.
	const {boardId, packageId} = useSelectedBoardPackage();
	const userDefaultLocation = getDefaultLocation();

	const {isEmptyName, isEmptyPath, isInvalidName, isInvalidPath} =
		useConfigurationErrors('workspaceDetails').form ?? {};

	// to remove out baseCore entry incase trustZone is enabled
	const enabledCores = getEnabledCores(selectedCores);

	const configuredCores = useMemo(
		() =>
			Object.values(enabledCores)
				.filter(core => core.isEnabled)
				.map(core => core.name),
		[enabledCores]
	);

	const handleNameChange = useMemo(
		() =>
			debounce((name: string) => {
				const invalidName = isWorkspaceNameInvalid(name);

				if (isEmptyName || !invalidName) {
					dispatch(
						setConfigErrors({
							id: configErrors.workspaceDetails,
							notifications: [],
							form: {
								isEmptyName: false,
								isInvalidName: invalidName,
								isEmptyPath,
								isInvalidPath
							}
						})
					);
				} else if (invalidName) {
					dispatch(
						setConfigErrors({
							id: configErrors.workspaceDetails,
							notifications: [],
							form: {
								isEmptyName: false,
								isInvalidName: invalidName,
								isInvalidPath,
								isEmptyPath: false
							}
						})
					);
				}

				dispatch(setWorkspaceName(name));
			}, DEBOUNCE_DELAY),
		[dispatch, isEmptyName, isEmptyPath, isInvalidPath]
	);

	const handlePathChange = useMemo(
		() =>
			debounce((path: string) => {
				const invalidPath = isPathInvalid(path);

				if (isEmptyPath || !invalidPath) {
					dispatch(
						setConfigErrors({
							id: configErrors.workspaceDetails,
							notifications: [],
							form: {
								isEmptyName,
								isEmptyPath: false,
								isInvalidName,
								isInvalidPath: invalidPath
							}
						})
					);
				} else if (invalidPath) {
					dispatch(
						setConfigErrors({
							id: configErrors.workspaceDetails,
							notifications: [],
							form: {
								isEmptyName,
								isEmptyPath: false,
								isInvalidName,
								isInvalidPath: invalidPath
							}
						})
					);
				}

				dispatch(setWorkspacePath(path));
			}, DEBOUNCE_DELAY),
		[dispatch, isEmptyName, isEmptyPath, isInvalidName]
	);

	useEffect(() => {
		// If the workspace path is empty on mount, set the default path as the workspace path in the document.
		if (!workspacePath) {
			dispatch(setWorkspacePath(userDefaultLocation));
			setIsDefaultPath(true);
		}

		// If the workspace path is populated on mount, check if it matches the default path and set checkbox state accordingly.
		if (workspacePath === userDefaultLocation) {
			setIsDefaultPath(true);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		// Toggling the default path should update the document path.
		if (isDefaultPath) {
			dispatch(setWorkspacePath(userDefaultLocation));
		}
	}, [isDefaultPath, dispatch, userDefaultLocation]);

	return (
		<WorkspaceCreationLayout
			title='Workspace Location'
			description='Review your choices and select a workspace name and location.'
		>
			<div className={styles.pathSelectionContainer}>
				<section>
					<h2>Summary</h2>
					<div className={styles.summaryContainer}>
						<p className={styles.summaryItem}>
							<span className={styles.summaryLabel}>SoC:</span>
							<span
								data-test='confirmation-screen:summary:soc'
								className={styles.summaryValue}
							>
								{selectedSoc}
							</span>
						</p>
						<p className={styles.summaryItem}>
							<span className={styles.summaryLabel}>
								Board and Package:
							</span>
							<span
								data-test='confirmation-screen:summary:board-package'
								className={styles.summaryValue}
							>
								{boardId ? `${boardId} ${packageId}` : packageId}
							</span>
						</p>
						{configuredCores.length > 0 ? (
							<p className={styles.summaryItem}>
								<span className={styles.summaryLabel}>Cores:</span>
								<span
									data-test='confirmation-screen:summary:cores'
									className={styles.summaryValue}
								>
									{configuredCores.join(' and ')}
								</span>
							</p>
						) : null}
						{workspaceTemplate ? (
							<p className={styles.summaryItem}>
								<span className={styles.summaryLabel}>Template:</span>
								<span
									data-test='confirmation-screen:summary:template'
									className={styles.summaryValue}
								>
									{workspaceTemplate.pluginName ??
										workspaceTemplate.pluginId}
								</span>
							</p>
						) : null}
					</div>
				</section>
				<section>
					<h2>Workspace Details</h2>
					<div className={styles.pathSelectionContainer}>
						<TextField
							dataTest='confirmation-screen:workspace-name:text-field'
							label='Name'
							placeholder='Start typing...'
							inputVal={workspaceName}
							error={
								isEmptyName
									? 'Name is required'
									: isInvalidName
										? 'Spaces and special characters (except "_", "-" and ".") are not allowed'
										: undefined
							}
							onInputChange={handleNameChange}
						/>
						<div className={styles.locationInputGroup}>
							<label>Location</label>
							<div className={styles.defaultLocationGroup}>
								<div className={styles.defaultLocationCheckbox}>
									<CheckBox
										dataTest='confirmation-screen:workspace-path:default-location-checkbox'
										checked={isDefaultPath}
										onChange={() => {
											if (!isDefaultPath && isEmptyPath) {
												dispatch(
													setConfigErrors({
														id: configErrors.workspaceDetails,
														notifications: [],
														form: {
															isEmptyName,
															isInvalidName,
															isEmptyPath: false
														}
													})
												);
											} else {
												dispatch(
													setConfigErrors({
														id: configErrors.workspaceDetails,
														notifications: [],
														form: {
															isEmptyName,
															isInvalidName,
															isInvalidPath: false,
															isEmptyPath: false
														}
													})
												);
											}

											setIsDefaultPath(!isDefaultPath);
										}}
									/>
									<span>Use default location</span>
								</div>
							</div>
							<BrowseFile
								mode='folder'
								dataTest='confirmation-screen:workspace-path:text-field'
								path={workspacePath}
								isDisabled={isDefaultPath}
								error={
									isEmptyPath && !isDefaultPath
										? 'Path is required'
										: !isDefaultPath && isInvalidPath
											? 'Path is invalid'
											: undefined
								}
								onPathChange={handlePathChange}
							/>
						</div>
					</div>
				</section>
			</div>
		</WorkspaceCreationLayout>
	);
}

export default PathSelectionScreen;
