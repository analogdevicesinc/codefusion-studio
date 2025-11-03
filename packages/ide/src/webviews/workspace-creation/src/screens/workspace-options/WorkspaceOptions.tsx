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

import CfsSelectionCard from '../../../../common/components/cfs-selection-card/CfsSelectionCard';
import WorkspaceCreationLayout from '../../common/components/WorkspaceCreationLayout';
import {
	useConfigurationErrors,
	useSelectedBoardPackage,
	useSelectedSoc,
	useWorkspaceTemplateType
} from '../../state/slices/workspace-config/workspace-config.selector';
import {
	setConfigErrors,
	setWorkspaceTemplateType
} from '../../state/slices/workspace-config/workspace-config.reducer';
import {useAppDispatch} from '../../state/store';
import styles from './WorkspaceOptions.module.scss';
import {Divider, ProgressRing, Radio} from 'cfs-react-library';
import {Suspense, useMemo} from 'react';
import {
	generateMulticoreTemplatesPromise,
	getHostPlatform
} from '../../utils/api';
import TemplateSelectionContainer from '../template-selection/TemplateSelectionContainer';
import NotificationError from '../../components/notification-error/NotificationError';
import {configErrors} from '../../common/constants/validation-errors';

export default function WorkspaceOptions() {
	const dispatch = useAppDispatch();
	// @TODO: Remove template type
	const workspaceTemplateType = useWorkspaceTemplateType();

	const selectedSoc = useSelectedSoc();
	const {packageId, boardId} = useSelectedBoardPackage();

	const errors = useConfigurationErrors('multiCoreTemplate');

	const templateListPromise = useMemo(
		async () =>
			generateMulticoreTemplatesPromise(
				selectedSoc,
				packageId,
				boardId
			),
		[packageId, selectedSoc, boardId]
	);

	const hostPlatformPromise = getHostPlatform();

	return (
		<WorkspaceCreationLayout
			testId='workspace-options'
			title='Workspace Creation Options'
			description='How would you like to create your workspace?'
		>
			<NotificationError
				error={errors}
				testId='multicore-template-selection-error'
			/>
			<div className={styles.optionsList}>
				<CfsSelectionCard
					testId='workspaceOptions:card:manualConfig'
					id='custom'
					isChecked={workspaceTemplateType === 'custom'}
					onChange={() => {
						dispatch(setWorkspaceTemplateType('custom'));

						if (errors.notifications.length) {
							dispatch(
								setConfigErrors({
									id: configErrors.multiCoreTemplate,
									notifications: []
								})
							);
						}
					}}
				>
					<Radio
						slot='start'
						checked={workspaceTemplateType === 'custom'}
					/>
					<div slot='title' className={styles.optionBody}>
						<h3 className={styles.optionTitle}>
							Manually configure the workspace
						</h3>
						<p className={styles.optionDescription}>
							Continue setting up manually your system configuration.
						</p>
					</div>
				</CfsSelectionCard>
				<div className={styles.separator}>
					<Divider />
					<span>OR</span>
					<Divider />
				</div>
				<Suspense fallback={<ProgressRing />}>
					<TemplateSelectionContainer
						templateListPromise={templateListPromise}
						hostPlatformPromise={hostPlatformPromise}
					/>
				</Suspense>
			</div>
		</WorkspaceCreationLayout>
	);
}
