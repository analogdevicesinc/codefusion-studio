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

import {type Package, type DiagramData} from '../../../common/types/soc';
import {getClockCanvas as getClockCanvasApi} from './api';

export let canvas: DiagramData | undefined;

if (import.meta.env.MODE === 'development') {
	canvas = (window as any).__DEV_SOC__.Packages[0].ClockCanvas;
} else {
	canvas = await getClockCanvasApi();
}

// Function to get clockCanvas with fallback to localStorage
export function getClockCanvas() {
	if (!canvas) {
		// Attempt to populate the clock canvas from localStorage (for testing purposes)
		const localStoragePackage = localStorage.getItem('Package');

		if (localStoragePackage) {
			const parsedPackage: Package = JSON.parse(localStoragePackage);

			canvas = parsedPackage?.ClockCanvas;
		}
	}

	return canvas;
}
