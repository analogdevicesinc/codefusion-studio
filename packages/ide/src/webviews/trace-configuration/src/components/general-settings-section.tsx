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

import {useLocaleContext} from '@common/contexts/LocaleContext';
import {type TraceConfiguration} from '@ide-types/trace-types';
import styles from './trace-configuration-sections.module.scss';
import FileInputField from '@common/components/file-input-field/FileInputField';
import {useMessenger} from '@common/contexts/MessengerContext';
import {selectFileRequest} from '@constants/messages/vscode-api-messages';

type Props = {
	readonly config: TraceConfiguration;
	readonly isDisabled: boolean;
	readonly onChange: <K extends keyof TraceConfiguration>(
		key: K,
		value: TraceConfiguration[K]
	) => void;
};

export default function GeneralSettingsSection({
	config,
	isDisabled,
	onChange
}: Props) {
	const messenger = useMessenger();
	const l10n = useLocaleContext()?.configurationView;

	// Currently not supported by the backend, will be added in a future release (CFSIO-20531)
	// useEffect(() => {
	// 	messenger
	// 		.sendRequest(getAvailableAiModelsRequest, {type: 'extension'})
	// 		.then(models => {
	// 			setAiModels(models);
	// 		})
	// 		.catch(err => {
	// 			console.error('Failed to fetch available AI models', err);
	// 		});
	// }, [messenger]);

	return (
		<section
			data-test='general-settings-section'
			className={`${styles.configurationSection} ${isDisabled ? styles.disabled : ''}`}
		>
			<h5 className={styles.title}>{l10n?.generalSettings?.title}</h5>

			<div className={styles.inputWrapper}>
				<label className={styles.label}>
					{l10n?.generalSettings?.outputDirectory}
				</label>

				<FileInputField
					dataTest='output-directory'
					value={config.outputDirectory}
					onInputChange={path => {
						onChange('outputDirectory', path);
					}}
					onBrowse={async () =>
						messenger.sendRequest(
							selectFileRequest,
							{type: 'extension'},
							{
								title: l10n?.generalSettings?.selectOutputDirectory,
								selectionTarget: 'folder'
							}
						)
					}
				/>
			</div>

			<div className={styles.inputWrapper}>
				<label className={styles.label}>
					{l10n?.generalSettings?.elfFile}
				</label>
				<FileInputField
					dataTest='elf-file'
					value={config.elfFile}
					error={
						config.elfFile
							? undefined
							: l10n?.generalSettings?.elfFileWarning
					}
					onInputChange={path => {
						onChange('elfFile', path);
					}}
					onBrowse={async () =>
						messenger.sendRequest(
							selectFileRequest,
							{type: 'extension'},
							{
								title: l10n?.generalSettings?.selectElfFile,
								selectionTarget: 'file',
								filters: {
									ELF: ['elf']
								}
							}
						)
					}
				/>
			</div>

			<div className={styles.inputWrapper}>
				<label className={styles.label}>
					{l10n?.generalSettings?.buildDir}
				</label>
				<FileInputField
					dataTest='build-dir'
					value={config.buildDir}
					onInputChange={path => {
						onChange('buildDir', path);
					}}
					onBrowse={async () =>
						messenger.sendRequest(
							selectFileRequest,
							{type: 'extension'},
							{
								title: l10n?.generalSettings?.selectBuildDirectory,
								selectionTarget: 'folder'
							}
						)
					}
				/>
			</div>

			{/* // Currently not supported by the backend, will be added in a future release (CFSIO-20531) */}
			{/* aiModels.length > 0 && (
				<div className={styles.inputWrapper}>
					<label className={styles.label}>
						{l10n?.generalSettings?.aiModels}
						<Tooltip
							title={l10n?.generalSettings?.aiModelsTooltip}
							type='long'
						>
							<InfoIcon className={styles.infoIcon} />
						</Tooltip>
					</label>

					<MultiSelect
						allowClear
						variant='form'
						dataTest='ai-models'
						size='lg'
						className={styles.modelsSelect}
						dropdownText={
							config.aiModels.length > 0
								? aiModels
										.filter(model =>
											config.aiModels.includes(model.Files.Model)
										)
										.map(model => model.Name)
										.join(', ')
								: l10n?.generalSettings?.selectAiModels
						}
						options={aiModels.map(model => ({
							label: model.Name,
							value: model.Files.Model
						}))}
						initialSelectedOptions={config.aiModels.map(modelFile => {
							const model = aiModels.find(
								m => m.Files.Model === modelFile
							);

							return model
								? {label: model.Name, value: model.Files.Model}
								: {label: modelFile, value: modelFile};
						})}
						onSelection={selection => {
							onChange(
								'aiModels',
								selection.map(option => option.value)
							);
						}}
					/>
				</div>
			) */}

			{/* // Currently not supported by the backend, will be added in a future release */}
			{/* <div className={styles.inputWrapper}>
				<CheckBox
					checked={config.autoReset}
					onChange={() => {
						onChange('autoReset', !config.autoReset);
					}}
				>
					<label className={styles.description}>
						{l10n?.generalSettings?.autoResetOption}
					</label>
				</CheckBox>
			</div> */}
		</section>
	);
}
