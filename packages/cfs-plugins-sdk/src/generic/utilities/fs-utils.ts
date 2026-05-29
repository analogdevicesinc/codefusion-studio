/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import type { CfsFileMap } from "cfs-types";
import fg from "fast-glob";
import { copyFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { evalNestedTemplateLiterals } from "./cfs-utilities.js";

/**
 * Copy files defined in the .cfsplugin info file to their output directory
 * @param files - The files to copy
 * @param data - The data context for evaluating conditions (e.g., { context: { soc: 'max32655', package: 'wlp' } })
 */
export async function copyFiles(
	files: CfsFileMap[],
	data: Record<string, unknown>
): Promise<void> {
	for (const file of files) {
		try {
			// Evaluate condition if present
			const condition = file.condition
				? evalNestedTemplateLiterals(file.condition, data) === "true"
				: true;

			if (!condition) {
				// When condition is false, we skip the file.
				continue;
			}

			const dstPath = file.dst.replace(/\\/g, "/");
			const fullPath = file.src.replace(/\\/g, "/");

			const filesToCopy = await fg.glob(fullPath);

			for (const fileToCopy of filesToCopy) {
				const fileName = path.basename(fileToCopy);

				// Determine if destination should be treated as a directory
				// Check if dst path has no extension or explicitly ends with /
				const isDstDirectory =
					!path.extname(dstPath) || dstPath.endsWith("/");

				let finalDstPath: string;

				if (isDstDirectory) {
					// Destination is a directory - create it and copy file into it
					await mkdir(dstPath, { recursive: true });
					finalDstPath = path.join(dstPath, fileName);
				} else {
					// Destination is a specific file path - create parent directory
					await mkdir(path.dirname(dstPath), { recursive: true });
					finalDstPath = dstPath;
				}

				await copyFile(fileToCopy, finalDstPath);
			}
		} catch (error) {
			throw new Error(
				`Failed to copy file from ${file.src} to ${
					file.dst
				}: ${String(error)}`
			);
		}
	}
}
