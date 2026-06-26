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

import {
	type ApplicationPackage,
	type CustomTLV,
	type Image,
	type SlotSizeUnit
} from '../types/application-packages';
import {ByteUnitMap} from '../types/memory';
import {computeTotalCustomTlvSize} from './mcuboot';
import {getProjectInfoList} from './config';

const HEX_PREFIX = '0x';
const MAX_VALUE_LENGTH = 65535;
const MIN_TAG_VALUE = 0x00a0;
const MAX_TAG_RANGE_VALUE = 0xfffe;
const MAX_HEX_ADDRESS_LENGTH = 8;
const VALID_BIN_PATH_REGEX = /\.(bin)$/i;
const VALID_PEM_PATH_REGEX = /\.(pem)$/i;

const SECURITY_COUNTER_MIN = 0;
const SECURITY_COUNTER_MAX = 0xffffffff;

// --- Header / Slot Size Validation ---

const SLOT_BYTES_MIN = 4096;
const SLOT_BYTES_ALIGNMENT = 4096;

const HEADER_SIZE_MIN_BYTES = 32;
const HEADER_SIZE_MAX_BYTES = 4096;
const SLOT_KB_MAX = 65535;
const SLOT_MB_MAX = Math.floor(SLOT_KB_MAX / 1024);

export function validateHeaderSize(
	headerSizeBytes: number,
	slotSizeBytes: number,
	swapAlignment?: string
): string | undefined {
	if (headerSizeBytes < HEADER_SIZE_MIN_BYTES) {
		return `Header size must be at least ${String(
			HEADER_SIZE_MIN_BYTES
		)} bytes.`;
	}

	if (headerSizeBytes > HEADER_SIZE_MAX_BYTES) {
		return `Header size must be at most ${String(
			HEADER_SIZE_MAX_BYTES
		)} bytes.`;
	}

	if (
		swapAlignment &&
		headerSizeBytes % parseInt(swapAlignment, 10) !== 0
	) {
		return `Header size must be a multiple of swap alignment (${String(
			swapAlignment
		)}).`;
	}

	if (headerSizeBytes >= slotSizeBytes) {
		return 'Header size must be less than slot size.';
	}

	return undefined;
}

export function validateSlotSize(
	displayValue: number,
	unit: SlotSizeUnit
): string | undefined {
	const bytesValue = displayValue * ByteUnitMap[unit];

	if (bytesValue < SLOT_BYTES_MIN) {
		return `Slot size must be at least ${String(
			SLOT_BYTES_MIN
		)} bytes (${String(SLOT_BYTES_MIN / 1024)} KB).`;
	}

	if (bytesValue % SLOT_BYTES_ALIGNMENT !== 0) {
		return `Slot Size must be an exact multiple of ${String(
			SLOT_BYTES_ALIGNMENT
		)} bytes (sector-aligned).`;
	}

	if (unit === 'KB' && displayValue > SLOT_KB_MAX) {
		return `Value must be at most ${String(SLOT_KB_MAX)} KB.`;
	}

	if (unit === 'MB' && displayValue > SLOT_MB_MAX) {
		return `Value must be at most ${String(SLOT_MB_MAX)} MB.`;
	}

	return undefined;
}

/**
 * Validates the file path for the image, ensuring it is not empty and points to a valid binary file.
 * @param path - The file path to validate.
 * @returns An error message if validation fails, or undefined if the path is valid.
 */

export function validatePath(path: string): string | undefined {
	if (!path.trim()) {
		return 'Path is required.';
	}

	if (!VALID_BIN_PATH_REGEX.test(path)) {
		return 'Path must point to a valid binary file (.bin).';
	}

	return undefined;
}

/**
 * Validates the file path for a PEM key file, ensuring it is not empty, contains no whitespace,
 * and has the correct extension.
 * @param path - The file path to validate.
 * @returns An error message if validation fails, or undefined if the path is valid.
 */

export function validatePemPath(path: string): string | undefined {
	const trimmedPath = path.trim();

	if (!trimmedPath) {
		return 'Path is required.';
	}

	if (/\s/.test(trimmedPath)) {
		return 'Path cannot contain spaces.';
	}

	if (!VALID_PEM_PATH_REGEX.test(trimmedPath)) {
		return 'Path must point to a valid key file (.pem).';
	}

	return undefined;
}

