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

import envPaths from "env-paths";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "url";

/**
 * Utility functions for Packman.
 */
const PackmanUtils = {
	/**
	 * Determines the installation path for CodeFusion Studio (CFS) by locating the `cfs.json` file.
	 *
	 * The method searches for the `cfs.json` file on parent directories of this file.
	 *
	 * If the `cfs.json` file is not found in any of the parent directories, it is searched on
	 * CFS_INSTALL_DIR environment variable (if defined). If file is not present there (or the variable
	 * is not defined) an error is logged an undefined is returned.
	 *
	 * @returns The directory path containing the `cfs.json` file, or `undefined` if the file is not found.
	 */
	getCFSInstallPath(): string | undefined {
		// Try to find CFS install root folder on parent directories
		let searchDir = path.dirname(fileURLToPath(import.meta.url));
		do {
			if (existsSync(path.join(searchDir, "cfs.json"))) {
				return searchDir;
			}
			searchDir = path.dirname(searchDir);
			// Stop if we reach the root folder
		} while (searchDir != path.dirname(searchDir));

		// We didn't find the root folder, let's try to use the environment variable
		// We are only checking environment variable after searching for the installer on purpose, so if the code
		// is run from an installer, the environment variable is not used.
		const cfsInstallerHome = process.env.CFS_INSTALL_DIR;
		if (!cfsInstallerHome) {
			console.error(
				"Running outside of CFS installation and CFS_INSTALL_DIR environment variable not set. Cannot find CFS installer"
			);
			return undefined;
		}

		if (!existsSync(path.join(cfsInstallerHome, "cfs.json"))) {
			console.error(
				`cfs.json file not found in CFS_INSTALL_DIR (${cfsInstallerHome}). Cannot find CFS installer`
			);
			return undefined;
		}

		return cfsInstallerHome;
	},

	/**
	 * Gets the path to the package manager application data directory.
	 *
	 * This directory is used to store package manager related data, such as cache and indexes.
	 *
	 * @returns The path to the package manager application data directory.
	 */

	getPkgMgrAppDataPath(): string {
		// Variables to default location of package manager cache and index on APPDATA
		const cfsAppDataPath = envPaths("com.analog.cfs", {
			suffix: ""
		})[process.platform === "darwin" ? "config" : "data"];

		const pkgMgrAppDataPath = path.join(cfsAppDataPath, "packages");
		return pkgMgrAppDataPath;
	}
};

export default PackmanUtils;
