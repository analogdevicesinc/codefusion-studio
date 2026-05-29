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

import {type ReactNode} from 'react';
import {Button, CloseIcon} from 'cfs-react-library';
import {selectFile} from '@common/api';
import {getLocalization} from '@common/utils/localization';
import styles from './multi-file-select.module.scss';

export type MultiFileSelectItem<TFileProperties = undefined> = {
	readonly path: string;
	readonly properties?: TFileProperties;
};

/**
 * Extracts the file name from a full file path.
 * Handles both Windows (\) and Unix (/) path separators.
 */
const getFileNameFromPath = (filePath: string): string => {
	// Handle both Windows (\) and Unix (/) path separators
	const lastSeparatorIndex = Math.max(
		filePath.lastIndexOf('/'),
		filePath.lastIndexOf('\\')
	);

	return lastSeparatorIndex === -1
		? filePath
		: filePath.substring(lastSeparatorIndex + 1);
};

type MultiFileSelectProps<TFileProperties> = {
	readonly title: string;
	readonly files: Array<MultiFileSelectItem<TFileProperties>>;
	readonly onFilesChange: (
		files: Array<MultiFileSelectItem<TFileProperties>>
	) => void;
	readonly renderFileProperties?: (params: {
		readonly file: MultiFileSelectItem<TFileProperties>;
		readonly index: number;
		onPropertiesChange: (
			properties: TFileProperties | undefined
		) => void;
	}) => ReactNode;
	readonly browseTitle?: string;
	readonly emptySelectionText?: string;
	readonly selectFileOptions?: Parameters<typeof selectFile>[0];
	readonly dataTest?: string;
};

export default function MultiFileSelect<
	TFileProperties = undefined
>({
	title,
	files,
	onFilesChange,
	renderFileProperties,
	browseTitle,
	emptySelectionText,
	selectFileOptions,
	dataTest
}: MultiFileSelectProps<TFileProperties>) {
	const l10n = getLocalization('common');
	const resolvedBrowseTitle =
		browseTitle ?? l10n?.multiFileSelect?.browse ?? 'Browse';
	const resolvedEmptySelectionText =
		emptySelectionText ??
		l10n?.multiFileSelect?.noFileChosen ??
		'No file chosen';

	const handleBrowse = async () => {
		const selectedFile = await selectFile(selectFileOptions);

		if (!selectedFile) {
			return;
		}

 		const normalizedSelectedFile = selectedFile.replace(/\\/g, '/');

		if (files.some(file => file.path === normalizedSelectedFile)) {
			return;
		}

		const newFile: MultiFileSelectItem<TFileProperties> = {
			path: selectedFile
		};

		onFilesChange([
			...files,
			newFile
		]);
	};

	const handleRemoveFile = (removeIndex: number) => {
		onFilesChange(
			files.filter((_file, index) => index !== removeIndex)
		);
	};

	const handlePropertiesChange = (
		index: number,
		properties: TFileProperties | undefined
	) => {
		onFilesChange(
			files.map((file, fileIndex) =>
				fileIndex === index ? {...file, properties} : file
			)
		);
	};

	return (
		<div className={styles.container} data-test={dataTest}>
			<label className={styles.title}>{title}</label>

			<div className={styles.selectionRow}>
				<Button
					dataTest={`${dataTest}-browse`}
					className={styles.browseButton}
					onClick={handleBrowse}
				>
					{resolvedBrowseTitle}
				</Button>

				{files.length === 0 && (
					<span className={styles.emptySelectionText}>
						{resolvedEmptySelectionText}
					</span>
				)}
			</div>

			{files.length > 0 && (
				<ul className={styles.fileList}>
					{files.map((file, index) => (
						<li key={file.path} className={styles.fileListItem}>
							<div className={styles.fileEntry}>
								<span className={styles.filePath} title={file.path}>
									{getFileNameFromPath(file.path)}
								</span>

								<Button
									appearance='icon'
									className={styles.removeFileButton}
									dataTest={`${dataTest}-remove-${index}`}
									onClick={() => {
										handleRemoveFile(index);
									}}
								>
									<CloseIcon />
								</Button>
							</div>

							{renderFileProperties && (
								<div className={styles.fileProperties}>
									{renderFileProperties({
										file,
										index,
										onPropertiesChange(properties) {
											handlePropertiesChange(index, properties);
										}
									})}
								</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
