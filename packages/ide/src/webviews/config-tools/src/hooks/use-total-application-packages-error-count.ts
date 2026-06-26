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
import {useApplicationPackages} from '../state/slices/application-packages/applicationPackages.selector';
import {useMcubootEnableState} from '../state/slices/app-context/appContext.selector';
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
import {
	type ApplicationPackage,
	type CustomTLV
} from '../types/application-packages';

const errorMessages = {
	invalidHex: 'error',
	oddHexLength: 'error',
	hexValueExceedsMax: 'error',
	valueTooLong: 'error',
	tagRequired: 'error',
	tagOutOfRange: 'error',
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

/**
 * Counts the total number of validation errors in a given set of TLVs.
 *
 * @param tlvs The array of TLVs to validate.
 * @param allTlvs All TLVs in the package, used for duplicate tag detection.
 * @returns The total number of validation errors in the TLVs.
 */

function countTlvErrors(tlvs: CustomTLV[], allTlvs: CustomTLV[]) {
	return tlvs.reduce((count, tlv) => {
		const hasValueError = Boolean(
			validateCustomTlvValue(tlv.value, errorMessages)
		);
		const hasTagError = Boolean(
			validateCustomTlvTag(tlv.tag, errorMessages) ??
				validateDuplicateTag(tlv.tag, tlv.id, allTlvs, errorMessages)
		);

		return count + (hasValueError ? 1 : 0) + (hasTagError ? 1 : 0);
	}, 0);
}

/**
 * Counts the total number of validation errors in a given application package.
 *
 * @param applicationPackage The application package to validate.
 * @returns The total number of validation errors in the package.
 */

function countPackageErrors(
	applicationPackage: ApplicationPackage
): number {
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

	const imageTlvErrors =
		applicationPackage.images?.reduce(
			(total, image) =>
				total +
				(image.customTLVs?.length
					? countTlvErrors(image.customTLVs, image.customTLVs)
					: 0),
			0
		) ?? 0;

	const imageFieldErrors =
		applicationPackage.images?.reduce(
			(total, image) =>
				total + countImageValidationErrors(image, imageErrorMessages),
			0
		) ?? 0;

	return (
		coreIdErrors +
		securityCounterErrors +
		versionErrors +
		imageTlvErrors +
		imageFieldErrors
	);
}

/**
 * Counts the total number of validation errors across all enabled
 * application packages. Returns 0 when MCUboot is not enabled.
 *
 * @returns The total number of validation errors across all enabled application packages.
 */
export function useTotalApplicationPackagesErrorCount(): number {
	const mcubootEnableState = useMcubootEnableState();
	const applicationPackages = useApplicationPackages();

	return useMemo(() => {
		if (mcubootEnableState !== 'enabled') return 0;

		return applicationPackages
			.filter(pkg => pkg.enabled)
			.reduce((total, pkg) => total + countPackageErrors(pkg), 0);
	}, [mcubootEnableState, applicationPackages]);
}
