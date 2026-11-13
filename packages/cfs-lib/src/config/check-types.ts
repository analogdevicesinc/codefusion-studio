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

/**
 * Severity levels a configuration check can report, ordered from most to
 * least severe:
 * - `critical`: an error that invalidates the document; it cannot be used.
 * - `warning`: a potential problem that does not invalidate the document.
 * - `info`: advisory information only.
 *
 * `critical` is the only error severity and causes the overall result to be
 * invalid. `warning` and `info` never affect validity. These names match the
 * severity vocabulary used elsewhere in CodeFusion Studio (the AI
 * compatibility analyzer and the IDE report view).
 */
export type CheckSeverity = "critical" | "info" | "warning";

/**
 * A single finding produced by a configuration check.
 */
export interface CheckDiagnostic {
	/** The set of allowed values, populated for `enum`-style violations. */
	allowedValues?: unknown[];
	/**
	 * JSON Pointer to the offending location, when the check operates on a
	 * specific part of the document (for example `/Projects/1/Access`).
	 */
	instancePath?: string;
	/** Human-readable description of the finding. */
	message: string;
	/** Identifier of the check that produced this finding. */
	ruleId: string;
	/** Severity of the finding. */
	severity: CheckSeverity;
	/** The offending value found at `instancePath`, when available. */
	value?: unknown;
}

/**
 * The outcome of running the checks over a single configuration document.
 */
export interface CheckResult {
	/** Every finding produced by the checks, in the order they were found. */
	diagnostics: CheckDiagnostic[];
	/** True when no diagnostic has an error (`critical`) severity. */
	valid: boolean;
}

/**
 * Whether a severity is an error severity (`critical`).
 * @param severity - The severity to test.
 * @returns True when the severity invalidates a document.
 */
export function isErrorSeverity(severity: CheckSeverity): boolean {
	return severity === "critical";
}

/**
 * Derive overall validity from a set of diagnostics. A document is valid when
 * it has no error-severity (`critical`) diagnostics.
 * @param diagnostics - The diagnostics to inspect.
 * @returns True when no diagnostic has an error severity.
 */
export function isValid(diagnostics: CheckDiagnostic[]): boolean {
	return !diagnostics.some((diagnostic) =>
		isErrorSeverity(diagnostic.severity)
	);
}
