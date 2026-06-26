/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
	useEffect,
	useMemo,
	useState
} from 'react';
import {
	DropDown,
	DynamicForm,
	TextField,
	type TFormControl
} from 'cfs-react-library';
import {useLocaleContext} from '../../../../../common/contexts/LocaleContext';
import {formatControlsForDynamicForm} from '../../../utils/soc-controls';
import {usePartitions} from '../../../state/slices/partitions/partitions.selector';
import {type AIModelWithId} from '../../../state/slices/ai-tools/aiModel.reducer';
import {getControlsForAiBackend} from '../../../state/slices/ai-tools/ai-backends';
import {
	getAiBackends,
	getAIModelTargets
} from '../../../utils/ai-tools';
import MultiFileSelect from '../../../../../common/components/multi-file-select/multi-file-select';
import FileInputField from '../../../../../common/components/file-input-field/FileInputField';
import {selectFile} from '../../../../../common/api';
import type {Partition} from '../../../state/slices/partitions/partitions.reducer';
import type {SocControl} from 'cfs-types';

async function browse() {
	return selectFile({
		title: 'Select Model File',
		filters: {files: ['*']},
		relativeToWorkspaceRoot: true
	});
}

type ModelConfigurationProps = {
	readonly currentModel: AIModelWithId;
	readonly isEditing?: boolean;
	readonly setCurrentModel: Dispatch<SetStateAction<AIModelWithId>>;
	readonly errors: Record<string, string>;
};

export function ModelConfiguration({
	currentModel,
	isEditing,
	errors,
	setCurrentModel
}: ModelConfigurationProps) {
	const backends = getAiBackends();
	const modelTargets = getAIModelTargets();
	const partitions = usePartitions();

	const i10n = useLocaleContext()?.aitools.modelConfig.fields;

	const [additionalControls, setAdditionalControls] = useState<
		TFormControl[]
	>([]);

	const [controlDefaults, setControlDefaults] = useState<
		Record<string, Record<string, string | number | boolean>>
	>({});

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
						const controlsDefaults = getControlsDefaults(
							controls,
							partitions
						);
						setControlDefaults(prev => ({
							...prev,
							[currentModel.Backend!.Name]: controlsDefaults
						}));

						// Only set this initially when there are no extensions yet
						if (
							currentModel.Backend &&
							!currentModel.Backend?.Extensions
						) {
							setCurrentModel({
								...currentModel,
								Backend: {
									...currentModel.Backend,
									Extensions: controlsDefaults
								}
							});
						}
					}
				})
				.catch(() => {
					console.error(
						`Failed to get controls for backend ${currentModel.Backend?.Name}`
					);
				});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [
		currentModel.Backend?.Name,
		backends,
		partitions,
		setCurrentModel
	]);

	const fileComponents = useMemo(() => {
		const fileComponents: Record<string, JSX.Element> = {};

		additionalControls
			.filter(control => control.type === 'File')
			.forEach(control => {
				fileComponents[control.id] = (
					<FileInputField
						key={control.id}
						value={currentModel.Files?.[control.id] ?? ''}
						error={errors[control.id]}
						onBrowse={browse}
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
							options={modelTargets.map(core => ({
								label: core.Name,
								value: `${core.Id}:${core.Accelerator ?? ''}:${core.Backend}`
							}))}
							controlId='target'
							error={errors.Target}
							currentControlValue={`${currentModel.Target.Core}:${currentModel.Target.Accelerator ?? ''}:${currentModel.Backend?.Name ?? ''}`}
							dataTest='model-target-dropdown'
							onHandleDropdown={value => {
								const [coreId, accelerator, backend] =
									value.split(':');
								const core = modelTargets.find(
									c =>
										c.Id === coreId &&
										(!accelerator || c.Accelerator === accelerator) &&
										(!backend || c.Backend === backend)
								);

								if (!core) {
									throw new Error(
										`Core with ID ${coreId} and accelerator ${accelerator} not found`
									);
								}

								setCurrentModel({
									...currentModel,
									Target: {
										Core: coreId,
										Accelerator: accelerator ? accelerator : undefined
									},
									Backend: {
										Name: core.Backend,
										Extensions: controlDefaults[core.Backend]
											? {
													...controlDefaults[core.Backend]
												}
											: undefined
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
						<FileInputField
							value={currentModel.Files?.Model ?? ''}
							error={errors?.ModelFile}
							dataTest='model-file'
							onInputChange={value => {
								setCurrentModel({
									...currentModel,
									Files: {...currentModel.Files, Model: value}
								});
							}}
							onBrowse={browse}
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
					Labels: (
						<TextField
							placeholder='1,2,3,...'
							inputVal={currentModel.Backend?.Labels?.join(',') ?? ''}
							dataTest='labels'
							onInputChange={value => {
								setCurrentModel({
									...currentModel,
									Backend: {
										...currentModel.Backend!,
										Labels: value ? value.split(',') : []
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

function getControlsDefaults(
	controls: SocControl[],
	partitions: Partition[]
) {
	return controls.reduce<Record<string, string | number | boolean>>(
		(acc, control) => {
			if (control.Default !== undefined && control.Default !== null) {
				acc[control.Id] = control.Default;
			}

			if (
				(control.Type as unknown) === 'MemorySection' &&
				partitions.length > 0
			) {
				acc[control.Id] = partitions[0].displayName;
			}

			return acc;
		},
		{}
	);
}
