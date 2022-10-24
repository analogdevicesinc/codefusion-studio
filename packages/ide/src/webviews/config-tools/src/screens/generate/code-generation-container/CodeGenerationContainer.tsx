/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import {useState, useEffect} from 'react';
import type {ExportEngine} from '../../../../../common/types/engines';
import ExportEnginesList from '../export-engines-list/ExportEnginesList';
import {
	VSCodeButton,
	VSCodeProgressRing
} from '@vscode/webview-ui-toolkit/react';

import styles from './codeGeneration.module.scss';
import {generateCode, getExportEngines} from '../../../utils/api';
import {
	getIsDocumentUnsaved,
	showSaveDialog
} from '../../../../../common/api';
import {getFirmwarePlatform} from '../../../utils/firmware-platform';
import EightColumnLayout from '../../../components/eight-column-layout/EightColumnLayout';

function CodeGenerationContainer() {
	const [activeEngine, setActiveEngine] = useState('');

	const [engines, setEngines] = useState<
		ExportEngine[] | undefined
	>();

	const [isGenerationInProgress, setIsGenerationInProgress] =
		useState(false);

	const firmwarePlatform = getFirmwarePlatform()?.toLowerCase();

	const handleCodeGeneration = async () => {
		const isDocumentUnsaved = await getIsDocumentUnsaved();

		if (isDocumentUnsaved) {
			await showSaveDialog()
				.then(async uri => {
					if (typeof uri === 'string') {
						await generateCode(activeEngine).then(() => {
							setIsGenerationInProgress(false);
						});
					}
				})
				.catch(err => {
					console.error(`Unexpected error in save dialog: ${err}`);
				});
		} else {
			await generateCode(activeEngine).then(() => {
				setIsGenerationInProgress(false);
			});
		}
	};

	useEffect(() => {
		if (engines !== undefined) return;

		getExportEngines()
			.then(modules => {
				const applicableModules = firmwarePlatform
					? modules.filter(module =>
							firmwarePlatform.toLowerCase().includes(module.name)
						)
					: modules;

				setEngines(applicableModules);

				if (activeEngine === '') {
					setActiveEngine(applicableModules[0].name);
				}
			})
			.catch(e => {
				console.error(e);
			});
	});

	return isGenerationInProgress ? (
		<VSCodeProgressRing />
	) : (
		<EightColumnLayout
			header='Generate Code'
			subtitle='Select the export module to generate code.'
			body={
				<div className={styles.enginesList}>
					<ExportEnginesList
						engines={engines}
						activeEngine={activeEngine}
						handleEngineSelection={e => {
							setActiveEngine((e.currentTarget as HTMLElement).id);
						}}
					/>
				</div>
			}
			footer={
				<VSCodeButton
					className={styles.cta}
					disabled={isGenerationInProgress}
					onClick={handleCodeGeneration}
				>
					Generate code
				</VSCodeButton>
			}
		/>
	);
}

export default CodeGenerationContainer;
