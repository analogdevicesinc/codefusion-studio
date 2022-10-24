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
import {getPersistedSocData} from './api';

let firmwarePlatform: string | undefined;

if (import.meta.env.MODE === 'development') {
	firmwarePlatform = import.meta.env.VITE_FIRMWARE_PLATFORM;
} else {
	const {configOptions} = await getPersistedSocData();

	if (configOptions) {
		const {FirmwarePlatform} = configOptions;

		firmwarePlatform = FirmwarePlatform;
	}
}

export function getFirmwarePlatform() {
	return firmwarePlatform;
}
