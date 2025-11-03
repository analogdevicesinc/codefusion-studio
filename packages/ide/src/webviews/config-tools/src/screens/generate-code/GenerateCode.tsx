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
import {memo, useState, useEffect, useCallback, useMemo} from 'react';
import {Button, CfsSuspense, CheckBox} from 'cfs-react-library';
import EightColumnLayout from '../../components/eight-column-layout/EightColumnLayout';
import ProjectList from './project-list/ProjectList';
import GeneratedFiles from './generated-files/GeneratedFiles';
import {getCfsConfigDict} from '../../utils/config';
import {
	createCodeGenerationPromise,
	getGenerateCodeWarning,
	showGenerateCodeWarning
} from '../../utils/api';
import {useSelectedProjects} from '../../state/slices/app-context/appContext.selector';
import {usePeripheralControlsPerProjects} from '../../hooks/use-peripheral-controls-per-projects';
import type {TLocaleContext} from '../../common/types/context';
import type {ControlCfg} from '../../../../common/types/soc';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {Modal} from '@common/components/modal/Modal';

import styles from './GenerateCode.module.scss';
import ResolvedProjectControl from './project-list/ResolvedProjectControls';
import {ConfirmDialog} from '../../../../common/components/confirm-dialog/ConfirmDialog';
import {useAIModels} from '../../state/slices/ai-tools/aiModel.selector';
import type {CodeGenerationResult} from 'cfs-lib/dist/types/code-generation';
import {getAiBackends} from '../../utils/ai-tools';

const TEXTS = [
	{
		header: 'Generate Code',
		subtitle:
			'Select which projects, from those managed, to generate code for.'
	},
	{
		header: 'Generated files',
		subtitle: ''
	}
];

