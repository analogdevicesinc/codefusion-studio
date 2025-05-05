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
import {memo, useEffect, useCallback} from 'react';
import ProjectItem from './ProjectItem';
import styles from './ProjectList.module.scss';
import {useDispatch} from 'react-redux';
import {setSelectedProjects} from '../../../state/slices/app-context/appContext.reducer';
import {useSelectedProjects} from '../../../state/slices/app-context/appContext.selector';
import {useSystemErrorsCount} from '../../../hooks/useSystemErrorsCount';
import type {ProjectInfo} from '../../../utils/config';
import type {ControlCfg} from '../../../../../common/types/soc';

function ProjectList({
	projects,
	projectsControls
}: Readonly<{
	projects: ProjectInfo[];
	projectsControls: Record<string, Record<string, ControlCfg[]>>;
}>) {
	const dispatch = useDispatch();
	const selectedProjectIds = useSelectedProjects();

	const errorsMap = useSystemErrorsCount({projectsControls});

	// Handle project selection changes
	const handleProjectSelect = useCallback(
		(projectId: string, selected: boolean) => {
			const project = projects.find(
				project => project.ProjectId === projectId
			);
			if (!project) return;

			const errors = errorsMap.get(project.ProjectId) ?? {
				peripheralAllocErr: 0,
				pinConfigErr: 0,
				clockConfigErr: 0
			};

			if (Object.values(errors).some(errorCount => errorCount > 0)) {
				return;
			}

			const newSelectedIds = selected
				? [...selectedProjectIds, projectId]
				: selectedProjectIds.filter(id => id !== projectId);

			dispatch(setSelectedProjects(newSelectedIds));
		},
		[projects, selectedProjectIds, dispatch, errorsMap]
	);

	// Initialize selected projects on first render
	useEffect(() => {
		const validProjectIds = projects
			.filter(
				project =>
					!project.ExternallyManaged &&
					!Object.values(errorsMap.get(project.ProjectId) ?? {}).some(
						errorCount => errorCount > 0
					)
			)
			.map(project => project.ProjectId);

		dispatch(setSelectedProjects(validProjectIds));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div
			className={styles.coreListContainer}
			data-test='generate-code:container'
		>
			{projects.length ? (
				projects.map((project: ProjectInfo) => {
					const errors = errorsMap.get(project.ProjectId) ?? {
						peripheralAllocErr: 0,
						pinConfigErr: 0,
						clockConfigErr: 0
					};

					const isSelected =
						!(
							errors &&
							Object.values(errors).some(errorCount => errorCount > 0)
						) && selectedProjectIds.includes(project.ProjectId);

					return (
						<ProjectItem
							key={project.ProjectId}
							project={project}
							isSelected={isSelected}
							errors={errors}
							onProjectSelect={handleProjectSelect}
						/>
					);
				})
			) : (
				<div>No data</div>
			)}
		</div>
	);
}

export default memo(ProjectList);
