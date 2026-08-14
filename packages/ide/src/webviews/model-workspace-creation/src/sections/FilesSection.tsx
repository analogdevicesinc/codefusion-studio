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
	useRunModelOn,
	useSampleData,
	useSoc,
	useWorkspaceName
} from '../state/slices/workspace.selector';
import {useCatalogContext} from '../contexts/CatalogContext';
import {useAppDispatch} from '../state/store';
import {
	setModelFile,
	setSampleData,
	setWorkspaceName,
	validateWorkspace
} from '../state/slices/workspace-reducer';
import {checkCompatibility} from '../state/thunks/workspace-thunks';
import {
	selectFileRequest,
	getPreferenceRequest
} from '@constants/messages/vscode-api-messages';
import {
	CfsModelZoo,
	type ModelZooSelectionData
} from '../../../common/components/cfs-model-zoo/CfsModelZoo';
import {messenger} from '../../../common/contexts/MessengerContext';
import {useMemo, useState} from 'react';
import {getZooModelDisplayName} from '../../../common/components/cfs-model-zoo/model-zoo-utils';
import type {Draft} from '@reduxjs/toolkit';

async function fetchPreference(id: string) {
	return messenger.sendRequest(
		getPreferenceRequest,
		{type: 'extension'},
		{id}
	);
}

export function FilesSection() {
	const l10n = useLocaleContext()?.filesSection;
	const modelFile = useModelFile();
	const sampleData = useSampleData();
	const runModelOn = useRunModelOn();
	const {catalog} = useCatalogContext();
	const soc = useSoc();
	const workspaceName = useWorkspaceName();
	const errors = useErrors();

	const coreDataModelIds = useMemo(
		() =>
			runModelOn
				.map(
					coreId =>
						catalog
							.find(s => s.name === soc)
							?.cores.find(c => c.id === coreId)?.dataModelCoreID
				)
				.filter((id): id is string => id !== undefined),
		[catalog, runModelOn, soc]
	);

	const dispatch = useAppDispatch();

	const [modelZooOpen, setModelZooOpen] = useState(false);

	return (
		<section className={styles.filesSection}>
			<CfsModelZoo
				isOpen={modelZooOpen}
				defaultCoreFilter={coreDataModelIds}
				defaultSocFilter={soc ? [soc] : []}
				initialModelSelection={
					typeof modelFile === 'object' ? modelFile : undefined
				}
				getPreference={fetchPreference}
				selectFile={async (options?: {
					title?: string;
					filters?: Record<string, string[]>;
					relativeToWorkspaceRoot?: boolean;
				}) =>
					messenger.sendRequest(
						selectFileRequest,
						{type: 'extension'},
						options ?? {}
					)
				}
				onClose={() => {
					setModelZooOpen(false);
				}}
				onLocalFileSelected={(filePath: string) => {
					dispatch(setModelFile(filePath));
					void dispatch(checkCompatibility());
				}}
				onModelSelected={selection => {
					dispatch(setModelFile(selection));
					void dispatch(checkCompatibility());
				}}
			/>
			<h2>{l10n?.title}</h2>
			<FileInputField
				label={l10n?.modelFile}
				placeholder={l10n?.fileFieldPlaceholder}
				tooltip={l10n?.modelFileTooltip}
				value={getZooModelDisplayName(modelFile)}
				error={errors?.modelFile}
				dataTest='model-file'
				onInputChange={(val: string) => {
					dispatch(setModelFile(val));
					void dispatch(checkCompatibility());

					if (errors?.modelFile) {
						dispatch(validateWorkspace(catalog));
					}
				}}
				onBrowse={async () => {
					setModelZooOpen(true);

					return undefined;
				}}
			/>
			<FileInputField
				label={l10n?.sampleData}
				placeholder={l10n?.fileFieldPlaceholder}
				tooltip={l10n?.sampleDataTooltip}
				value={getSampleDataValue(modelFile, sampleData) ?? ''}
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
						dispatch(validateWorkspace(catalog));
					}
				}}
			/>
		</section>
	);
}

function getSampleDataValue(
	modelSelection: string | Draft<ModelZooSelectionData>,
	sampleData: string
) {
	if (sampleData) {
		return sampleData;
	}

	if (typeof modelSelection === 'object') {
		return `${modelSelection.model.name} - sample data`;
	}

	return undefined;
}
