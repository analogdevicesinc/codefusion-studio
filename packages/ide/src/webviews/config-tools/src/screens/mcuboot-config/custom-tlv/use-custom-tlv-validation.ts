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
import {type CustomTLV} from '../../../types/application-packages';
import {
	validateCustomTlvTag,
	validateCustomTlvValue,
	validateDuplicateTag
} from './validate-custom-tlv-value';

export function useCustomTlvValidation(
	tlv: CustomTLV,
	siblingTlvs: CustomTLV[]
) {
	const l10n: TLocaleContext | undefined =
		useLocaleContext()?.mcubootConfig?.applicationPackage?.customTlv;

	const tagError = useMemo(() => {
		const basicError = validateCustomTlvTag(tlv.tag, {
			tagRequired: l10n?.validation?.tagRequired,
			tagExceedsMax: l10n?.validation?.tagExceedsMax
		});

		if (basicError) return basicError;

		return validateDuplicateTag(tlv.tag, tlv.id, siblingTlvs, {
			tagDuplicate: l10n?.validation?.tagDuplicate
		});
	}, [tlv.tag, tlv.id, siblingTlvs, l10n?.validation]);

	const valueError = useMemo(
		() =>
			validateCustomTlvValue(tlv.value, {
				valueRequired: l10n?.validation?.valueRequired,
				invalidHex: l10n?.validation?.invalidHex,
				oddHexLength: l10n?.validation?.oddHexLength,
				hexValueExceedsMax: l10n?.validation?.hexValueExceedsMax,
				valueTooLong: l10n?.validation?.valueTooLong
			}),
		[tlv.value, l10n?.validation]
	);

	const hasError = Boolean(tagError ?? valueError);

	return {tagError, valueError, hasError};
}
