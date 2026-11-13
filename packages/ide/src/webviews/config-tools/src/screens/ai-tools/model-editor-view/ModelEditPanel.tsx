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
import {logTelemetryEvent} from '../../../utils/api';
import {CONFIG_TOOLS_TELEMETRY_ACTIONS} from '../../../state/utils/telemetry-reporter';

const ADI_MODEL_ZOO_URL =
	'https://raw.githubusercontent.com/analogdevicesinc/adi-model-zoo/refs/heads/main';

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

	const [controlsLoading, setControlsLoading] = useState(false);

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
			const configDict = getCfsConfigDict();
			const {Soc, BoardName} = configDict ?? {};
			const coreFamily = configDict?.projects?.find(
				p => p.CoreId === currentModel.Target.Core
			)?.Family;
			const zooModelPlatform = getZooModelPlatform({
				selectedZooModel: modelZooSelection.model,
				soc: Soc ?? '',
				board: BoardName ?? '',
				core: currentModel.Target.Core,
				accelerator: currentModel.Target.Accelerator,
				family: coreFamily
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

	// Stable identity so ModelConfiguration's backend-controls effect
	// (which depends on this prop) doesn't re-run - and re-fetch/re-flag
	// controlsLoading - on every unrelated re-render.
	const handleModelChange = useCallback(
		(newModel: AIModelWithId) => {
			if (newModel.Files.Model !== currentModel.Files.Model) {
				setModelZooSelection(undefined);
			}

			setCurrentModel(newModel);
		},
		[currentModel.Files.Model]
	);

	const handleAddModel = () => {
		if (!validateModelConfig()) {
			return;
		}

		if (modelZooSelection) {
			const configDict = getCfsConfigDict();
			const {Soc, BoardName} = configDict ?? {};
			const coreFamily = configDict?.projects?.find(
				p => p.CoreId === currentModel.Target.Core
			)?.Family;

			const urls =
				resolveZooModelUrl(
					modelZooSelection,
					Soc ?? '',
					BoardName ?? '',
					currentModel.Target.Core,
					currentModel.Target.Accelerator,
					coreFamily
				) ?? '';

			currentModel.Files.Model = urls.modelUrl ?? '';
			currentModel.Files.Dataset = urls.datasetUrl ?? '';

			if (!originalModel) {
				const isAdiZooModel =
					modelZooSelection.model.baseURL === ADI_MODEL_ZOO_URL;

				void logTelemetryEvent(
					CONFIG_TOOLS_TELEMETRY_ACTIONS.MODEL_ADDED,
					{
						modelName: isAdiZooModel
							? modelZooSelection.model.name
							: 'Custom',
						modelTags: isAdiZooModel
							? [
									modelZooSelection.model.task,
									modelZooSelection.model.taskType,
									modelZooSelection.model.framework
								]
							: ['Custom'],
						modelSource: 'modelZooModel'
					}
				);
			}
		} else if (!originalModel) {
			void logTelemetryEvent(
				CONFIG_TOOLS_TELEMETRY_ACTIONS.MODEL_ADDED,
				{
					modelName: 'Custom',
					modelTags: ['Custom'],
					modelSource: 'localModel'
				}
			);
		}

		dispatch(
			saveEditingModel({
				model: currentModel,
				originalName: originalModel?.Name
			})
		);
	};

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
						disabled={controlsLoading}
						onClick={handleAddModel}
					>
						{originalModel ? l10n?.update : l10n?.add}
					</Button>
				}
			>
				<ModelConfiguration
					currentModel={currentModel}
					modelZooSelection={modelZooSelection}
					isEditing={Boolean(originalModel)}
					setCurrentModel={handleModelChange}
					errors={errors}
					setModelZooOpen={setIsModelZooOpen}
					onDynamicControlsChange={setDynamicControls}
					onControlsLoadingChange={setControlsLoading}
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
