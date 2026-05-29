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

import {useCallback, useMemo, useState} from 'react';
import {
	Button,
	TextField,
	type TFormData,
	type TFormFieldValue
} from 'cfs-react-library';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../common/contexts/LocaleContext';
import {
	selectFile,
	checkDirectoryExists,
	generatePemKey
} from '../../../../../../common/api';
import {GENERATE_KEY_CONTROLS} from '../../../../constants/workspace-settings';
import type {KeyData} from '../../../../types/workspace-settings';
import KeyFormLayout from '../key-form/key-form-layout';

type GenerateKeyProps = {
	readonly existingKeyNames?: string[];
	readonly onCancel: () => void;
	readonly onSubmit: (keyData: KeyData) => void;
};

function GenerateKey({
	existingKeyNames = [],
	onCancel,
	onSubmit
}: GenerateKeyProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.settings?.security?.['sign-key-management'];

	const [formData, setFormData] = useState<TFormData>(() => {
		const defaults: TFormData = {};
		GENERATE_KEY_CONTROLS.forEach(control => {
			if (control.default !== undefined) {
				defaults[control.id] = control.default;
			}
		});

		return defaults;
	});

	const [errors, setErrors] = useState<Record<string, string>>({});

	const handleControlChange = useCallback(
		(controlId: string, value: TFormFieldValue) => {
			const sanitized =
				controlId === 'keyName' && typeof value === 'string'
					? value.replace(/[^a-zA-Z0-9 _.-]/g, '')
					: value;

			setFormData(prev => ({...prev, [controlId]: sanitized}));
		},
		[]
	);

	const handleBrowse = useCallback(async () => {
		const rawPath = await selectFile({
			canSelectFolders: true,
			title: 'Select Destination Path'
		});

		if (rawPath) {
			const path = rawPath.replace(/\\/g, '/');
			setErrors(({destinationPath: _, ...rest}) => rest);
			setFormData(prev => ({...prev, destinationPath: path}));
		}
	}, []);

	const handleDestinationPathChange = useCallback(
		(value: string) => {
			handleControlChange('destinationPath', value);
			setErrors(prev => {
				const next = {...prev};

				if (value.trim()) {
					delete next.destinationPath;
				} else {
					next.destinationPath = l10n?.destinationPathRequired;
				}

				return next;
			});
		},
		[handleControlChange, l10n?.destinationPathRequired]
	);

	const components = useMemo(
		() => ({
			destinationPath: (
				<TextField
					inputVal={(formData.destinationPath as string) ?? ''}
					placeholder='Choose path'
					dataTest='generate-key:destination-path'
					error={errors.destinationPath}
					startSlot={
						<Button appearance='icon' onClick={handleBrowse}>
							Browse
						</Button>
					}
					onInputChange={handleDestinationPathChange}
				/>
			)
		}),
		[
			formData.destinationPath,
			errors.destinationPath,
			handleBrowse,
			handleDestinationPathChange
		]
	);

	const handleSubmit = useCallback(async () => {
		const newErrors: Record<string, string> = {};
		GENERATE_KEY_CONTROLS.forEach(key => {
			if (key.required) {
				const val = formData[key.id];

				if (val === undefined || val === null || val === '') {
					newErrors[key.id] = `${key.name} is required`;
				}
			}
		});

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);

			return;
		}

		const keyName = (formData.keyName as string) ?? '';
		const destinationPath =
			(formData.destinationPath as string) ?? '';
		const fileName = keyName.endsWith('.pem')
			? keyName
			: `${keyName}.pem`;
		const trimmedPath = destinationPath.replace(/[\\/]+$/, '');
		const separator = destinationPath.includes('\\') ? '\\' : '/';
		const fullPath = `${trimmedPath}${separator}${fileName}`;

		if (
			existingKeyNames.some(
				existing => existing.toLowerCase() === fileName.toLowerCase()
			)
		) {
			setErrors(prev => ({
				...prev,
				keyName: l10n?.duplicateKey
			}));

			return;
		}

		const directoryExists =
			await checkDirectoryExists(destinationPath);

		if (!directoryExists) {
			setErrors(prev => ({
				...prev,
				destinationPath: l10n?.invalidPath
			}));

			return;
		}

		try {
			await generatePemKey(
				fullPath,
				(formData.algorithm as string) ?? ''
			);
		} catch (err) {
			setErrors(prev => ({
				...prev,
				keyName: err instanceof Error ? err.message : String(err)
			}));

			return;
		}

		onSubmit({
			name: fileName,
			path: fullPath,
			algorithm: (formData.algorithm as string) ?? '',
			description: (formData.description as string) || ''
		});
	}, [existingKeyNames, formData, l10n?.duplicateKey, l10n?.invalidPath, onSubmit]);

	return (
		<KeyFormLayout
			title={l10n?.generateNewKey}
			controls={GENERATE_KEY_CONTROLS}
			formData={formData}
			testId='key-management:generate-key-form'
			cancelLabel={l10n?.cancel}
			submitLabel={l10n?.generate}
			components={components}
			errors={errors}
			onControlChange={handleControlChange}
			onCancel={onCancel}
			onSubmit={handleSubmit}
		/>
	);
}

export default GenerateKey;
