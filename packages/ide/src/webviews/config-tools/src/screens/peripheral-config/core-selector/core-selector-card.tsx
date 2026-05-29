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
import {Button, Card} from 'cfs-react-library';
import Lock from '../../../../../common/icons/Lock';
import {useTooltipDebouncedHover} from '../../../hooks/use-tooltip-debounced-hover';
import CoreSelectorTooltip from './core-selector-tooltip';

export type CoreSelectorProps = Readonly<{
	project: ProjectInfo;
	allocatableName: string;
	isDisabled: boolean;
	onSelect: (id: string) => void;
}>;

function CoreSelectorCard({
	project,
	allocatableName,
	isDisabled,
	onSelect
}: CoreSelectorProps) {
	const {isHovered, displayTooltip, hideTooltip} =
		useTooltipDebouncedHover(800);

	return (
		<>
			<Card
				key={project.ProjectId}
				id={`core-selector-card-${project.ProjectId}`}
				disableHoverEffects={isDisabled}
			>
				<Button
					id={`core-selector-button-${project.ProjectId}`}
					dataTest={`core-selector-button-${project.ProjectId}`}
					appearance='icon'
					className={`${styles.coreCard} ${isDisabled ? styles.disabled : {}}`}
					disabled={isDisabled}
					onClick={() => {
						if (!isDisabled) {
							onSelect(project.ProjectId);
						}
					}}
				>
					<div
						key={`core-${project.ProjectId}`}
						data-test={`core-${project.ProjectId}-container${isDisabled ? '-disabled' : ''}`}
						className={styles.core}
						onMouseEnter={() => {
							if (isDisabled) displayTooltip();
						}}
						onMouseLeave={() => {
							hideTooltip();
						}}
						onClick={() => {
							hideTooltip();
						}}
					>
						<Core projectId={project.ProjectId} />
						{isDisabled && <Lock />}
					</div>
				</Button>
			</Card>
			{isHovered && (
				<CoreSelectorTooltip
					allocatableName={allocatableName}
					project={project}
				/>
			)}
		</>
	);
}

export default memo(CoreSelectorCard);