/**
 * Checks whether a key name already exists in the list (case-insensitive).
 * @param name - The key name to check.
 * @param existingKeyNames - The list of existing key names.
 * @returns true if the name already exists, false otherwise.
 */
export function isDuplicateKeyName(
	name: string,
	existingKeyNames: string[]
): boolean {
	const normalized = name.trim().toLowerCase();

	return existingKeyNames.some(
		existing => existing.trim().toLowerCase() === normalized
	);
}

/**
 * Validates the slot capacity, ensuring the total content fits within the slot size.
 * @param slotSizeBytes - The size of the slot in bytes.
 * @param headerSizeBytes - The size of the header in bytes.
 * @param binFileSize - The size of the binary file in bytes.
 * @param totalTlvSize - The total size of custom TLVs in bytes.
 * @returns An error message if validation fails, or undefined if the slot capacity is valid.
 */

export function validateSlotCapacity(
	slotSizeBytes: number,
	headerSizeBytes: number,
	binFileSize?: number,
	totalTlvSize?: number
): string | undefined {
	const appSize = binFileSize ?? 0;
	const tlvSize = totalTlvSize ?? 0;
	const totalRequired = headerSizeBytes + appSize + tlvSize;

	if (totalRequired > slotSizeBytes) {
		return `Total content (${String(
			totalRequired
		)} bytes) exceeds slot size (${String(
			slotSizeBytes
		)} bytes). Header (${String(
			headerSizeBytes
		)} bytes) + App (${String(appSize)} bytes) + TLVs (${String(
			tlvSize
		)} bytes) must fit within the slot.`;
	}

	return undefined;
}

export type CustomTlvValidationMessages = {
	invalidHex?: string;
	oddHexLength?: string;
	hexValueExceedsMax?: string;
	valueTooLong?: string;
	tagRequired?: string;
	tagOutOfRange?: string;
	valueRequired?: string;
	tagDuplicate?: string;
};

/**
 * Validates a custom TLV tag, ensuring it is within the valid range.
 * @param tag - The TLV tag to validate.
 * @param messages - Custom validation messages.
 * @returns An error message if validation fails, or undefined if the tag is valid.
 */

export function validateCustomTlvTag(
	tag: number,
	messages: CustomTlvValidationMessages
): string | undefined {
	if (tag === 0) {
		return messages.tagRequired ?? 'Tag is required.';
	}

	if (tag < MIN_TAG_VALUE || tag > MAX_TAG_RANGE_VALUE) {
		return (
			messages.tagOutOfRange ??
			'Tag must be between 0x00A0 and 0xFFFE.'
		);
	}

	return undefined;
}

export function collectAllTlvsInPackage(
	pkg: ApplicationPackage | undefined
): CustomTLV[] {
	if (!pkg) return [];

	return (pkg.images ?? []).flatMap(img => img.customTLVs ?? []);
}

/**
 * Validates the coreId field on an application package.
 * Returns an error message when core options are available but no core is selected.
 */
export function validatePackageCoreId(
	coreId: string,
	message?: string
): string | undefined {
	const projectInfoList = getProjectInfoList();
	const hasCoreOptions =
		projectInfoList !== undefined && projectInfoList.length > 0;

	if (hasCoreOptions && !coreId) {
		return message ?? 'Core is required.';
	}

	return undefined;
}

/**
 * Validates the version field on an application package.
 * Returns an error message when version is empty or not provided.
 */
export function validatePackageVersion(
	version: string | undefined,
	message?: string
): string | undefined {
	if (!version?.trim()) {
		return message ?? 'Version is required.';
	}

	return undefined;
}

export function validateDuplicateTag(
	tag: number,
	currentTlvId: string,
	allTlvs: CustomTLV[],
	messages: CustomTlvValidationMessages
): string | undefined {
	if (tag === 0) return undefined;

	const hasDuplicate = allTlvs.some(
		t => t.id !== currentTlvId && t.tag === tag
	);

	if (hasDuplicate) {
		return (
			messages.tagDuplicate ?? 'Tag already in use by another TLV.'
		);
	}

	return undefined;
}

