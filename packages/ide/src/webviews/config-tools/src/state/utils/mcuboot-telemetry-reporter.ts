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
	ApplicationPackage,
	Image
} from '../../types/application-packages';
import {logTelemetryEvent} from '../../utils/api';
import {RootState} from '../store';
import {CONFIG_TOOLS_TELEMETRY_ACTIONS} from './telemetry-reporter';

export type McuBootApplicationPackageUpdatePayload = {
	id: string;
	updates: Partial<Omit<ApplicationPackage, 'id'>>;
};

export function reportApplicationPackageAdded(): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.APP_PACK_CREATED
	);
}

export function reportApplicationPackageRemoved(): void {
	void logTelemetryEvent(
		CONFIG_TOOLS_TELEMETRY_ACTIONS.APP_PACK_DELETED
	);
}

export function reportApplicationPackageUpdated(
	payload: McuBootApplicationPackageUpdatePayload,
	originalState: RootState
): void {
	const {id, updates} = payload;

	const originalPackage =
		originalState.applicationPackagesReducer.applicationPackages.find(
			pkg => pkg.id === id
		);

	if (!originalPackage) {
		return;
	}

	const originalImagesById = new Map(
		originalPackage.images?.map(image => [image.id, image]) ?? []
	);

	const updatedImageIds = new Set(
		updates.images?.map(image => image.id) ?? []
	);

	handleImageAdded(updates, originalImagesById);

	handleImageDeleted(updates, updatedImageIds, originalPackage);

	handleTlvAdded(updates, originalImagesById);

	handleSignKeySelected(updates, originalImagesById, originalPackage);
}

function handleImageAdded(
	updates: Partial<Omit<ApplicationPackage, 'id'>>,
	originalImagesById: Map<string, Image>
): void {
	const imageAdded =
		updates.images?.some(
			image => !originalImagesById.has(image.id)
		) ?? false;

	if (imageAdded) {
		void logTelemetryEvent(
			CONFIG_TOOLS_TELEMETRY_ACTIONS.IMAGE_ADDED
		);
	}
}

function handleImageDeleted(
	updates: Partial<Omit<ApplicationPackage, 'id'>>,
	updatedImageIds: Set<string>,
	originalPackage?: ApplicationPackage
): void {
	const deletedImages =
		updates.images === undefined
			? []
			: (originalPackage?.images ?? []).filter(
					image => !updatedImageIds.has(image.id)
				);

	if (deletedImages.length > 0) {
		void logTelemetryEvent(
			CONFIG_TOOLS_TELEMETRY_ACTIONS.COMPONENT_DELETED
		);
	}
}

function handleTlvAdded(
	updates: Partial<Omit<ApplicationPackage, 'id'>>,
	originalImagesById: Map<string, Image>
): void {
	const addedTlvs =
		updates.images?.flatMap(updatedImage => {
			const originalTlvIds = new Set(
				originalImagesById
					.get(updatedImage.id)
					?.customTLVs?.map(tlv => tlv.id) ?? []
			);

			return (
				updatedImage.customTLVs?.filter(
					tlv => !originalTlvIds.has(tlv.id)
				) ?? []
			);
		}) ?? [];

	if (addedTlvs.length > 0) {
		void logTelemetryEvent(
			CONFIG_TOOLS_TELEMETRY_ACTIONS.CUSTOM_TLV_ADDED
		);
	}
}

function handleSignKeySelected(
	updates: Partial<Omit<ApplicationPackage, 'id'>>,
	originalImagesById: Map<string, Image>,
	originalPackage?: ApplicationPackage
): void {
	const packageSignKeySelected =
		'signKey' in updates &&
		updates.signKey !== undefined &&
		updates.signKey !== originalPackage?.signKey;

	const imageSignKeySelected =
		updates.images?.some(updatedImage => {
			const originalImage = originalImagesById.get(updatedImage.id);

			return (
				originalImage !== undefined &&
				updatedImage.signKey !== undefined &&
				updatedImage.signKey !== originalImage.signKey
			);
		}) ?? false;

	if (packageSignKeySelected || imageSignKeySelected) {
		void logTelemetryEvent(
			CONFIG_TOOLS_TELEMETRY_ACTIONS.SIGN_KEY_SELECTED
		);
	}
}
