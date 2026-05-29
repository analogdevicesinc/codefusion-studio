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

import type {
	CfsSettings,
	ConfiguredApplicationPackage,
	ConfiguredCustomTLV,
	ConfiguredImage,
	ConfiguredLocationType
} from 'cfs-types';
import type {
	McubootEnableOption,
	KeyData
} from '../types/workspace-settings';
import type {
	ApplicationPackage,
	CustomTLV,
	HeaderSizeUnit,
	Image,
	PublicKeyFormat,
	SlotSizeUnit
} from '../types/application-packages';
import {stripHexPrefix} from './mcuboot';

import {MCUBOOT_ENABLE_OPTIONS} from '../constants/workspace-settings';
import {isPrimaryCore} from './config';

const VALID_MCUBOOT_ENABLE_VALUES = new Set<string>(
	MCUBOOT_ENABLE_OPTIONS.map(o => o.value)
);

const VALID_LOCATION_TYPES = new Set<string>(['hexAddress']);

const VALID_SLOT_SIZE_UNITS = new Set<string>(['KB', 'MB']);
const VALID_HEADER_SIZE_UNITS = new Set<string>(['bytes', 'KB']);
const VALID_PUBLIC_KEY_FORMATS = new Set<string>(['hash', 'full']);

/**
 * Normalizes a file path by replacing backslashes with forward slashes.
 */
function normalizePath(filePath: string): string {
	return filePath.replace(/\\/g, '/');
}

/**
 * Formats the MCUBoot settings and signing keys into the
 * persistence-ready CfsSettings shape.
 */
export function formatSettingsPersistencePayload(
	mcubootEnableState: McubootEnableOption,
	signingKeys: KeyData[]
): CfsSettings {
	return {
		MCUBoot: {
			EnableState: mcubootEnableState
		},
		SigningKeys: signingKeys.map(key => ({
			Name: key.name,
			Path: normalizePath(key.path),
			Algorithm: key.algorithm,
			...(key.description ? {Description: key.description} : {})
		}))
	};
}

/**
 * Formats application packages for persistence, stripping
 * frontend-only `id` fields from packages, images, and custom TLVs.
 */
export function formatApplicationPackagesPersistencePayload(
	packages: ApplicationPackage[]
): ConfiguredApplicationPackage[] {
	return packages.map(pkg => ({
		Name: pkg.name,
		...(pkg.description ? {Description: pkg.description} : {}),
		Enabled: pkg.enabled,
		CoreId: pkg.coreId,
		...((pkg.images?.length ?? 0) > 1 && isPrimaryCore(pkg.coreId)
			? {Version: pkg.version ?? ''}
			: {}),
		...((pkg.images?.length ?? 0) > 1 && isPrimaryCore(pkg.coreId)
			? {SecurityCounter: pkg.securityCounter ?? 'auto'}
			: {}),
		...(pkg.signKey ? {SignKey: normalizePath(pkg.signKey)} : {}),
		...(pkg.images
			? {Images: pkg.images.map(formatImageForPersistence)}
			: {})
	}));
}

function formatImageForPersistence(image: Image): ConfiguredImage {
	return {
		Name: image.name,
		...(image.description ? {Description: image.description} : {}),
		...(image.signKey ? {SignKey: normalizePath(image.signKey)} : {}),
		LocationType: image.locationType,
		LocationAddress: image.locationAddress
			? `0x${stripHexPrefix(image.locationAddress)}`
			: image.locationAddress,
		SlotSize: image.slotSize,
		...(image.slotSizeUnit ? {SlotSizeUnit: image.slotSizeUnit} : {}),
		PadHeader: image.padHeader,
		Path: normalizePath(image.path),
		HeaderSize: image.headerSize,
		...(image.headerSizeUnit
			? {HeaderSizeUnit: image.headerSizeUnit}
			: {}),
		...(image.customTLVs
			? {
					CustomTLVs: image.customTLVs.map(
						formatCustomTlvForPersistence
					)
				}
			: {}),
		SwapAlignment: image.swapAlignment,
		ImageVersion: image.imageVersion,
		Bootable: image.bootable,
		...(image.publicKeyFormatEnabled === undefined
			? {}
			: {PublicKeyFormatEnabled: image.publicKeyFormatEnabled}),
		...(image.publicKeyFormat
			? {PublicKeyFormat: image.publicKeyFormat}
			: {}),
		SecurityCounter: image.securityCounter ?? 'auto',
		...(image.aesKwKeyPath
			? {AesKwKeyPath: normalizePath(image.aesKwKeyPath)}
			: {}),
		...(image.aesGcmKeyPath
			? {AesGcmKeyPath: normalizePath(image.aesGcmKeyPath)}
			: {}),
		...(image.customArguments
			? {CustomArguments: image.customArguments}
			: {})
	};
}

