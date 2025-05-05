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
import ChevronRight from '@common/icons/ChevronRight';
import Core from '../core/Core';
import {type ProjectInfo} from '../../../utils/config';

export type CoreSelectorProps = Readonly<{
	projects: ProjectInfo[];
	isPeripheralSecure?: boolean;
	onSelect: (coreId: string) => void;
	onCancel: () => void;
}>;

function CoreSelector({
	projects,
	isPeripheralSecure,
	onSelect,
	onCancel
}: CoreSelectorProps) {
	const shouldDisableSelection = (project: ProjectInfo) => {
		if (isPeripheralSecure && !project.Secure) {
			return true;
		}

		return false;
	};

	return (
		<div className={styles.container}>
			<div className={styles.allocateText}>Allocate to:</div>
			{projects.map(project => (
				<div
					key={`core-${project.ProjectId}`}
					data-test={`core-${project.ProjectId}-container`}
					className={`${styles.core} ${shouldDisableSelection(project) ? styles.disabled : styles.cursorPointer}`}
					onClick={() => {
						if (!shouldDisableSelection(project)) {
							onSelect(project.ProjectId);
						}
					}}
				>
					<Core projectId={project.ProjectId} />
					{!shouldDisableSelection(project) && (
						<div
							data-test={`core-${project.ProjectId}-chevron`}
							className={styles.chevron}
						>
							<ChevronRight />
						</div>
					)}
				</div>
			))}
			<div
				data-test='core-selector-cancel-btn'
				className={`${styles.cancelButton} core-selector:cancel-btn`}
				onClick={onCancel}
			>
				Cancel
			</div>
		</div>
	);
}

export default memo(CoreSelector);
