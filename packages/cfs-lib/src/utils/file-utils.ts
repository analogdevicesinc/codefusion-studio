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

export function readJsonFile(filename: string) {
	try {
		const fileContent = fs.readFileSync(filename, "utf8");
		return JSON.parse(fileContent) as Record<string, unknown>;
	} catch {
		throw new Error(
			`The file: ${filename} is not a valid JSON file.`
		);
	}
}
