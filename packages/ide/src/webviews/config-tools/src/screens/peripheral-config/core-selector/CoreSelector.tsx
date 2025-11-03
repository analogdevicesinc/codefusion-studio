/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
import {memo} from 'react';
import styles from './CoreSelector.module.scss';
import Core from '../core/Core';
import {type ProjectInfo} from '../../../utils/config';
import {Button, Card, ChevronLeftIcon} from 'cfs-react-library';
import {PeripheralSecurity} from '../../../types/peripherals';

export type CoreSelectorProps = Readonly<{
	title?: string;
	projectConfig?: ProjectInfo[];
	signalName?: string;
	projects: ProjectInfo[];
	peripheralSecurity?: PeripheralSecurity;
	onSelect: (coreId: string) => void;
	onCancel: () => void;
}>;

function CoreSelector({
	title,
	projects,
	projectConfig,
	signalName,
	peripheralSecurity,
	onSelect,
	onCancel
}: CoreSelectorProps) {
	const shouldDisableSelection = (project: ProjectInfo) => {
		// This will show the project as disabled if it is not in the projectConfig i.e if the peripheral cannot allocated to the project
		if (
			!projects.some(item => item.ProjectId === project.ProjectId)
		) {
			return true;
		}

		/*Legend for project/peripheral security allocation:

			project.Secure ↓    | peripheralSecurity →
			-------------------------------------------------------------
			TRUE (secure)         | Secure → ENABLE
														| Non-Secure → DISABLE
														| Any / undefined → ENABLE

			FALSE (non-secure)    | Secure → DISABLE
														| Non-Secure → ENABLE
														| Any / undefined → ENABLE

			undefined (treated as secure)
														| Secure → ENABLE
														| Non-Secure → DISABLE
														| Any / undefined → ENABLE
			*/

		const isProjectSecure = project.Secure ?? true;

		if (
			(peripheralSecurity === 'Secure' && !isProjectSecure) ||
			(peripheralSecurity === 'Non-Secure' && isProjectSecure)
		) {
			return true;
		}

		return false;
	};

	return (
		<div className={styles.container}>
			<Button
				appearance='icon'
				dataTest='core-selector-cancel-btn'
				className={`${styles.cancelButton} core-selector:cancel-btn`}
				onClick={onCancel}
			>
				<div className={styles.cancelIcon}>
					<ChevronLeftIcon />
					<span>Back</span>
				</div>
			</Button>
			<div
				className={styles.allocateText}
				data-test={`allocate-${title}-title`}
			>{`Allocate ${title} ${signalName ?? ''} to: `}</div>
			<div className={styles.coreSection}>
				{projectConfig?.map(project => {
					const isDisabled = shouldDisableSelection(project);

					return (
						<Card
							key={project.ProjectId}
							disableHoverEffects={isDisabled}
						>
							<Button
								appearance='icon'
								className={styles.coreCard}
								onClick={() => {
									if (!isDisabled) {
										onSelect(project.ProjectId);
									}
								}}
							>
								<div
									data-test={`core-${project.ProjectId}-container${isDisabled ? '-disabled' : ''}`}
									className={`${styles.core} ${
										isDisabled
											? styles.disabled
											: styles.cursorPointer
									}`}
								>
									<Core projectId={project.ProjectId} />
								</div>
							</Button>
						</Card>
					);
				})}
			</div>
		</div>
	);
}

export default memo(CoreSelector);
