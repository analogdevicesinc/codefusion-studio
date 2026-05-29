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

import styles from './FilesSection.module.scss';
import FileInputField from '../../../common/components/file-input-field/FileInputField';
import {TextField} from 'cfs-react-library';
import {useLocaleContext} from '../../../common/contexts/LocaleContext';
import {
	useErrors,
	useModelFile,
	useSampleData,
	useWorkspaceName
} from '../state/slices/workspace.selector';
import {useAppDispatch} from '../state/store';
import {
	setModelFile,
	setSampleData,
	setWorkspaceName,
	validateWorkspace
} from '../state/slices/workspace-reducer';
import {useMessenger} from '../../../common/contexts/MessengerContext';
import {checkCompatibility} from '../state/thunks/workspace-thunks';
import {selectFileRequest} from '@constants/messages/vscode-api-messages';

export function FilesSection() {
	const l10n = useLocaleContext()?.filesSection;
	const modelFile = useModelFile();
	const sampleData = useSampleData();
	const messenger = useMessenger();
	const workspaceName = useWorkspaceName();
	const errors = useErrors();

	const dispatch = useAppDispatch();

	return (
		<section className={styles.filesSection}>
			<h2>{l10n?.title}</h2>
			<FileInputField
				label={l10n?.modelFile}
				placeholder={l10n?.fileFieldPlaceholder}
				tooltip={l10n?.modelFileTooltip}
				value={modelFile}
				error={errors?.modelFile}
				dataTest='model-file'
				onInputChange={(val: string) => {
					dispatch(setModelFile(val));
					void dispatch(checkCompatibility());

					if (errors?.modelFile) {
						dispatch(validateWorkspace());
					}
				}}
				onBrowse={async () =>
					messenger.sendRequest(
						selectFileRequest,
						{type: 'extension'},
						{
							filters: {files: ['*']},
							title: 'select model File'
						}
					)
				}
			/>
			<FileInputField
				label={l10n?.sampleData}
				placeholder={l10n?.fileFieldPlaceholder}
				tooltip={l10n?.sampleDataTooltip}
				value={sampleData}
				error={errors?.sampleData}
				dataTest='sample-data'
				onInputChange={(val: string) => {
					dispatch(setSampleData(val));
					void dispatch(checkCompatibility());
				}}
				onBrowse={async () =>
					messenger.sendRequest(
						selectFileRequest,
						{type: 'extension'},
						{
							filters: {files: ['*']},
							title: 'select sample Data File'
						}
					)
				}
			/>
			<TextField
				optional
				inputVal={workspaceName}
				label={l10n?.workspaceName}
				dataTest='workspace-name'
				placeholder={l10n?.workspaceNamePlaceholder}
				error={errors?.workspaceName}
				onInputChange={(val: string) => {
					dispatch(setWorkspaceName(val));

					if (errors?.workspaceName) {
						dispatch(validateWorkspace());
					}
				}}
			/>
		</section>
	);
}
