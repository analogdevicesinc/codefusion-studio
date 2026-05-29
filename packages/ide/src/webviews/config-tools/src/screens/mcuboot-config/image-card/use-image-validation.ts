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

import {useMemo} from 'react';
import {
	type TLocaleContext,
	useLocaleContext
} from '../../../../../common/contexts/LocaleContext';
import {type Image} from '../../../types/application-packages';
import {
	type ImageValidationErrors,
	validateImage
} from '../../../utils/application-package-validation';

export function useImageValidation(image: Image): {
	errors: ImageValidationErrors;
	hasError: boolean;
} {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.image;

	const errors = useMemo(
		() =>
			validateImage(image, {
				locationAddressRequired:
					l10n?.validation?.locationAddressRequired,
				slotSizeRequired: l10n?.validation?.slotSizeRequired,
				headerSizeRequired: l10n?.validation?.headerSizeRequired,
				pathRequired: l10n?.validation?.pathRequired,
				imageVersionRequired: l10n?.validation?.imageVersionRequired,
				publicKeyFormatRequired:
					l10n?.validation?.publicKeyFormatRequired,
				nameRequired: l10n?.validation?.nameRequired,
				securityCounterInvalid:
					l10n?.validation?.securityCounterInvalid,
				aesKwKeyPathInvalid: l10n?.validation?.aesKwKeyPathInvalid,
				aesGcmKeyPathInvalid: l10n?.validation?.aesGcmKeyPathInvalid
			}),
		[image, l10n?.validation]
	);

	const hasError = Object.keys(errors).length > 0;

	return {errors, hasError};
}
