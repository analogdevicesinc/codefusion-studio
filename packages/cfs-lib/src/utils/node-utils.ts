/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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

import os from "node:os";

/**
 * Get the host platform and map naming to match plugins format.
 * @returns The host platform string: "windows", "linux", or "osx"
 */
export const getHostPlatform = (): string => {
	const platform = os.platform();
	if (platform === "win32") {
		return "windows";
	} else if (platform === "darwin") {
		return "osx";
	} else if (platform === "linux") {
		return "linux";
	}
	return "platform";
};
