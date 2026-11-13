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

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export function checkIfFileExists(filename: string | undefined) {
	if (!filename) {
		return false;
	}

	const filepath = path.isAbsolute(filename)
		? filename
		: path.resolve(process.cwd(), filename);

	return fs.existsSync(filepath);
}

export function readJsonFile<T = Record<string, unknown>>(
	filename: string
): T {
	let fileContent: string;

	try {
		fileContent = fs.readFileSync(filename, "utf8");
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") {
			throw new Error(`File not found: ${filename}`);
		}
		throw new Error(`Unable to read file: ${filename}`);
	}

	try {
		return JSON.parse(fileContent) as T;
	} catch {
		throw new Error(
			`The file: ${filename} is not a valid JSON file.`
		);
	}
}

/**
 * Computes the SHA-256 hash of a file's contents, streaming it from disk
 * to keep memory usage flat regardless of file size.
 *
 * @param filePath - Absolute or relative path to the file to hash.
 * @param workspace - Base directory used to resolve `filePath` when it
 * is relative. Defaults to `process.cwd()`.
 * @returns The hex-encoded SHA-256 digest of the file's contents.
 */
export function hashFile(
	filePath: string,
	workspace?: string
): Promise<string> {
	const resolvedPath = path.isAbsolute(filePath)
		? filePath
		: path.resolve(workspace ?? process.cwd(), filePath);

	return new Promise((resolve, reject) => {
		const hash = crypto.createHash("sha256");
		const stream = fs.createReadStream(resolvedPath);

		stream.on("data", (chunk) => hash.update(chunk));
		stream.on("error", reject);
		stream.on("end", () => resolve(hash.digest("hex")));
	});
}

/**
 * Asserts a given file's extension matches what is expected
 *
 * @param filename - File to validate
 * @param validExtensions - Extensions to check against e.g. [".tflite", ".pth.tar"]
 * @throws If the file extension doesn't match any valid extension
 */
export function assertValidFileExtension(
	filename: string,
	validExtensions: string[]
): void {
	if (!validExtensions.some((ext) => filename.endsWith(ext))) {
		throw new Error(
			`Invalid file extension for "${filename}", supported: ${validExtensions.join(", ")}`
		);
	}
}