function formatCustomTlvForPersistence(
	tlv: CustomTLV
): ConfiguredCustomTLV {
	return {
		Name: tlv.name,
		...(tlv.description ? {Description: tlv.description} : {}),
		Tag: tlv.tag,
		Value: tlv.value
	};
}

/**
 * Converts persisted CfsSettings back into the Redux-compatible
 * mcubootEnableState and signingKeys.
 */
export function applyPersistedSettings(settings?: CfsSettings): {
	mcubootEnableState: McubootEnableOption;
	signingKeys: KeyData[];
} {
	const rawEnableState = settings?.MCUBoot?.EnableState;

	return {
		mcubootEnableState:
			typeof rawEnableState === 'string' &&
			VALID_MCUBOOT_ENABLE_VALUES.has(rawEnableState)
				? (rawEnableState as McubootEnableOption)
				: 'default',
		signingKeys:
			settings?.SigningKeys?.map(key => ({
				name: key.Name,
				path: key.Path,
				algorithm: key.Algorithm,
				description: key.Description
			})) ?? []
	};
}

/**
 * Converts persisted ConfiguredApplicationPackage[] back into
 * the Redux-friendly ApplicationPackage[] shape with generated IDs.
 */
export function applyPersistedApplicationPackages(
	packages?: ConfiguredApplicationPackage[]
): ApplicationPackage[] {
	return (
		packages?.map(pkg => ({
			id: crypto.randomUUID(),
			name: pkg.Name,
			description: pkg.Description,
			enabled: pkg.Enabled,
			coreId: pkg.CoreId ?? '',
			version: pkg.Version,
			securityCounter:
				typeof pkg.SecurityCounter === 'number'
					? pkg.SecurityCounter
					: typeof pkg.SecurityCounter === 'string' &&
						  /^\d+$/.test(String(pkg.SecurityCounter))
						? parseInt(String(pkg.SecurityCounter), 10)
						: undefined,
			signKey: pkg.SignKey,
			images: pkg.Images?.map(img => ({
				id: crypto.randomUUID(),
				name: img.Name,
				description: img.Description,
				signKey: img.SignKey,
				locationType: VALID_LOCATION_TYPES.has(
					String(img.LocationType ?? '')
				)
					? (img.LocationType as ConfiguredLocationType)
					: 'hexAddress',
				locationAddress: img.LocationAddress
					? stripHexPrefix(img.LocationAddress)
					: '',
				slotSize: img.SlotSize,
				slotSizeUnit: VALID_SLOT_SIZE_UNITS.has(
					img.SlotSizeUnit ?? ''
				)
					? (img.SlotSizeUnit as SlotSizeUnit)
					: undefined,
				padHeader: img.PadHeader,
				path: img.Path,
				headerSize: img.HeaderSize,
				headerSizeUnit: VALID_HEADER_SIZE_UNITS.has(
					img.HeaderSizeUnit ?? ''
				)
					? (img.HeaderSizeUnit as HeaderSizeUnit)
					: undefined,
				customTLVs: img.CustomTLVs?.map(tlv => ({
					id: crypto.randomUUID(),
					name: tlv.Name,
					description: tlv.Description,
					tag: tlv.Tag,
					value: tlv.Value
				})),
				swapAlignment: img.SwapAlignment,
				imageVersion: img.ImageVersion,
				bootable: img.Bootable,
				publicKeyFormatEnabled: img.PublicKeyFormatEnabled,
				publicKeyFormat: VALID_PUBLIC_KEY_FORMATS.has(
					img.PublicKeyFormat ?? ''
				)
					? (img.PublicKeyFormat as PublicKeyFormat)
					: undefined,
				securityCounter:
					typeof img.SecurityCounter === 'number'
						? img.SecurityCounter
						: typeof img.SecurityCounter === 'string' &&
							  /^\d+$/.test(img.SecurityCounter)
							? parseInt(img.SecurityCounter, 10)
							: undefined,
				aesKwKeyPath: img.AesKwKeyPath,
				aesGcmKeyPath: img.AesGcmKeyPath,
				customArguments: img.CustomArguments
			}))
		})) ?? []
	);
}
