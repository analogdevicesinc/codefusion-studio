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

import styles from './ModelEditPanel.module.scss';
import {useCallback, useEffect, useState} from 'react';
import {
	useAIModels,
	useEditingAIModel,
	useEditPanelOpen
} from '../../../state/slices/ai-tools/aiModel.selector';
import {useAppDispatch} from '../../../state/store';
import {
	cancelEditingModel,
	defaultEmptyAIModel,
	saveEditingModel
} from '../../../state/slices/ai-tools/aiModel.reducer';
import {Button, SlidingPanel} from 'cfs-react-library';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {type AIModelWithId} from '../../../state/slices/ai-tools/aiModel.reducer';
import type {ModelZooSelectionData} from '../../../../../common/components/cfs-model-zoo/CfsModelZoo';
import {
	getAiBackends,
	getAIModelTargets
} from '../../../utils/ai-tools';
import {validateModel} from './ai-model-utils';
import {ModelConfiguration} from './ModelConfiguration';
import type {SocControl} from 'cfs-types';
import {CfsModelZoo} from '../../../../../common/components/cfs-model-zoo/CfsModelZoo';
import {getCfsConfigDict} from '../../../utils/config';
import {
	getZooModelDisplayName,
	getZooModelPlatform,
	resolveZooModelUrl
} from '../../../../../common/components/cfs-model-zoo/model-zoo-utils';
import {getPreference, selectFile} from '../../../../../common/api';

export function ModelEditPanel() {
	const originalModel = useEditingAIModel();
	const editPanelOpen = useEditPanelOpen();
	const dispatch = useAppDispatch();
	const modelTargets = getAIModelTargets();
	const aiBackends = getAiBackends();
	const models = useAIModels();
	const soc = getCfsConfigDict()?.Soc;

	const l10n = useLocaleContext()?.aitools.modelConfig;

	const [currentModel, setCurrentModel] = useState<AIModelWithId>(
		defaultEmptyAIModel
	);

	const [modelZooSelection, setModelZooSelection] =
		useState<ModelZooSelectionData>();

	const [dynamicControls, setDynamicControls] = useState<
		SocControl[]
	>([]);

	const [isModelZooOpen, setIsModelZooOpen] = useState(false);

	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (originalModel) {
			// Create copy of original model to avoid mutating it directly
			setCurrentModel(structuredClone(originalModel));
		} else {
			const defaultCore = modelTargets[0];
			setCurrentModel({
				...defaultEmptyAIModel,
				id: crypto.randomUUID(),
				Target: {
					Core: defaultCore?.Id ?? '',
					Accelerator: defaultCore?.Accelerator
				},
				Backend: {
					Name: defaultCore?.Backend ?? ''
				}
			});
		}

		setErrors({});
	}, [originalModel, editPanelOpen, modelTargets, aiBackends]);

	const validateModelConfig = useCallback(() => {
		const errors = validateModel(
			currentModel,
			models,
			originalModel,
			dynamicControls
		);

		if (modelZooSelection) {
			const {Soc, BoardName} = getCfsConfigDict() ?? {};
			const zooModelPlatform = getZooModelPlatform({
				selectedZooModel: modelZooSelection.model,
				soc: Soc ?? '',
				board: BoardName ?? '',
				core: currentModel.Target.Core,
				accelerator: currentModel.Target.Accelerator
			});

			if (!zooModelPlatform) {
				errors.ModelFile =
					l10n?.errors?.modelDoesNotSupportPlatform ?? '';
			}
		}

		setErrors(errors);

		return Object.keys(errors).length === 0;
	}, [
		currentModel,
		models,
		originalModel,
		dynamicControls,
		modelZooSelection,
		l10n
	]);

	return (
		<>
			<SlidingPanel
				isCloseable
				isMinimised={!editPanelOpen}
				title={originalModel ? l10n?.configureModel : l10n?.addModel}
				closeSlider={() => dispatch(cancelEditingModel())}
				footer={
					<Button
						className={styles.saveButton}
						dataTest='model-save-button'
						onClick={() => {
							if (!validateModelConfig()) {
								return;
							}

							if (modelZooSelection) {
								const {Soc, BoardName} = getCfsConfigDict() ?? {};

								const urls =
									resolveZooModelUrl(
										modelZooSelection,
										Soc ?? '',
										BoardName ?? '',
										currentModel.Target.Core,
										currentModel.Target.Accelerator
									) ?? '';

								currentModel.Files.Model = urls.modelUrl ?? '';
								currentModel.Files.Dataset = urls.datasetUrl ?? '';
							}

							dispatch(
								saveEditingModel({
									model: currentModel,
									originalName: originalModel?.Name
								})
							);
						}}
					>
						{originalModel ? l10n?.update : l10n?.add}
					</Button>
				}
			>
				<ModelConfiguration
					currentModel={currentModel}
					modelZooSelection={modelZooSelection}
					isEditing={Boolean(originalModel)}
					setCurrentModel={(newModel: AIModelWithId) => {
						if (newModel.Files.Model !== currentModel.Files.Model) {
							setModelZooSelection(undefined);
						}

						setCurrentModel(newModel);
					}}
					errors={errors}
					setModelZooOpen={setIsModelZooOpen}
					onDynamicControlsChange={setDynamicControls}
				/>
			</SlidingPanel>
			<CfsModelZoo
				isOpen={isModelZooOpen}
				defaultSocFilter={soc ? [soc] : []}
				defaultCoreFilter={[currentModel.Target.Core]}
				initialModelSelection={modelZooSelection}
				getPreference={getPreference}
				selectFile={selectFile}
				onClose={() => {
					setIsModelZooOpen(false);
				}}
				onLocalFileSelected={filePath => {
					setModelZooSelection(undefined);
					setCurrentModel(prev => ({
						...prev,
						Files: {
							...prev.Files,
							Model: filePath
						}
					}));
				}}
				onModelSelected={selection => {
					setIsModelZooOpen(false);
					setModelZooSelection(selection);
					// Set the model name for now.
					// Will be replaced with the correct URL when creating/updating
					setCurrentModel(prev => ({
						...prev,
						Files: {
							...prev.Files,
							Model: getZooModelDisplayName(selection)
						}
					}));
				}}
			/>
		</>
	);
}
