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

import {memo, useCallback} from 'react';
import {Badge, CheckBox, InfoIcon, Tooltip} from 'cfs-react-library';

import CfsSelectionCard from '@common/components/cfs-selection-card/CfsSelectionCard';
import {
	SECURE,
	NON_SECURE,
	PRIMARY,
	EXTERNALLY_MANAGED
} from '@common/constants/core-properties';

import ValidStatus from './ValidStatus';
import ProjectListContent from './ProjectListContent';

import type {ProjectInfo} from '../../../utils/config';

import styles from './ProjectList.module.scss';
import type {TCodeGenError} from '../../../hooks/useSystemErrorsCount';
import {useAIModels} from '../../../state/slices/ai-tools/aiModel.selector';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';

const isError = (errors: TCodeGenError) =>
	Number(
		errors.peripheralAllocErr +
			errors.pinConfigErr +
			errors.clockConfigErr +
			errors.dfgErr
	);

function ProjectItem({
	project,
	isSelected,
	isAiSelected,
	errors,
	onProjectSelect,
	onAiProjectSelect
}: Readonly<{
	project: ProjectInfo;
	isSelected: boolean;
	isAiSelected?: boolean;
	errors: TCodeGenError;
	onProjectSelect: (projectId: string, selected: boolean) => void;
	onAiProjectSelect: (projectId: string, selected: boolean) => void;
}>) {
	const errorExists = isError(errors);
	const canBeSelected = !project.ExternallyManaged && !errorExists;
	const l10n = useLocaleContext()?.generate;

	const aiModelsForCore = useAIModels().filter(
		model =>
			model.Enabled &&
			model.Target.Core.toUpperCase() === project.CoreId.toUpperCase()
	);

	const handleCheckboxChange = useCallback(() => {
		if (canBeSelected) {
			onProjectSelect(project.ProjectId, !isSelected);
		}
	}, [canBeSelected, onProjectSelect, project.ProjectId, isSelected]);

	const displaySecureBadge = useCallback((project: ProjectInfo) => {
		if (!Object.prototype.hasOwnProperty.call(project, 'Secure'))
			return '';
		if (project.Secure)
			return <Badge appearance='secondary'>{SECURE}</Badge>;
		if (project.Secure === false)
			return <Badge appearance='secondary'>{NON_SECURE}</Badge>;
	}, []);

	return (
		<CfsSelectionCard
			key={project.ProjectId}
			isChecked={isSelected}
			id={project.ProjectId}
			testId={`generate-code:core:${project.ProjectId}`}
			ariaLabel='Selected project'
			hasError={false}
			isDisabled={project.ExternallyManaged}
			onChange={handleCheckboxChange}
		>
			<div slot='start'>
				<CheckBox
					checked={isSelected}
					isDisabled={!canBeSelected}
					dataTest={`generate-code:core:${project.ProjectId}:checkbox`}
					onClick={handleCheckboxChange}
				/>
			</div>

			<div slot='title' className={styles.titleSlotContainer}>
				<div className={styles.title}>
					<div className={styles.name}>{project.Name}</div>
					{project.IsPrimary && (
						<Badge appearance='secondary'>{PRIMARY}</Badge>
					)}
					{displaySecureBadge(project)}
					{project?.ExternallyManaged ? (
						<Badge
							dataTest='project-item:externally-managed-badge'
							appearance='secondary'
						>
							{EXTERNALLY_MANAGED}
						</Badge>
					) : null}
				</div>
				{!project.ExternallyManaged && (
					<div className={styles.description}>
						<span>Platform:</span>
						{project.FirmwarePlatform ? (
							<span>{project.FirmwarePlatform}</span>
						) : (
							<span>&#9472;</span>
						)}
					</div>
				)}
			</div>

			{aiModelsForCore?.length > 0 && (
				<div slot='subHeader' className={styles.aiModels}>
					<CheckBox
						isDisabled={!isSelected}
						checked={isAiSelected}
						onClick={e => {
							e.stopPropagation();
							onAiProjectSelect(project.ProjectId, !isAiSelected);
						}}
					>
						<div className={styles.aiModelsLabel}>
							<div className={styles.labelTooltip}>
								<h3>{l10n?.enableAiModels}</h3>
								<Tooltip
									title={l10n.enableAiModelsTooltip}
									position='right'
								>
									<InfoIcon />
								</Tooltip>
							</div>
							<span>
								{aiModelsForCore.map(model => model.Name).join(', ')}
							</span>
						</div>
					</CheckBox>
				</div>
			)}

			<div slot='end' className={styles.endSlot}>
				<ValidStatus
					errorsNumber={errorExists}
					testId={`valid-status:${project.ProjectId}`}
				/>
			</div>

			<div slot='content' className={styles.content}>
				<ProjectListContent
					project={project}
					errors={{
						show: Boolean(errorExists),
						param: {
							memory: 0,
							peripheral: errors.peripheralAllocErr,
							pin: errors.pinConfigErr,
							clock: errors.clockConfigErr,
							dfg: errors.dfgErr
						}
					}}
				/>
			</div>
		</CfsSelectionCard>
	);
}

export default memo(ProjectItem);
