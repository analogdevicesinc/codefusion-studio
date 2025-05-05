/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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

import type {Package, PinCanvas} from '@common/types/soc';
import {getPinCanvas as getPinCanvasApi} from './api';

export let pinCanvas: PinCanvas | undefined;

if (import.meta.env.MODE === 'development') {
	pinCanvas =
		(window as any).__DEV_SOC__?.Packages[0]?.PinCanvas ?? [];
} else {
	pinCanvas = await getPinCanvasApi();
}

// Function to get pinCanvas with fallback to localStorage
export function getPinCanvas() {
	if (!pinCanvas) {
		// Attempt to populate the pin canvas from localStorage (for testing purposes)
		const localStoragePackage = localStorage.getItem('Package');

		if (localStoragePackage) {
			const parsedPackage: Package = JSON.parse(localStoragePackage);

			pinCanvas = parsedPackage?.PinCanvas;
		}
	}

	return pinCanvas;
}
