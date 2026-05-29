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

import { existsSync, readdirSync } from "fs";
import path from "node:path";

export function findWorkspaceConfigFile(
	workspacePath: string
): string | undefined {
	// If no .cfs folder exists, we're not in a workspace folder. We could be in a sub-folder, so search
	// up the directory tree until we find a .cfs folder or reach the root.
	let currentPath = workspacePath;

	while (!existsSync(path.join(currentPath, ".cfs"))) {
		const parentPath = path.dirname(currentPath);
		if (parentPath === currentPath) {
			// Reached the root without finding a .cfs folder
			throw new Error(
				`Error loading serial port settings from ${workspacePath}. Please ensure this is a valid workspace folder.`
			);
		}

		currentPath = parentPath;
	}

	const cfsconfigFile = readdirSync(
		path.join(currentPath, ".cfs")
	).find((f) => f.endsWith(".cfsconfig"));

	if (!cfsconfigFile) {
		return undefined; // no config file found
	}

	return path.join(currentPath, ".cfs", cfsconfigFile);
}
