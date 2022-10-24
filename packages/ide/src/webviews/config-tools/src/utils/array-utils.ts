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
export function arraysAreEqual(array1: string[], array2: string[]) {
	if (array1.length !== array2.length) {
		return false;
	}

	for (let i = 0; i < array1.length; i++) {
		if (array1[i] !== array2[i]) {
			return false;
		}
	}

	return true;
}
