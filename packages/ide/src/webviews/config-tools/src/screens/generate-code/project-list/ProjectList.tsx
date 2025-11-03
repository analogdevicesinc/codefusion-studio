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
import {
	removeSelectedProject,
	setSelectedProject
} from '../../../state/slices/app-context/appContext.reducer';
import {useSelectedProjects} from '../../../state/slices/app-context/appContext.selector';
import {useSystemErrorsCount} from '../../../hooks/useSystemErrorsCount';
import type {ProjectInfo} from '../../../utils/config';
import type {ControlCfg} from '../../../../../common/types/soc';
import {useAIModels} from '../../../state/slices/ai-tools/aiModel.selector';
import type {AIModel} from 'cfs-plugins-api';

function ProjectList({
	projects,
	projectsControls
}: Readonly<{
	projects: ProjectInfo[];
	projectsControls: Record<string, Record<string, ControlCfg[]>>;
}>) {
	const dispatch = useDispatch();
	const selectedProjectIds = useSelectedProjects();
	const aiModels = useAIModels();

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

			dispatch(
				selected
					? setSelectedProject({
							projectId,
							includeAI: aiModelExistsForProject(aiModels, project)
						})
					: removeSelectedProject(projectId)
			);
		},
		[projects, dispatch, errorsMap, aiModels]
	);

	const handleAiProjectSelect = useCallback(
		(projectId: string, selected: boolean) => {
			dispatch(setSelectedProject({projectId, includeAI: selected}));
		},
		[dispatch]
	);

	useEffect(() => {
		const validIds = new Set(
			projects
				.filter(
					p =>
						!p.ExternallyManaged &&
						!Object.values(errorsMap.get(p.ProjectId) ?? {}).some(
							count => count > 0
						)
				)
				.map(p => p.ProjectId)
		);

		for (const project of projects) {
			if (validIds.has(project.ProjectId)) {
				dispatch(
					setSelectedProject({
						projectId: project.ProjectId,
						includeAI: aiModelExistsForProject(aiModels, project)
					})
				);
			} else {
				// Deselect invalid projects
				dispatch(removeSelectedProject(project.ProjectId));
			}
		}
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
						clockConfigErr: 0,
						dfgErr: 0
					};

					const isValid = !(
						errors &&
						Object.values(errors).some(errorCount => errorCount > 0)
					);

					const selectedProject = isValid
						? selectedProjectIds.find(
								p => p.projectId === project.ProjectId
							)
						: undefined;

					return (
						<ProjectItem
							key={project.ProjectId}
							project={project}
							isSelected={Boolean(selectedProject)}
							isAiSelected={Boolean(selectedProject?.includeAI)}
							errors={errors}
							onProjectSelect={handleProjectSelect}
							onAiProjectSelect={handleAiProjectSelect}
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

function aiModelExistsForProject(
	aiModels: AIModel[],
	project: ProjectInfo
) {
	return aiModels.some(
		model =>
			model.Enabled &&
			model.Target.Core.toUpperCase() === project.CoreId.toUpperCase()
	);
}
