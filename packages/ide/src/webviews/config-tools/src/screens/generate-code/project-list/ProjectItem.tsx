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
import {Badge, CheckBox} from 'cfs-react-library';

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

type TCodeGenError = {
	peripheralAllocErr: number;
	pinConfigErr: number;
	clockConfigErr: number;
};

const isError = (errors: TCodeGenError) =>
	Number(
		errors.peripheralAllocErr +
			errors.pinConfigErr +
			errors.clockConfigErr
	);

function ProjectItem({
	project,
	isSelected,
	errors,
	onProjectSelect
}: Readonly<{
	project: ProjectInfo;
	isSelected: boolean;
	errors: TCodeGenError;
	onProjectSelect: (projectId: string, selected: boolean) => void;
}>) {
	const errorExists = isError(errors);
	const canBeSelected = !project.ExternallyManaged && !errorExists;

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
			ariaLabel='Selected core'
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
							clock: errors.clockConfigErr
						}
					}}
				/>
			</div>
		</CfsSelectionCard>
	);
}

export default memo(ProjectItem);
