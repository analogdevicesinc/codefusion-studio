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

import {useCallback, useState} from 'react';
import {Button, HexInputField, TextField} from 'cfs-react-library';
import type {Image} from '../../../../../types/application-packages';
import {
	validatePath,
	type ImageValidationErrors
} from '../../../../../utils/application-package-validation';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../../../common/contexts/LocaleContext';
import styles from '../../image-content/image-content.module.scss';
import {
	getFileSize,
	selectFile
} from '../../../../../../../common/api';

type ImageLocationProps = Readonly<{
	currentImage: Image;
	errors: ImageValidationErrors;
	onUpdateImage: (updates: Partial<Omit<Image, 'id'>>) => void;
}>;

function ImageLocation({
	currentImage,
	errors,
	onUpdateImage
}: ImageLocationProps) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.image;

	// Path validation error state
	const [pathError, setPathError] = useState<string | undefined>();

	const handleBrowsePath = useCallback(async () => {
		const rawPath = await selectFile({
			filters: {'Bin Files': ['bin']}
		});

		if (!rawPath) {
			return;
		}

		const path = rawPath.replace(/\\/g, '/');

		setPathError(validatePath(path));
		onUpdateImage({path});

		try {
			const size = await getFileSize(path);
			onUpdateImage({path, binFileSize: size});
		} catch {
			onUpdateImage({path, binFileSize: undefined});
		}
	}, [onUpdateImage]);

	const handlePathChange = useCallback(
		async (value: string) => {
			const normalizedPath = value.replace(/\\/g, '/');
			const error = validatePath(normalizedPath);
			setPathError(error);

			if (error) {
				onUpdateImage({path: normalizedPath, binFileSize: undefined});

				return;
			}

			onUpdateImage({path: normalizedPath});

			try {
				const size = await getFileSize(normalizedPath);
				onUpdateImage({path: normalizedPath, binFileSize: size});
			} catch {
				onUpdateImage({path: normalizedPath, binFileSize: undefined});
			}
		},
		[onUpdateImage]
	);

	return (
		<>
			<div className={styles.formField}>
				<div className={styles.title}>{l10n?.fields?.path}</div>
				<TextField
					inputVal={currentImage.path}
					placeholder={l10n?.placeholders?.path}
					dataTest={`image:${currentImage.name}-path`}
					error={pathError ?? errors.path}
					startSlot={
						<Button appearance='icon' onClick={handleBrowsePath}>
							Browse
						</Button>
					}
					onInputChange={handlePathChange}
				/>
			</div>

			<div className={styles.formField}>
				<span className={styles.locationTitle}>
					{l10n?.fields?.locationAddress}
				</span>
				<HexInputField
					value={currentImage.locationAddress}
					dataTest={`image:${currentImage.name}-location-address`}
					error={errors.locationAddress}
					onValueChange={value => {
						onUpdateImage({locationAddress: value.slice(0, 8)});
					}}
				/>
			</div>
		</>
	);
}

export default ImageLocation;
