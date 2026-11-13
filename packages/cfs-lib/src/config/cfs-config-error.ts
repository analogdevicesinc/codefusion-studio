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

import type { CheckDiagnostic } from "./check-types.js";

/**
 * The reason a {@link CfsConfigError} was raised. These are the failures that
 * make a config file unusable, so they are surfaced when a
 * {@link CfsConfigValidator} instance is created rather than as check diagnostics.
 * - `FILE_NOT_FOUND`: the file does not exist or could not be read.
 * - `INVALID_JSON`: the file exists but does not contain valid JSON.
 * - `SCHEMA_INVALID`: the file is valid JSON but does not conform to the
 *   `.cfsconfig` schema, so it cannot be loaded as typed data.
 */
export type CfsConfigErrorCode =
	| "FILE_NOT_FOUND"
	| "INVALID_JSON"
	| "SCHEMA_INVALID";

/**
 * Raised when a configuration file cannot be loaded into a {@link CfsConfigValidator}
 * instance. It carries a machine-readable {@link CfsConfigErrorCode} and the
 * offending file path so callers (the CLI, the IDE backend, MCP) can present
 * the shared message in whatever form suits them.
 */
export class CfsConfigError extends Error {
	/* The machine-readable reason for the failure. */
	readonly code: CfsConfigErrorCode;
	/* The path of the file that could not be loaded. */
	readonly filePath: string;
	/**
	 * The schema violations that caused the failure. Populated only for
	 * `SCHEMA_INVALID` so callers that report configuration problems (for
	 * example the CLI validator) can render per-property detail instead of a
	 * single opaque message.
	 */
	readonly diagnostics: CheckDiagnostic[];

	/**
	 * @param code - The machine-readable reason for the failure.
	 * @param filePath - The path of the file that could not be loaded.
	 * @param message - A human-readable description of the failure.
	 * @param diagnostics - The schema violations behind a `SCHEMA_INVALID`
	 * failure, when available.
	 */
	constructor(
		code: CfsConfigErrorCode,
		filePath: string,
		message: string,
		diagnostics: CheckDiagnostic[] = []
	) {
		super(message);
		this.name = "CfsConfigError";
		this.code = code;
		this.filePath = filePath;
		this.diagnostics = diagnostics;
	}
}