export function tagToHexString(tag: number): string {
	return tag > 0 ? tag.toString(16).toUpperCase() : '';
}

export function parseHexTag(rawValue: string): number {
	const hexStr = rawValue.replace(/[^0-9A-Fa-f]/g, '').slice(0, 4);

	return hexStr ? parseInt(hexStr, 16) : 0;
}

/**
 * Validates a custom TLV value, ensuring it is not empty and properly formatted as either a plain string or a hex value.
 * @param value - The TLV value to validate.
 * @param messages - Custom validation messages.
 * @returns An error message if validation fails, or undefined if the value is valid.
 */

export function validateCustomTlvValue(
	value: string,
	messages: CustomTlvValidationMessages
): string | undefined {
	if (!value?.trim()) {
		return messages.valueRequired ?? 'Value is required.';
	}

	if (value.toLowerCase().startsWith(HEX_PREFIX)) {
		const hexDigits = value.slice(HEX_PREFIX.length);

		if (!hexDigits.length || !/^[\da-f]+$/i.test(hexDigits)) {
			return messages.invalidHex ?? 'Invalid hex value';
		}

		if (hexDigits.length % 2 !== 0) {
			return (
				messages.oddHexLength ?? 'Hex value must have even length'
			);
		}

		if (hexDigits.length / 2 > MAX_VALUE_LENGTH) {
			return (
				messages.hexValueExceedsMax ??
				`Hex value must be at most ${String(MAX_VALUE_LENGTH)} bytes.`
			);
		}

		return undefined;
	}

	if (value.length > MAX_VALUE_LENGTH) {
		return messages.valueTooLong ?? 'Value is too long';
	}

	return undefined;
}

/**
 * Validates an optional binary key path, ensuring it points to a valid .bin file if provided.
 * @param path - The file path to validate.
 * @param message - Optional custom error message to use instead of the default.
 * @returns An error message if validation fails, or undefined if the path is valid or empty.
 */

export function validateOptionalBinPath(
	path: string | undefined,
	message?: string
): string | undefined {
	if (!path?.trim()) {
		return undefined;
	}

	if (!VALID_BIN_PATH_REGEX.test(path)) {
		return (
			message ?? 'Path must point to a valid binary file (.bin).'
		);
	}

	return undefined;
}

/**
 * Validates an optional binary key path (e.g., AES keys), ensuring it points to a valid .bin file
 * and does not contain whitespace.
 * @param path - The file path to validate.
 * @param message - Optional custom error message to use instead of the default.
 * @returns An error message if validation fails, or undefined if the path is valid or empty.
 */
export function validateOptionalKeyBinPath(
	path: string | undefined,
	message?: string
): string | undefined {
	if (!path?.trim()) {
		return undefined;
	}

	const trimmedPath = path.trim();

	if (/\s/.test(trimmedPath)) {
		return 'Path cannot contain spaces.';
	}

	return validateOptionalBinPath(trimmedPath, message);
}

/**
 * Validates a security counter value, ensuring it is a non-negative integer within the valid range.
 * @param value - The security counter value to validate.
 * @param message - Optional custom error message to use instead of the default.
 * @returns An error message if validation fails, or undefined if valid.
 */

export function validateSecurityCounter(
	value: number | undefined,
	message?: string
): string | undefined {
	if (value === undefined) {
		return undefined;
	}

	if (!Number.isInteger(value) || value < SECURITY_COUNTER_MIN) {
		return (
			message ?? 'Security counter must be a non-negative integer.'
		);
	}

	if (value > SECURITY_COUNTER_MAX) {
		return (
			message ??
			`Security counter must be at most ${String(SECURITY_COUNTER_MAX)}.`
		);
	}

	return undefined;
}

// --- Image Validation ---