function GenerateCode() {
	const [isFirstScreen, setIsFirstScreen] = useState<boolean>(true);
	const selectedProjects = useSelectedProjects();
	const aiModels = useAIModels();
	const aiBackends = getAiBackends();
	const [isWarningModalOpen, setIsWarningModalOpen] =
		useState<boolean>(false);
	const [
		isCodeGenerationTimeModalOpen,
		setIsCodeGenerationTimeModalOpen
	] = useState<boolean>(false);
	const [shouldShowWarning, setShouldShowWarning] =
		useState<boolean>();
	const i10n: TLocaleContext | undefined =
		useLocaleContext()?.generate;

	const [projectsControls, setProjectsControls] = useState<
		Record<string, Record<string, ControlCfg[]>>
	>({});

	const projects = useMemo(
		() => getCfsConfigDict()?.projects ?? [],
		[]
	);

	// Check if any enabled AI model is using a Slow backend
	const shouldShowGenTimeWarning = useMemo(
		() =>
			selectedProjects.some(({projectId, includeAI}) => {
				if (!includeAI) return false;

				const coreId = projects.find(
					project => project.ProjectId === projectId
				)?.CoreId;

				return aiModels.some(
					model =>
						model.Enabled &&
						model.Target.Core.toUpperCase() ===
							coreId?.toUpperCase() &&
						aiBackends[model.Backend.Name]?.Slow
				);
			}),
		[aiModels, selectedProjects, projects, aiBackends]
	);

	const [codeGenerationPromise, setCodeGenerationPromise] = useState<
		Promise<CodeGenerationResult | string>
	>(Promise.resolve(['']));

	const controlsPromises = usePeripheralControlsPerProjects(
		projects.map(project => project.ProjectId)
	);

	const [innerWidth, setInnerWidth] = useState(window.innerWidth);
	const [innerHeight, setInnerHeight] = useState(window.innerHeight);

	useEffect(() => {
		const handleResize = () => {
			setInnerWidth(window.innerWidth);
			setInnerHeight(window.innerHeight);
		};

		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('resize', handleResize);
		};
	}, []);

	const isWindowTooSmall = useMemo(
		() => innerWidth < 630 || innerHeight < 475,
		[innerWidth, innerHeight]
	);

	const handleResolve = useCallback(
		(projectId: string, controls: Record<string, ControlCfg[]>) => {
			if (!projectsControls[projectId]) {
				setProjectsControls(prev => {
					if (prev[projectId]) {
						return prev;
					}

					return {
						...prev,
						[projectId]: controls
					};
				});
			}
		},
		[projectsControls]
	);

	const handleGenerateClick = useCallback(async () => {
		if (!selectedProjects.length) return;

		if (await getGenerateCodeWarning()) setIsWarningModalOpen(true);
		else {
			setIsWarningModalOpen(false);
			setIsFirstScreen(false);
		}
	}, [selectedProjects]);

	const handleModalCheckboxChange = (
		event: Event | React.FormEvent<HTMLElement>
	) => {
		const {target} = event as React.ChangeEvent<HTMLInputElement>;
		const newState: boolean = target.checked;
		setShouldShowWarning(newState);
	};

	useEffect(() => {
		getGenerateCodeWarning()
			.then((resp: boolean) => {
				setShouldShowWarning(!resp);
			})
			.catch(err => {
				console.error(err);
			});
	}, []);

	useEffect(() => {
		if (!isFirstScreen) {
			const promise = createCodeGenerationPromise(selectedProjects);
			setCodeGenerationPromise(promise);
		}
	}, [isFirstScreen, selectedProjects]);

	return (
		<EightColumnLayout
			header={isFirstScreen ? TEXTS[0].header : TEXTS[1].header}
			subtitle={
				isWindowTooSmall
					? 'This feature is not currently supported for windows this size. If possible please increase the size of this window.'
					: isFirstScreen
						? TEXTS[0].subtitle
						: TEXTS[1].subtitle
			}
			body={
				isWindowTooSmall ? undefined : isFirstScreen ? (
					<>
						{/* Render a ResolvedProjectControl for each promise */}
						{Object.keys(projectsControls).length !==
							projects.length &&
							projects.map((project, index) => (
								<CfsSuspense key={project.ProjectId}>
									<ResolvedProjectControl
										projectId={project.ProjectId}
										controlPromise={controlsPromises[index]}
										onResolve={handleResolve}
									/>
								</CfsSuspense>
							))}

						{Object.keys(projectsControls).length ===
							projects.length && (
							<ProjectList
								projects={projects}
								projectsControls={projectsControls}
							/>
						)}

						<Modal
							isOpen={isWarningModalOpen}
							handleModalClose={() => {
								setIsWarningModalOpen(false);
							}}
							footer={
								<>
									<Button
										appearance='secondary'
										onClick={() => {
											setIsWarningModalOpen(false);
										}}
									>
										Cancel
									</Button>
									<Button
										appearance='primary'
										dataTest='generate-code:modal:overwrite'
										onClick={async () => {
											if (shouldShowGenTimeWarning) {
												setIsCodeGenerationTimeModalOpen(true);
												setIsWarningModalOpen(false);
											} else {
												setIsFirstScreen(false);
											}

											if (shouldShowWarning)
												await showGenerateCodeWarning(false);
										}}
									>
										Overwrite Files
									</Button>
								</>
							}
						>
							<div className={styles.warningModalContainer}>
								<div className={styles.warningModalDescription}>
									<h1>{i10n?.warningModal?.title}</h1>
									<span>{i10n?.warningModal?.description}</span>
								</div>
								<div>
									<CheckBox
										checked={shouldShowWarning}
										onChange={e => {
											handleModalCheckboxChange(e);
										}}
									>
										<div className={styles.checkboxText}>
											{i10n?.warningModal?.dismiss}
										</div>
									</CheckBox>
								</div>
							</div>
						</Modal>
						<ConfirmDialog
							isOpen={isCodeGenerationTimeModalOpen}
							message={i10n?.codeGenerationTimeModal.description}
							title={i10n?.codeGenerationTimeModal.title}
							showDialogPreferenceId='cfgtools.views.aiTools.showNeuroweaveCodegenTimeWarning'
							confirmButtonText={
								i10n?.codeGenerationTimeModal.confirm
							}
							onCancel={() => {
								setIsCodeGenerationTimeModalOpen(false);
							}}
							onConfirm={() => {
								setIsCodeGenerationTimeModalOpen(false);
								setIsFirstScreen(false);
							}}
						/>
					</>
				) : (
					<CfsSuspense>
						<GeneratedFiles promise={codeGenerationPromise} />
					</CfsSuspense>
				)
			}
			footer={
				isFirstScreen ? (
					<>
						<span className={styles.descriptionText}>
							{i10n?.warningModal?.description}
						</span>
						<Button
							dataTest='generate-code:generate-btn'
							disabled={!selectedProjects.length}
							onClick={handleGenerateClick}
						>
							Generate
						</Button>
					</>
				) : (
					<Button
						appearance='secondary'
						onClick={() => {
							setIsFirstScreen(true);
							setIsWarningModalOpen(false);
						}}
					>
						Back
					</Button>
				)
			}
		/>
	);
}

export default memo(GenerateCode);
