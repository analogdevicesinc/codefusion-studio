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

import type { CfsDependencyConflict } from "../api/api.js";
import { conflictFromGraphError } from "./graph-error.js";
import type { ConanGraphError } from "./graph-error.js";

export { conflictFromGraphError };
export type { ConanGraphError };

/**
 * Dependency resolution failed with a cause Conan described structurally, so
 * callers can explain it themselves instead of surfacing Conan's own message.
 */
export class ConanGraphFailure extends Error {
	/** Conan's own description of what went wrong. */
	readonly graphError: ConanGraphError;

	/** The disputed dependency, absent when the failure was not a conflict. */
	readonly conflict?: CfsDependencyConflict;

	constructor(graphError: ConanGraphError) {
		const conflict = conflictFromGraphError(graphError);

		super(
			conflict
				? `Version conflict on ${conflict.packageName}`
				: `Dependency resolution failed (${graphError.type})`
		);

		this.name = "ConanGraphFailure";
		this.graphError = graphError;
		this.conflict = conflict;
	}
}

/**
 * True when dependency resolution failed with a cause Conan described.
 *
 * Checks the shape rather than the class, because a bundler can give the
 * thrower and the catcher separate copies of this module, and `instanceof`
 * then fails silently — losing the very detail the failure carries.
 */
export function isConanGraphFailure(
	error: unknown
): error is ConanGraphFailure {
	return (
		error instanceof Error &&
		error.name === "ConanGraphFailure" &&
		"graphError" in error
	);
}