export type ImageValidationMessages = {
	locationAddressRequired?: string;
	hexAddressInvalid?: string;
	slotSizeRequired?: string;
	headerSizeRequired?: string;
	pathRequired?: string;
	imageVersionRequired?: string;
	imageVersionInvalid?: string;
	publicKeyFormatRequired?: string;
	nameRequired?: string;
	securityCounterInvalid?: string;
	aesKwKeyPathInvalid?: string;
	aesGcmKeyPathInvalid?: string;
};

export type ImageValidationErrors = {
	locationAddress?: string;
	slotSize?: string;
	headerSize?: string;
	path?: string;
	imageVersion?: string;
	publicKeyFormat?: string;
	name?: string;
	securityCounter?: string;
	aesKwKeyPath?: string;
	aesGcmKeyPath?: string;
};

/**
 * Validates a specific field of an image, ensuring it meets the required criteria.
 * @param fieldName - The name of the field to validate.
 * @param value - The value of the field to validate.
 * @param messages - Custom validation messages.
 * @returns An error message if validation fails, or undefined if the field is valid.
 */

export function validateImageField(
	fieldName: keyof ImageValidationErrors,
	value: string | number | undefined,
	messages: ImageValidationMessages
): string | undefined {
	const messageMap: Record<
		keyof ImageValidationErrors,
		string | undefined
	> = {
		locationAddress: messages.locationAddressRequired,
		slotSize: messages.slotSizeRequired,
		headerSize: messages.headerSizeRequired,
		path: messages.pathRequired,
		imageVersion: messages.imageVersionRequired,
		publicKeyFormat: messages.publicKeyFormatRequired,
		name: messages.nameRequired,
		securityCounter: messages.securityCounterInvalid,
		aesKwKeyPath: messages.aesKwKeyPathInvalid,
		aesGcmKeyPath: messages.aesGcmKeyPathInvalid
	};

	const defaultMessages: Record<keyof ImageValidationErrors, string> =
		{
			locationAddress: 'Location address is required.',
			slotSize: 'Slot size is required.',
			headerSize: 'Header size is required.',
			path: 'Path is required.',
			imageVersion: 'Image version is required.',
			publicKeyFormat: 'Public key format is required.',
			name: 'Name is required.',
			securityCounter:
				'Security counter must be a non-negative integer.',
			aesKwKeyPath: 'Path must point to a valid binary file (.bin).',
			aesGcmKeyPath: 'Path must point to a valid binary file (.bin).'
		};

	if (typeof value === 'number') {
		if (value <= 0) {
			return messageMap[fieldName] ?? defaultMessages[fieldName];
		}

		return undefined;
	}

	if (!value || (typeof value === 'string' && !value.trim())) {
		return messageMap[fieldName] ?? defaultMessages[fieldName];
	}

	return undefined;
}

/**
 * Validates the image version format (e.g., 1, 1.0, or 1.0.0).
 * @param version - The version string to validate.
 * @param message - Optional custom error message.
 * @returns An error message if validation fails, or undefined if the version is valid.
 */
export function validateImageVersion(
	version: string | undefined,
	message?: string
): string | undefined {
	if (!version?.trim()) {
		return undefined;
	}

	// Version pattern: major, major.minor, major.minor.patch, or major.minor.patch+build (e.g., 1, 1.0, 1.0.0, 1.0.0+1)
	const versionRegex = /^\d+(\.\d+)?(\.\d+)?(\+\d+)?$/;

	if (!versionRegex.test(version.trim())) {
		return (
			message ??
			'Image version must be a valid version format (e.g., 1, 1.0, 1.0.0, 1.0.0+1).'
		);
	}

	return undefined;
}

/**
 * Validates the content/format of image fields that already have values.
 * This runs after required-field checks to catch format and constraint errors
 * (e.g., invalid path extension, header size bounds, slot alignment, capacity).
 */
