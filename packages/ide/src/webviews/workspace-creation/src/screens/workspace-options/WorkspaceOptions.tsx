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
	useSelectedSoc,
	useWorkspaceTemplateType
} from '../../state/slices/workspace-config/workspace-config.selector';
import {setWorkspaceTemplateType} from '../../state/slices/workspace-config/workspace-config.reducer';
import {useAppDispatch} from '../../state/store';
import styles from './WorspaceOptions.module.scss';
import {Radio} from 'cfs-react-library';
import useBoardPackageSelection from '../../hooks/useBoardPackageSelection';

export default function WorkspaceOptions() {
	const dispatch = useAppDispatch();
	const currentSoC = useSelectedSoc();
	const board = useBoardPackageSelection()?.selectedBoardPackageId;
	// @TODO: Remove template type
	const workspaceTemplateType = useWorkspaceTemplateType();

	return (
		<WorkspaceCreationLayout
			title='Workspace Creation Options'
			description={`${currentSoC} | ${board} | How would you like to create your workspace?`}
		>
			<div className={styles.optionsList}>
				<CfsSelectionCard
					testId='workspaceOptions:card:predefinedConfig'
					id='predefined'
					isChecked={workspaceTemplateType === 'predefined'}
					onChange={() => {
						dispatch(setWorkspaceTemplateType('predefined'));
					}}
				>
					<Radio
						slot='start'
						checked={workspaceTemplateType === 'predefined'}
					/>
					<div slot='title' className={styles.optionBody}>
						<h3 className={styles.optionTitle}>
							Select a workspace template
						</h3>
						<p className={styles.optionDescription}>
							Choose from SoC predefined templates pre-populated with
							ADI recommended configuration options.
						</p>
					</div>
				</CfsSelectionCard>
				<CfsSelectionCard
					testId='workspaceOptions:card:manualConfig'
					id='custom'
					isChecked={workspaceTemplateType === 'custom'}
					onChange={() => {
						dispatch(setWorkspaceTemplateType('custom'));
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
			</div>
		</WorkspaceCreationLayout>
	);
}
