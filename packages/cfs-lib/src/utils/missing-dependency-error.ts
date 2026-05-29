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
 * Generic error thrown when a required dependency of any type is missing.
 *
 * - `dependencyType`: The type of dependency (e.g. "data-model", "plugin", "tool", etc)
 * - `details`: Metadata describing the missing dependency(s)
 * - `message`: Optional custom error message (otherwise a generic one is used)
 */
export class MissingDependencyError extends Error {
	public readonly name = "MissingDependencyError";
	public readonly dependencyType: string;
	public readonly details: Record<string, unknown>;

	constructor(
		dependencyType: string,
		details: Record<string, unknown> = {},
		message?: string
	) {
		super(
			message ??
				`Required dependency of type "${dependencyType}" is missing.`
		);
		this.dependencyType = dependencyType;
		this.details = details;
		Object.setPrototypeOf(this, MissingDependencyError.prototype);
	}
}