function validateImageContent(
	image: Image,
	errors: ImageValidationErrors,
	messages: ImageValidationMessages
): void {
	if (!errors.path && image.path) {
		const pathFormatError = validatePath(image.path);

		if (pathFormatError) {
			errors.path = pathFormatError;
		}
	}

	if (!errors.headerSize && image.headerSize > 0) {
		const headerError = validateHeaderSize(
			image.headerSize,
			image.slotSize,
			image.swapAlignment
		);

		if (headerError) {
			errors.headerSize = headerError;
		}
	}

	if (!errors.slotSize && image.slotSize > 0) {
		const unit: SlotSizeUnit = image.slotSizeUnit ?? 'KB';
		const displayValue = image.slotSize / ByteUnitMap[unit];
		const slotError = validateSlotSize(displayValue, unit);

		if (slotError) {
			errors.slotSize = slotError;
		}
	}

	if (!errors.slotSize && image.slotSize > 0) {
		const totalTlvSize = computeTotalCustomTlvSize(
			image.customTLVs ?? []
		);
		const capacityError = validateSlotCapacity(
			image.slotSize,
			image.headerSize,
			image.binFileSize,
			totalTlvSize
		);

		if (capacityError) {
			errors.slotSize = capacityError;
		}
	}

	// Validate image version format if it has a value
	if (!errors.imageVersion && image.imageVersion) {
		const versionError = validateImageVersion(
			image.imageVersion,
			messages.imageVersionInvalid
		);

		if (versionError) {
			errors.imageVersion = versionError;
		}
	}

	validateOptionalImageFields(image, errors, messages);
}

/**
 * Validates optional image fields (security counter, AES key paths).
 */
function validateOptionalImageFields(
	image: Image,
	errors: ImageValidationErrors,
	messages: ImageValidationMessages
): void {
	if (image.securityCounter !== undefined) {
		const counterError = validateSecurityCounter(
			image.securityCounter,
			messages.securityCounterInvalid
		);

		if (counterError) {
			errors.securityCounter = counterError;
		}
	}

	if (image.aesKwKeyPath) {
		const aesKwError = validateOptionalKeyBinPath(
			image.aesKwKeyPath,
			messages.aesKwKeyPathInvalid
		);

		if (aesKwError) {
			errors.aesKwKeyPath = aesKwError;
		}
	}

	if (image.aesGcmKeyPath) {
		const aesGcmError = validateOptionalKeyBinPath(
			image.aesGcmKeyPath,
			messages.aesGcmKeyPathInvalid
		);

		if (aesGcmError) {
			errors.aesGcmKeyPath = aesGcmError;
		}
	}
}

export function validateImage(
	image: Image,
	messages: ImageValidationMessages
): ImageValidationErrors {
	const errors: ImageValidationErrors = {};

	const fieldsToValidate: Array<{
		field: keyof ImageValidationErrors;
		value: string | number | undefined;
		overrideMessages?: ImageValidationMessages;
	}> = [
		{field: 'name', value: image.name},
		{
			field: 'locationAddress',
			value: image.locationAddress
		},
		{field: 'slotSize', value: image.slotSize},
		{field: 'headerSize', value: image.headerSize},
		{field: 'path', value: image.path},
		{field: 'imageVersion', value: image.imageVersion},
		...(image.publicKeyFormatEnabled
			? [
					{
						field: 'publicKeyFormat' as const,
						value: image.publicKeyFormat
					}
				]
			: [])
	];

	for (const {field, value, overrideMessages} of fieldsToValidate) {
		const error = validateImageField(
			field,
			value,
			overrideMessages ?? messages
		);

		if (error) {
			errors[field] = error;
		}
	}

	if (image.locationType === 'hexAddress' && image.locationAddress) {
		const hexDigits = image.locationAddress.replace(
			/[^0-9A-Fa-f]/g,
			''
		);
		const address = parseInt(hexDigits, 16);

		if (!hexDigits.length || Number.isNaN(address)) {
			errors.locationAddress =
				messages.hexAddressInvalid ?? 'Invalid hex address.';
		} else if (hexDigits.length > MAX_HEX_ADDRESS_LENGTH) {
			errors.locationAddress =
				messages.hexAddressInvalid ??
				`Hex address must be at most ${String(
					MAX_HEX_ADDRESS_LENGTH
				)} digits (0xFFFFFFFF).`;
		}
	}

	validateImageContent(image, errors, messages);

	return errors;
}

export function countImageValidationErrors(
	image: Image,
	messages: ImageValidationMessages
): number {
	return Object.keys(validateImage(image, messages)).length;
}
