/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
	cancelGenerateCode,
	getGenerateCodeWarning,
	showGenerateCodeWarning
} from '../../utils/api';
import {
	useCodeGenState,
	useSelectedProjects
} from '../../state/slices/app-context/appContext.selector';
import {
	resetCodeGenState,
	runCodeGeneration
} from '../../state/slices/app-context/appContext.reducer';
import {useAppDispatch} from '../../state/store';
import {usePeripheralControlsPerProjects} from '../../hooks/use-peripheral-controls-per-projects';
import type {TLocaleContext} from '../../common/types/context';
import type {ControlCfg} from '../../../../common/types/soc';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {Modal} from '@common/components/modal/Modal';

import styles from './GenerateCode.module.scss';
import ResolvedProjectControl from './project-list/ResolvedProjectControls';
import {ConfirmDialog} from '../../../../common/components/confirm-dialog/ConfirmDialog';
import {useAIModels} from '../../state/slices/ai-tools/aiModel.selector';
import {getAiBackends, loadAIBackends} from '../../utils/ai-tools';
import {localizeMessage} from '../../../../common/utils/localization';

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
	const dispatch = useAppDispatch();
	const codeGenState = useCodeGenState();
	const isCodeGenerationIdle = codeGenState.status === 'idle';
	const selectedProjects = useSelectedProjects();
	const aiModels = useAIModels();
	const [aiBackends, setAiBackends] = useState(getAiBackends());
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
	const generateL10n = useLocaleContext()?.generateCode as
		| Record<string, string>
		| undefined;
	const commonL10n = useLocaleContext()?.common as
		| Record<string, string>
		| undefined;

	const [projectsControls, setProjectsControls] = useState<
		Record<string, Record<string, ControlCfg[]>>
	>({});

	const projects = useMemo(
		() => getCfsConfigDict()?.projects ?? [],
		[]
	);

	useEffect(() => {
		if (
			aiModels?.length > 0 &&
			(!aiBackends || Object.keys(aiBackends).length === 0)
		) {
			loadAIBackends()
				.then(backends => {
					setAiBackends(backends ?? {});
				})
				.catch(err => {
					console.error('Error loading AI backends:', err);
				});
		}
	}, [aiBackends, aiModels]);

	// Check if any enabled AI model is using a Slow backend
	const slowAIModelCodeGen = useMemo(
		() =>
			selectedProjects.flatMap(({projectId, includeAI}) => {
				if (!includeAI) return [];

				const coreId = projects.find(
					project => project.ProjectId === projectId
				)?.CoreId;

				return aiModels.filter(
					model =>
						model.Enabled &&
						model.Target.Core.toUpperCase() ===
							coreId?.toUpperCase() &&
						aiBackends[model.Backend?.Name ?? '']?.Slow
				);
			}),
		[aiModels, selectedProjects, projects, aiBackends]
	);

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
		else if (slowAIModelCodeGen.length > 0) {
			setIsCodeGenerationTimeModalOpen(true);
		} else {
			setIsWarningModalOpen(false);
			void dispatch(runCodeGeneration(selectedProjects));
		}
	}, [selectedProjects, slowAIModelCodeGen, dispatch]);

	const handleBackOrCancelClick = useCallback(async () => {
		if (codeGenState.status === 'running') {
			await cancelGenerateCode();
		}

		dispatch(resetCodeGenState());
		setIsWarningModalOpen(false);
	}, [codeGenState.status, dispatch]);

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

	return (
		<EightColumnLayout
			header={
				isCodeGenerationIdle
					? (generateL10n?.header ?? TEXTS[0].header)
					: (generateL10n?.generatedFiles ?? TEXTS[1].header)
			}
			subtitle={
				isWindowTooSmall
					? (commonL10n?.windowTooSmall ??
						'This feature is not currently supported for windows this size. If possible please increase the size of this window.')
					: isCodeGenerationIdle
						? (generateL10n?.subtitle ?? TEXTS[0].subtitle)
						: TEXTS[1].subtitle
			}
			body={
				isWindowTooSmall ? undefined : isCodeGenerationIdle ? (
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
											if (slowAIModelCodeGen.length > 0) {
												setIsCodeGenerationTimeModalOpen(true);
												setIsWarningModalOpen(false);
											} else {
												void dispatch(
													runCodeGeneration(selectedProjects)
												);
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
							message={
								isCodeGenerationTimeModalOpen
									? localizeMessage(
											i10n,
											'codeGenerationTimeModal.description',
											{
												models: slowAIModelCodeGen
													.map(model => model.Name)
													.join(', ')
											}
										)
									: ''
							}
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
								void dispatch(runCodeGeneration(selectedProjects));
							}}
						/>
					</>
				) : (
					<GeneratedFiles />
				)
			}
			footer={
				isCodeGenerationIdle ? (
					<>
						<span className={styles.descriptionText}>
							{i10n?.warningModal?.description}
						</span>
						<Button
							dataTest='generate-code:generate-btn'
							disabled={!selectedProjects.length}
							onClick={handleGenerateClick}
						>
							{generateL10n?.generateButton ?? 'Generate'}
						</Button>
					</>
				) : (
					<Button
						appearance='secondary'
						dataTest='generate-code:back-btn'
						onClick={() => {
							void handleBackOrCancelClick();
						}}
					>
						{codeGenState.status === 'running'
							? (generateL10n?.cancelButton ?? 'Cancel')
							: (generateL10n?.backButton ?? 'Back')}
					</Button>
				)
			}
		/>
	);
}

export default memo(GenerateCode);
