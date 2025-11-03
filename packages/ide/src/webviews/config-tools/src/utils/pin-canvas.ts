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

import type {PinCanvas} from '@common/types/soc';
import {getCachedSocPackage} from './soc-pins';

export let pinCanvas: PinCanvas | undefined;

/**
 * Initializes the pin canvas with the provided PinCanvas.
 * Should be called once at app startup.
 */
export function initializePinCanvas(
	pinCanvasData: PinCanvas | undefined
) {
	pinCanvas = pinCanvasData;
}

// Function to get pinCanvas with fallback to localStorage
export function getPinCanvas() {
	if (!pinCanvas) {
		const socPackage = getCachedSocPackage();

		pinCanvas = socPackage?.PinCanvas;
	}

	return pinCanvas;
}
