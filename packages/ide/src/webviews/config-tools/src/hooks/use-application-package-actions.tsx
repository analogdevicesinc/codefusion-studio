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
import {useCallback} from 'react';
import {
	addApplicationPackage,
	updateApplicationPackage
} from '../state/slices/application-packages/applicationPackages.reducer';
import {
	useActiveApplicationPackage,
	useApplicationPackages
} from '../state/slices/application-packages/applicationPackages.selector';
import {
	type ApplicationPackage,
	type Image
} from '../types/application-packages';
import {useAppDispatch} from '../state/store';
import {ByteUnitMap} from '../types/memory';
import {
	DEFAULT_HEADER_SIZE_BYTES,
	DEFAULT_SLOT_SIZE_KB,
	DEFAULT_SLOT_SIZE_UNIT,
	DEFAULT_SWAP_ALIGNMENT
} from '../screens/mcuboot-config/constants';

export function useAddApplicationPackage() {
	const dispatch = useAppDispatch();
	const applicationPackages = useApplicationPackages();

	const handleAddPackage = useCallback(() => {
		const existingNames = new Set(
			applicationPackages.map(pkg => pkg.name)
		);

		let counter = 1;

		while (existingNames.has(`New App Pack ${String(counter)}`)) {
			counter++;
		}

		const newPackage: ApplicationPackage = {
			id: crypto.randomUUID(),
			name: `New App Pack ${String(counter)}`,
			enabled: true,
			coreId: ''
		};

		dispatch(addApplicationPackage(newPackage));
	}, [dispatch, applicationPackages]);

	return handleAddPackage;
}

export function useAddImage() {
	const dispatch = useAppDispatch();
	const activePackage = useActiveApplicationPackage();

	const handleAddImage = useCallback((): string | undefined => {
		if (!activePackage) return undefined;

		const existingImages = activePackage.images ?? [];
		const existingNames = new Set(
			existingImages.map(img => img.name)
		);

		let counter = 1;

		while (existingNames.has(`Image ${String(counter)}`)) {
			counter++;
		}

		const newImage: Image = {
			id: crypto.randomUUID(),
			name: `Image ${String(counter)}`,
			locationType: 'hexAddress',
			locationAddress: '',
			slotSize:
				DEFAULT_SLOT_SIZE_KB * ByteUnitMap[DEFAULT_SLOT_SIZE_UNIT],
			slotSizeUnit: DEFAULT_SLOT_SIZE_UNIT,
			path: '',
			headerSize: DEFAULT_HEADER_SIZE_BYTES,
			padHeader: true,
			swapAlignment: DEFAULT_SWAP_ALIGNMENT,
			imageVersion: '',
			bootable: true
		};

		dispatch(
			updateApplicationPackage({
				id: activePackage.id,
				updates: {
					images: [...existingImages, newImage]
				}
			})
		);

		return newImage.id;
	}, [activePackage, dispatch]);

	return handleAddImage;
}
