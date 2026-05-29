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

import {ExportIcon, SaveAsIcon} from 'cfs-react-library';
import TopbarButton from '@common/components/cfs-top-bar/TopbarButton';
import {Direction} from '@common/components/tooltip/Tooltip';
import Help from '@common/icons/Help';

import styles from './sev-header.module.scss';

type SevHeaderActionsProps = Readonly<{
	onSaveAs: () => void;
	onExport: () => void;
	onHelpClick: () => void;
}>;

export default function SevHeaderFileButtons({
	onSaveAs,
	onExport,
	onHelpClick
}: SevHeaderActionsProps) {
	return (
		<div
			className={styles.actionsEnd}
			data-test='sev-header:cta-container'
		>
			<span className={styles.exportGroup}>
				<span data-test='sev-header:save-as-action'>
					<TopbarButton
						title='Save File As'
						icon={<SaveAsIcon />}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='startingRadius'
						clickHandler={onSaveAs}
					/>
				</span>
				<span data-test='sev-header:export-action'>
					<TopbarButton
						title='Export File'
						icon={<ExportIcon />}
						tooltipType='long'
						tooltipDirection={Direction.Left}
						variant='endingRadius'
						clickHandler={onExport}
					/>
				</span>
			</span>
			<TopbarButton
				title='System Event Viewer Help'
				icon={<Help />}
				tooltipType='long'
				tooltipDirection={Direction.Left}
				clickHandler={onHelpClick}
			/>
		</div>
	);
}
