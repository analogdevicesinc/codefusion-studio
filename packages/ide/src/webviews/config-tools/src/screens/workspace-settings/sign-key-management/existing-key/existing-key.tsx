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
	readPemAlgorithm,
	selectFile
} from '../../../../../../common/api';
import {EXISTING_KEY_CONTROLS} from '../../../../constants/workspace-settings';
import type {KeyData} from '../../../../types/workspace-settings';
import {
	isDuplicateKeyName,
	validatePemPath
} from '../../../../utils/application-package-validation';
import KeyFormLayout from '../key-form/key-form-layout';

type ExistingKeyProps = {
	readonly existingKeyNames?: string[];
	readonly onCancel: () => void;
	readonly onSubmit: (keyData: KeyData) => void;
};

function ExistingKey({
	existingKeyNames = [],
	onCancel,
	onSubmit
}: ExistingKeyProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.settings?.security?.['sign-key-management'];

	const [formData, setFormData] = useState<TFormData>({});

	const [errors, setErrors] = useState<Record<string, string>>({});

	const [detectedAlgorithm, setDetectedAlgorithm] =
		useState<string>('');

	const handleControlChange = useCallback(
		(controlId: string, value: TFormFieldValue) => {
			setFormData(prev => ({...prev, [controlId]: value}));
		},
		[]
	);

	const handleBrowse = useCallback(async () => {
		const rawPath = await selectFile({
			filters: {'PEM Files': ['pem']}
		});

		if (rawPath) {
			const path = rawPath.replace(/\\/g, '/');
			setFormData(prev => ({...prev, keyPath: path}));

			try {
				const algorithm = await readPemAlgorithm(path);
				setDetectedAlgorithm(algorithm);
			} catch {
				setDetectedAlgorithm('');
			}
		}
	}, []);

	const handleKeyPathChange = useCallback(
		async (value: string) => {
			handleControlChange('keyPath', value);
			const error = validatePemPath(value);
			setErrors(prev => {
				const next = {...prev};

				if (error) {
					next.keyPath = error;
				} else {
					delete next.keyPath;
				}

				return next;
			});

			if (error) {
				setDetectedAlgorithm('');

				return;
			}

			try {
				const algorithm = await readPemAlgorithm(value);
				setDetectedAlgorithm(algorithm);
			} catch {
				setDetectedAlgorithm('');
			}
		},
		[handleControlChange]
	);

	const components = useMemo(
		() => ({
			keyPath: (
				<TextField
					inputVal={(formData.keyPath as string) ?? ''}
					placeholder={l10n?.keyPathPlaceholder}
					dataTest='existing-key:key-path'
					error={errors.keyPath}
					startSlot={
						<Button appearance='icon' onClick={handleBrowse}>
							Browse
						</Button>
					}
					onInputChange={handleKeyPathChange}
				/>
			)
		}),
		[
			formData.keyPath,
			errors.keyPath,
			l10n,
			handleBrowse,
			handleKeyPathChange
		]
	);

	const handleSubmit = useCallback(() => {
		const newErrors: Record<string, string> = {};
		EXISTING_KEY_CONTROLS.forEach(control => {
			if (control.required) {
				const val = formData[control.id];

				if (val === undefined || val === null || val === '') {
					newErrors[control.id] = `${control.name} is required`;
				}
			}
		});

		const pemError = validatePemPath(
			(formData.keyPath as string) ?? ''
		);

		if (pemError) {
			newErrors.keyPath = pemError;
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);

			return;
		}

		const derivedName =
			((formData.keyPath as string) ?? '')
				.split(/[\\/]/)
				.filter(Boolean)
				.pop() ?? '';

		if (isDuplicateKeyName(derivedName, existingKeyNames)) {
			setErrors(prev => ({
				...prev,
				keyPath:
					l10n?.duplicateKey ??
					'A key with this name already exists. Please choose a different key.'
			}));

			return;
		}

		onSubmit({
			name: derivedName,
			path: (formData.keyPath as string) ?? '',
			algorithm: detectedAlgorithm,
			description: (formData.description as string) || undefined
		});
	}, [
		formData,
		existingKeyNames,
		onSubmit,
		detectedAlgorithm,
		l10n?.duplicateKey
	]);

	return (
		<KeyFormLayout
			title={l10n?.addExistingKey}
			controls={EXISTING_KEY_CONTROLS}
			formData={formData}
			testId='key-management:add-existing-key-form'
			cancelLabel={l10n?.cancel}
			submitLabel={l10n?.apply}
			components={components}
			errors={errors}
			onControlChange={handleControlChange}
			onCancel={onCancel}
			onSubmit={handleSubmit}
		/>
	);
}

export default ExistingKey;
