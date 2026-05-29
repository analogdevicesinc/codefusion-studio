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

import {type ImageValidationErrors} from '../utils/application-package-validation';

export type PublicKeyFormat = 'hash' | 'full';

export type HeaderSizeUnit = 'bytes' | 'KB';
export type SlotSizeUnit = 'KB' | 'MB';

export type Image = {
	id: string;
	name: string;
	description?: string;
	signKey?: string;
	locationType: LocationType;
	locationAddress: string;
	slotSize: number;
	slotSizeUnit?: SlotSizeUnit;
	padHeader: boolean;
	path: string;
	headerSize: number;
	headerSizeUnit?: HeaderSizeUnit;
	customTLVs?: CustomTLV[];
	swapAlignment: string;
	imageVersion: string;
	bootable: boolean;
	publicKeyFormatEnabled?: boolean;
	publicKeyFormat?: PublicKeyFormat;
	securityCounter?: number;
	aesKwKeyPath?: string;
	aesGcmKeyPath?: string;
	customArguments?: string;
	binFileSize?: number;
};

export type CustomTLV = {
	id: string;
	name: string;
	description?: string;
	tag: number;
	value: string;
};

export type ApplicationPackage = {
	id: string;
	name: string;
	description?: string;
	enabled: boolean;
	coreId: string;
	version?: string;
	securityCounter?: number;
	signKey?: string;
	images?: Image[];
};

export type LocationType = 'hexAddress';

export type ProjectInfo = {
	Name: string;
	ProjectId: string;
};

export type ImageFormProps = Readonly<{
	currentImage: Image;
	errors: ImageValidationErrors;
	newlyAddedTlvId?: string;
	onUpdateImage: (updates: Partial<Omit<Image, 'id'>>) => void;
	onAddCustomTLV: () => void;
	onDeleteCustomTLV: (tlvId: string) => void;
	onUpdateCustomTLV: (
		tlvId: string,
		updates: Partial<Omit<CustomTLV, 'id'>>
	) => void;
}>;
