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
import {
	type Dispatch,
	type SetStateAction,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState
} from 'react';
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
import MultiFileSelect from '../../../../../common/components/multi-file-select/multi-file-select';

export function ModelEditPanel() {
	const originalModel = useEditingAIModel();
	const editPanelOpen = useEditPanelOpen();
	const dispatch = useAppDispatch();
	const aiSupportingCores = getAICores();
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

		setErrors({});
	}, [originalModel, editPanelOpen, aiSupportingCores, aiBackends]);

	const validateModelConfig = useCallback(() => {
		const errors: Record<string, string> = {};

		// Fail if model name is empty
		if (!currentModel.Name) {
			errors.Name = l10n?.errors.modelNameRequired;
		}

		// Fail if model name already exists (and is not the original name when editing)
		if (
			models.some(
				model =>
					model.Name === currentModel.Name && model !== originalModel
			)
		) {
			errors.Name = l10n?.errors.modelNameExists;
		}

		// Target core
		if (!currentModel.Target.Core) {
			errors.Target = l10n?.errors.targetRequired;
		}

		// Symbol name
		if (
			currentModel.Backend?.Extensions?.Symbol &&
			!isValidCIdentifier(
				String(currentModel.Backend.Extensions.Symbol)
			)
		) {
			errors.Symbol = l10n?.errors.invalidCIdentifier;
		}

		if (!currentModel.Files.Model) {
			errors.ModelFile = l10n?.errors.modelFileRequired;
		}

		setErrors(errors);

		return Object.keys(errors).length === 0;
	}, [currentModel, l10n, models, originalModel]);

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

type ModelConfigurationProps = {
	readonly currentModel: AIModelWithId;
	readonly isEditing?: boolean;
	readonly setCurrentModel: Dispatch<SetStateAction<AIModelWithId>>;
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
		if (currentModel.Backend?.Name) {
			getControlsForAiBackend(currentModel.Backend.Name)
				.then(controls => {
					if (controls) {
						const formattedControls = formatControlsForDynamicForm(
							controls,
							currentModel ?? {},
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
						`Failed to get controls for backend ${currentModel.Backend?.Name}`
					);
				});
		}
	}, [currentModel, backends, partitions]);

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
							// Remove the file from the model if the value is empty to avoid confusion about whether an empty string is a valid path or not since it could be relative.
							if (!value) {
								delete currentModel.Files?.[control.id];
							}

							setCurrentModel({
								...currentModel,
								Files: {
									...currentModel.Files,
									...(value ? {[control.id]: value} : {})
								}
							});
						}}
					/>
				);
			});

		return fileComponents;
	}, [additionalControls, currentModel, errors, setCurrentModel]);

	const previousBackendRef = useRef<string | undefined>(
		currentModel.Backend?.Name
	);

	// Reset the values of the additional controls when the backend changes
	useEffect(() => {
		const backendName = currentModel.Backend?.Name;

		if (!backendName || backendName === previousBackendRef.current) {
			return;
		}

		previousBackendRef.current = backendName;

		getControlsForAiBackend(backendName)
			.then(controls => {
				const defaultValues = controls.reduce<
					Record<string, string | number | boolean>
				>((acc, control) => {
					if (
						control.Default !== undefined &&
						control.Default !== null
					) {
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

				setCurrentModel(model => {
					if (previousBackendRef.current !== model.Backend?.Name) {
						// If the backend has already changed again since the async call was made,
						return model;
					}

					return {
						...currentModel,
						Backend: {
							...currentModel.Backend!,
							Extensions: {
								...defaultValues,
								...currentModel.Backend?.Extensions
							}
						}
					};
				});
			})
			.catch(() => {
				console.error(
					`Failed to get controls for backend ${backendName}`
				);
			});
		// Should only run when the backend name changes.
		// But exhaustive-deps rule requires it to rerun every time the currentModel changes.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentModel.Backend?.Name, partitions, setCurrentModel]);

	return (
		<div className={styles.editArea} data-test='model-edit-panel'>
			<DynamicForm
				testId='model-config-form'
				data={currentModel.Backend?.Extensions ?? {}}
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
							dataTest='model-target-dropdown'
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
							dataTest='model-name'
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
							dataTest='model-file'
							onInputChange={value => {
								setCurrentModel({
									...currentModel,
									Files: {...currentModel.Files, Model: value}
								});
							}}
						/>
					),
					CalibrationSet: (
						<MultiFileSelect
							title={i10n?.calibrationFiles}
							files={(
								currentModel.Backend?.CalibrationData ?? []
							).map(file => ({path: file}))}
							dataTest='calibration-set'
							selectFileOptions={{
								relativeToWorkspaceRoot: true
							}}
							onFilesChange={files => {
								setCurrentModel({
									...currentModel,
									Backend: {
										...currentModel.Backend!,
										CalibrationData: files.map(file => file.path)
									}
								});
							}}
						/>
					),
					ValidationSet: (
						<MultiFileSelect<{expectedReturn: string}>
							title={i10n?.validationFiles}
							files={(currentModel.Backend?.ValidationData ?? []).map(
								([path, expectedReturn]) => ({
									path,
									properties: {expectedReturn}
								})
							)}
							selectFileOptions={{
								relativeToWorkspaceRoot: true
							}}
							renderFileProperties={({file, onPropertiesChange}) => (
								<TextField
									inputVal={file.properties?.expectedReturn}
									label={i10n?.expectedReturn}
									onInputChange={val => {
										onPropertiesChange({
											...(file.properties ?? {}),
											expectedReturn: val
										});
									}}
								/>
							)}
							dataTest='validation-set'
							onFilesChange={files => {
								setCurrentModel({
									...currentModel,
									Backend: {
										...currentModel.Backend!,
										ValidationData: files.map(file => [
											file.path,
											file.properties?.expectedReturn ?? ''
										])
									}
								});
							}}
						/>
					),
					...fileComponents
				}}
				errors={errors ?? {}}
				onControlChange={(id, val) => {
					if (id === 'Symbol' && typeof val === 'string') {
						val = val.substring(0, 63);
					}

					setCurrentModel({
						...currentModel,
						Backend: {
							...currentModel.Backend!,
							Extensions: {
								...currentModel.Backend?.Extensions,
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
	readonly dataTest?: string;
};

function FileField({
	value,
	error,
	dataTest,
	onInputChange
}: FileFieldProps) {
	return (
		<TextField
			placeholder='Model Location'
			dataTest={dataTest}
			inputVal={value}
			error={error}
			startSlot={
				<Button
					className={styles.browseButton}
					dataTest={dataTest + '-browse-button'}
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
					hardware.Family &&
					!caseInsensitiveCompare(hardware.Family, aiCore.Family)
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
