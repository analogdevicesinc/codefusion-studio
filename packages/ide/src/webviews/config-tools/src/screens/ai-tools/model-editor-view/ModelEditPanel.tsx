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
import {
	getAiBackends,
	getAIModelTargets
} from '../../../utils/ai-tools';
import {validateModel} from './ai-model-utils';
import {ModelConfiguration} from './ModelConfiguration';

export function ModelEditPanel() {
	const originalModel = useEditingAIModel();
	const editPanelOpen = useEditPanelOpen();
	const dispatch = useAppDispatch();
	const modelTargets = getAIModelTargets();
	const aiBackends = getAiBackends();
	const models = useAIModels();

	const l10n = useLocaleContext()?.aitools.modelConfig;

	const [currentModel, setCurrentModel] = useState<AIModelWithId>(
		defaultEmptyAIModel
	);
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
		const errors = validateModel(currentModel, models, originalModel);
		setErrors(errors);

		return Object.keys(errors).length === 0;
	}, [currentModel, models, originalModel, setErrors]);

	return (
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
				isEditing={Boolean(originalModel)}
				setCurrentModel={setCurrentModel}
				errors={errors}
			/>
		</SlidingPanel>
	);
}
