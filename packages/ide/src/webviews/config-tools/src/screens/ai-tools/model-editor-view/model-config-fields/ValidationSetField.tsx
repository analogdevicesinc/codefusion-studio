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

import {useEffect, useRef} from 'react';
import {TextField} from 'cfs-react-library';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import MultiFileSelect, {
	type MultiFileSelectItem
} from '@common/components/multi-file-select/multi-file-select';
import FileInputField from '@common/components/file-input-field/FileInputField';
import {selectFile} from '@common/api';
import type {ValidationData} from 'cfs-types/types/cfs-config';
import {
	getValidationMode,
	type ValidationMode
} from 'cfs-lib/dist/ai-tools/ai-tools-model-utils.js';

type ValidationEntryProperties = {
	label: string;
	expected: string;
};

type BackendExtensions = Record<string, string | number | boolean>;

type ValidationEntry = ValidationData[number];

/** Reads the label of an entry, or an empty string if it sets `expected`. */
function getLabel(entry: ValidationEntry): string {
	return 'label' in entry ? entry.label : '';
}

/** Reads the expected output of an entry, or an empty string if it sets `label`. */
function getExpected(entry: ValidationEntry): string {
	return 'expected' in entry ? entry.expected : '';
}

/** Builds an entry that sets only the field the validation mode uses. */
function createValidationEntry(
	input: string,
	label: string,
	expected: string,
	mode: ValidationMode | undefined
): ValidationEntry {
	if (mode === 'label') {
		return {input, label};
	}

	if (mode === 'expected') {
		return {input, expected};
	}

	// Trim only decides the mode; trimming the stored value would strip
	// spaces as the user types them.
	return expected.trim() ? {input, expected} : {input, label};
}

/** Drops the field the current validation mode does not use. */
function normalizeValidationEntry(
	entry: ValidationEntry,
	mode: ValidationMode | undefined
): ValidationEntry {
	return createValidationEntry(
		entry.input,
		getLabel(entry),
		getExpected(entry),
		mode
	);
}

/** Converts a file-select item into a `ValidationData` entry for the given mode. */
function toValidationEntry(
	{path, properties}: MultiFileSelectItem<ValidationEntryProperties>,
	mode: ValidationMode | undefined
): ValidationEntry {
	return createValidationEntry(
		path,
		properties?.label ?? '',
		properties?.expected ?? '',
		mode
	);
}

type ValidationSetFieldProps = {
	readonly validationData: ValidationData | undefined;
	readonly extensions: BackendExtensions | undefined;
	readonly error?: string;
	readonly onChange: (validationData: ValidationData) => void;
};

/**
 * Validation set input. Each entry carries either a label or an expected
 * output, depending on the selected quantization metric.
 */
export function ValidationSetField({
	validationData,
	extensions,
	error,
	onChange
}: ValidationSetFieldProps): JSX.Element {
	const i10n = useLocaleContext()?.aitools.modelConfig.fields;
	const validationMode = getValidationMode(extensions);
	const previousModeRef = useRef(validationMode);

	// Switching the metric can change which validation field is used, so
	// drop the stale one to keep it out of the output. Skipped while no
	// metric was set yet, so loading an existing model leaves it untouched.
	useEffect(() => {
		const previousMode = previousModeRef.current;
		previousModeRef.current = validationMode;

		if (previousMode === validationMode) {
			return;
		}

		if (validationData?.length) {
			onChange(
				validationData.map(entry =>
					normalizeValidationEntry(entry, validationMode)
				)
			);
		}
		// Only react to mode changes; data and callback are read as of that change
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [validationMode]);

	return (
		<MultiFileSelect<ValidationEntryProperties>
			title={i10n?.validationFiles}
			files={(validationData ?? []).map(entry => ({
				path: entry.input,
				properties: {
					label: getLabel(entry),
					expected: getExpected(entry)
				}
			}))}
			error={error}
			selectFileOptions={{
				relativeToWorkspaceRoot: true
			}}
			// Without a metric, default to showing the label field
			renderFileProperties={({file, onPropertiesChange}) =>
				validationMode !== 'expected' ? (
					<TextField
						inputVal={file.properties?.label}
						label={i10n?.label}
						dataTest='validation-label'
						onInputChange={val => {
							onPropertiesChange({
								...(file.properties ?? {expected: ''}),
								label: val
							});
						}}
					/>
				) : (
					<FileInputField
						value={file.properties?.expected ?? ''}
						label={i10n?.expected}
						dataTest='validation-expected'
						onBrowse={async () =>
							selectFile({
								title: 'Select File',
								filters: {files: ['*']},
								relativeToWorkspaceRoot: true
							})
						}
						onInputChange={val => {
							onPropertiesChange({
								...(file.properties ?? {label: ''}),
								expected: val
							});
						}}
					/>
				)
			}
			dataTest='validation-set'
			onFilesChange={files => {
				onChange(
					files.map(file => toValidationEntry(file, validationMode))
				);
			}}
		/>
	);
}
