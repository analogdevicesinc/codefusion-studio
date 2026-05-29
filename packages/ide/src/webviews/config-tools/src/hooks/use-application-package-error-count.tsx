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
	type ApplicationPackage,
	type CustomTLV
} from '../types/application-packages';
import {
	validateCustomTlvTag,
	validateCustomTlvValue,
	validateDuplicateTag,
	countImageValidationErrors,
	validatePackageCoreId,
	validatePackageVersion,
	validateSecurityCounter
} from '../utils/application-package-validation';
import {isPrimaryCore} from '../utils/config';

/**
 * Custom hook to count the total number of validation errors
 * across all images in an application package.
 * @param applicationPackage - The application package to check for errors
 * @returns The total number of errors across all images
 */
export default function useApplicationPackageErrorCount(
	applicationPackage: ApplicationPackage | undefined
): number {
	return useMemo(() => {
		if (!applicationPackage) return 0;

		const coreIdErrors = validatePackageCoreId(
			applicationPackage.coreId
		)
			? 1
			: 0;

		const securityCounterErrors = validateSecurityCounter(
			applicationPackage.securityCounter
		)
			? 1
			: 0;

		const hasMultipleImages =
			(applicationPackage.images?.length ?? 0) > 1 &&
			isPrimaryCore(applicationPackage.coreId);

		const versionErrors =
			hasMultipleImages &&
			validatePackageVersion(applicationPackage.version)
				? 1
				: 0;

		if (!applicationPackage.images?.length)
			return coreIdErrors + securityCounterErrors + versionErrors;

		const errorMessages = {
			invalidHex: 'error',
			oddHexLength: 'error',
			hexValueExceedsMax: 'error',
			valueTooLong: 'error',
			tagExceedsMax: 'error',
			tagRequired: 'error',
			valueRequired: 'error',
			tagDuplicate: 'error'
		};

		const imageErrorMessages = {
			locationAddressRequired: 'error',
			slotSizeRequired: 'error',
			headerSizeRequired: 'error',
			pathRequired: 'error',
			nameRequired: 'error'
		};

		const countTlvErrors = (
			tlvs: CustomTLV[],
			scopedTlvs: CustomTLV[]
		) =>
			tlvs.reduce((count, tlv) => {
				const hasValueError = Boolean(
					validateCustomTlvValue(tlv.value, errorMessages)
				);
				const hasTagError = Boolean(
					validateCustomTlvTag(tlv.tag, errorMessages) ??
						validateDuplicateTag(
							tlv.tag,
							tlv.id,
							scopedTlvs,
							errorMessages
						)
				);

				return (
					count + (hasValueError ? 1 : 0) + (hasTagError ? 1 : 0)
				);
			}, 0);

		const imageTlvErrors =
			applicationPackage?.images?.reduce((total, image) => {
				const imageTlvs = image.customTLVs ?? [];

				return (
					total +
					(imageTlvs.length
						? countTlvErrors(imageTlvs, imageTlvs)
						: 0)
				);
			}, 0) ?? 0;

		const imageFieldErrors =
			applicationPackage?.images?.reduce(
				(total, image) =>
					total +
					countImageValidationErrors(image, imageErrorMessages),
				0
			) ?? 0;

		return (
			coreIdErrors +
			securityCounterErrors +
			versionErrors +
			imageTlvErrors +
			imageFieldErrors
		);
	}, [applicationPackage]);
}
