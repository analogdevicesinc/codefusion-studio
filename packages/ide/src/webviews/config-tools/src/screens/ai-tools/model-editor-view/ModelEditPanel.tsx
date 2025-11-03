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

import styles from './ModelEditPanel.module.scss';
import {useCallback, useEffect, useMemo, useState} from 'react';
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
import {
	Button,
	DropDown,
	DynamicForm,
	SlidingPanel,
	TextField,
	type TFormControl
} from 'cfs-react-library';
import {selectFile} from '../../../../../common/api';
import {type AiSupportingBackend} from '../../../../../common/types/ai-fusion-data-model';
import {getCfsConfigDict} from '../../../utils/config';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {formatControlsForDynamicForm} from '../../../utils/soc-controls';
import {usePartitions} from '../../../state/slices/partitions/partitions.selector';
import {type AIModelWithId} from '../../../state/slices/ai-tools/aiModel.reducer';
import {getControlsForAiBackend} from '../../../state/slices/ai-tools/ai-backends';
import {
	type AISupportingCore,
	getAiBackends,
	getAICores
} from '../../../utils/ai-tools';

export function ModelEditPanel() {
	const originalModel = useEditingAIModel();
	const editPanelOpen = useEditPanelOpen();
	const dispatch = useAppDispatch();
	const models = useAIModels();
	const aiSupportingCores = getAICores();
	const aiBackends = getAiBackends();

	const i10n = useLocaleContext()?.aitools.modelConfig;

	const [currentModel, setCurrentModel] = useState<AIModelWithId>(
		defaultEmptyAIModel
	);

	useEffect(() => {
		if (originalModel) {
			// Create copy of original model to avoid mutating it directly
			setCurrentModel(structuredClone(originalModel));
		} else {
			const defaultCore = aiSupportingCores[0];
			setCurrentModel({
				...defaultEmptyAIModel,
				id: crypto.randomUUID(),
				Target: {
					Core: defaultCore?.Id ?? '',
					Accelerator: defaultCore?.Accelerator
				},
				Backend: {
					Name: selectBackendForTarget(aiBackends, defaultCore),
					Extensions: {}
				}
			});
		}
	}, [originalModel, editPanelOpen, aiSupportingCores, aiBackends]);

	const [errors, setErrors] = useState<Record<string, string>>({});

	const validateModelConfig = useCallback(() => {
		const errors: Record<string, string> = {};

		// Model name
		if (!currentModel.Name) {
			errors.Name = i10n?.errors.modelNameRequired;
		}

		// Target core
		if (!currentModel.Target.Core) {
			errors.Target = i10n?.errors.targetRequired;
		}

		// Symbol name
		if (
			currentModel.Backend.Extensions?.Symbol &&
			!isValidCIdentifier(
				String(currentModel.Backend.Extensions.Symbol)
			)
		) {
			errors.Symbol = i10n?.errors.invalidCIdentifier;
		}

		if (!currentModel.Files.Model) {
			errors.ModelFile = i10n?.errors.modelFileRequired;
		}

		setErrors(errors);

		return Object.keys(errors).length === 0;
	}, [models, originalModel, currentModel, setErrors, i10n?.errors]);

	return (
		<SlidingPanel
			isCloseable
			isMinimised={!editPanelOpen}
			title={originalModel ? i10n?.configureModel : i10n?.addModel}
			closeSlider={() => dispatch(cancelEditingModel())}
			footer={
				<Button
					className={styles.saveButton}
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
					{originalModel ? i10n?.update : i10n?.add}
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

type ModelConfigurationProps = {
	readonly currentModel: AIModelWithId;
	readonly isEditing?: boolean;
	readonly setCurrentModel: (model: AIModelWithId) => void;
	readonly errors: Record<string, string>;
};

function ModelConfiguration({
	currentModel,
	isEditing,
	errors,
	setCurrentModel
}: ModelConfigurationProps) {
	const backends = getAiBackends();
	const cores = getAICores();
	const partitions = usePartitions();

	const availableCores = useMemo(
		() =>
			cores.filter(core =>
				Boolean(selectBackendForTarget(backends, core))
			),
		[cores, backends]
	);

	const i10n = useLocaleContext()?.aitools.modelConfig.fields;

	const [additionalControls, setAdditionalControls] = useState<
		TFormControl[]
	>([]);

	useEffect(() => {
		if (currentModel.Backend.Name) {
			getControlsForAiBackend(currentModel.Backend.Name)
				.then(controls => {
					if (controls) {
						const formattedControls = formatControlsForDynamicForm(
							controls,
							currentModel.Backend.Extensions ?? {},
							{}
						).map(control => {
							if (control.type === 'MemorySection') {
								return {
									...control,
									enum: partitions.map(partition => ({
										label: partition.displayName,
										value: partition.displayName,
										placeholder: ''
									}))
								};
							}

							return {...control, placeholder: ''};
						});
						setAdditionalControls(formattedControls);
					}
				})
				.catch(() => {
					console.error(
						`Failed to get controls for backend ${currentModel.Backend.Name}`
					);
				});
		}
	}, [currentModel.Backend, backends, partitions]);

	const fileComponents = useMemo(() => {
		const fileComponents: Record<string, JSX.Element> = {};

		additionalControls
			.filter(control => control.type === 'File')
			.forEach(control => {
				fileComponents[control.id] = (
					<FileField
						key={control.id}
						value={currentModel.Files?.[control.id] ?? ''}
						error={errors[control.id]}
						onInputChange={value => {
							setCurrentModel({
								...currentModel,
								Files: {
									...currentModel.Files,
									[control.id]: value
								}
							});
						}}
					/>
				);
			});

		return fileComponents;
	}, [additionalControls, currentModel, errors, setCurrentModel]);

	const [currentBackendForControls, setCurrentBackendForControls] =
		useState<string>(currentModel.Backend.Name);

	useEffect(() => {
		if (
			currentModel.Backend.Name &&
			currentModel.Backend.Name !== currentBackendForControls
		) {
			setCurrentBackendForControls(currentModel.Backend.Name);
			getControlsForAiBackend(currentModel.Backend.Name)
				.then(controls => {
					const defaultValues = controls.reduce<
						Record<string, string | number | boolean>
					>((acc, control) => {
						if (control.Default) {
							acc[control.Id] = control.Default;
						}

						if (
							(control.Type as unknown) === 'MemorySection' &&
							partitions.length > 0
						) {
							acc[control.Id] = partitions[0].displayName;
						}

						return acc;
					}, {});

					setCurrentModel({
						...currentModel,
						Backend: {
							...currentModel.Backend,
							Extensions: {
								...defaultValues,
								...currentModel.Backend.Extensions
							}
						}
					});
				})
				.catch(() => {
					console.error(
						`Failed to get controls for backend ${currentModel.Backend.Name}`
					);
				});
		}
	}, [
		currentModel.Backend.Name,
		backends,
		currentBackendForControls,
		partitions,
		currentModel,
		setCurrentModel
	]);

	return (
		<div className={styles.editArea}>
			<DynamicForm
				testId='model-config-form'
				data={currentModel.Backend.Extensions ?? {}}
				controls={[
					{
						id: 'Target',
						type: 'custom',
						name: i10n?.target,
						disabled: isEditing,
						required: true
					},
					{
						id: 'Name',
						type: 'text',
						name: i10n?.modelName,
						info: i10n?.modelNameTooltip,
						required: true
					},
					{
						id: 'ModelFile',
						type: 'file',
						name: i10n?.file,
						placeholder: 'Model Location',
						required: true
					},
					...(additionalControls ?? [])
				]}
				components={{
					Target: (
						<DropDown
							isDisabled={isEditing}
							options={availableCores.map(core => ({
								label: core.Name,
								value: `${core.Id}:${core.Accelerator ?? ''}`
							}))}
							controlId='target'
							error={errors.Target}
							currentControlValue={`${currentModel.Target.Core}:${currentModel.Target.Accelerator ?? ''}`}
							onHandleDropdown={value => {
								const [coreId, accelerator] = value.split(':');
								const core = availableCores.find(
									c =>
										c.Id === coreId &&
										(!accelerator || c.Accelerator === accelerator)
								);

								if (!core) {
									throw new Error(
										`Core with ID ${coreId} and accellerator ${accelerator} not found`
									);
								}

								const backend = selectBackendForTarget(
									backends,
									core
								);
								setCurrentModel({
									...currentModel,
									Target: {
										Core: coreId,
										Accelerator: accelerator ? accelerator : undefined
									},
									Backend: {
										Name: backend
									}
								});
							}}
						/>
					),
					Name: (
						<TextField
							placeholder='Model Name'
							inputVal={currentModel.Name}
							error={errors.Name}
							onInputChange={value => {
								const newName = value;
								setCurrentModel({
									...currentModel,
									Name: newName
								});
							}}
						/>
					),
					ModelFile: (
						<FileField
							value={currentModel.Files?.Model ?? ''}
							error={errors?.ModelFile}
							onInputChange={value => {
								setCurrentModel({
									...currentModel,
									Files: {...currentModel.Files, Model: value}
								});
							}}
						/>
					),
					...fileComponents
				}}
				errors={errors ?? {}}
				onControlChange={(id, val) => {
					setCurrentModel({
						...currentModel,
						Backend: {
							...currentModel.Backend,
							Extensions: {
								...currentModel.Backend.Extensions,
								[id]: val
							}
						}
					});
				}}
			/>
		</div>
	);
}

type FileFieldProps = {
	readonly value: string;
	readonly error?: string;
	readonly onInputChange: (path: string) => void;
};

function FileField({value, error, onInputChange}: FileFieldProps) {
	return (
		<TextField
			placeholder='Model Location'
			inputVal={value}
			error={error}
			startSlot={
				<Button
					className={styles.browseButton}
					onClick={async () => {
						const res = await selectFile({
							title: 'Select Model File',
							relativeToWorkspaceRoot: true
						});

						if (res) {
							onInputChange(res);
						}
					}}
				>
					Browse
				</Button>
			}
			onInputChange={value => {
				onInputChange(value);
			}}
		/>
	);
}

function isValidCIdentifier(name: string): boolean {
	return /^[a-zA-Z0-9_]+$/.test(name);
}

export function selectBackendForTarget(
	backends: Record<string, AiSupportingBackend>,
	aiCore: AISupportingCore
): string {
	const socConfig = getCfsConfigDict();

	return (
		Object.entries(backends).find(([_, data]) =>
			data.Targets.some(target => {
				const hardware = target.Hardware;

				if (target.FirmwarePlatform) {
					const project = socConfig?.projects.find(
						project => project.CoreId === aiCore.Id
					);

					if (
						!project ||
						!caseInsensitiveCompare(
							project.FirmwarePlatform,
							target.FirmwarePlatform
						)
					) {
						return false;
					}
				}

				if (
					hardware.Soc &&
					!caseInsensitiveCompare(hardware.Soc, socConfig?.Soc)
				) {
					return false;
				}

				if (
					hardware.Core &&
					!caseInsensitiveCompare(hardware.Core, aiCore.Id)
				) {
					return false;
				}

				if (
					hardware.Arch &&
					!caseInsensitiveCompare(hardware.Arch, aiCore.Family)
				) {
					return false;
				}

				if (
					(hardware.Accelerator &&
						!caseInsensitiveCompare(
							hardware.Accelerator,
							aiCore.Accelerator
						)) ??
					(hardware.Accelerator === null && aiCore.Accelerator)
				) {
					return false;
				}

				return true;
			})
		)?.[0] ?? ''
	);
}

function caseInsensitiveCompare(a?: string, b?: string): boolean {
	return a?.toUpperCase() === b?.toUpperCase();
}
