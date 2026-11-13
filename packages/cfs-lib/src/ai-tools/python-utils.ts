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

import { promises as fs } from "node:fs";
import * as path from "path";

const isWindows = process.platform === "win32";

export function getPythonExecutablePath(
	cfsAiPath: string,
	packageName: string
): string {
	return path.join(
		cfsAiPath,
		"..",
		packageName,
		"python",
		isWindows ? "python.exe" : "bin/python3"
	);
}

export async function assertFileExists(
	filePath: string,
	errorMessage: string
): Promise<string> {
	try {
		await fs.stat(filePath);
		return filePath;
	} catch {
		throw new Error(errorMessage);
	}
}

export function cleanPythonEnv(): NodeJS.ProcessEnv {
	const env = { ...process.env };
	delete env.PYTHONHOME;
	delete env.PYTHONPATH;
	return env;
}
