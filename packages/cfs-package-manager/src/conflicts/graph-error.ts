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

import type {
	CfsDependencyConflict,
	CfsPackageReference
} from "../api/api.js";

/**
 * One side of a version conflict, as Conan reports it.
 *
 * Only `require.ref` is read. `src_id`/`src_ref` name the node Conan hung the
 * requirement off, which is not the package that declared it: a transitive
 * requirement is attributed to the graph root and reported as the string
 * "None", indistinguishable from one the caller really did ask for. The
 * requirement itself is unambiguous, so the conflict is described with that.
 */
export interface ConanConflictBranch {
	src_id?: string;
	src_ref?: string;
	require?: { ref?: string };
}

/**
 * The `graph.error` object Conan serializes when graph resolution fails,
 * built alongside the human-readable message rather than instead of it.
 */
export interface ConanGraphError {
	/** "conflict", "missing", "loop" or "provide_conflict". */
	type: string;
	/** Package the branches disagree about; present for conflicts. */
	name?: string;
	branch1?: ConanConflictBranch;
	branch2?: ConanConflictBranch;
}

/**
 * Splits a `name/version` reference into its parts.
 */
function parseRef(ref: string): CfsPackageReference {
	const separator = ref.indexOf("/");

	if (separator === -1) {
		return { name: ref, version: "" };
	}

	// Conan writes ranges as "[^2.3.0]" and may append a #revision.
	const raw = ref.slice(separator + 1).split("#")[0];
	const version =
		raw.startsWith("[") && raw.endsWith("]") ? raw.slice(1, -1) : raw;

	return {
		name: ref.slice(0, separator),
		version: version.replace(", include_prerelease", "")
	};
}

/**
 * Converts Conan's `graph.error` into the requirements that clashed.
 *
 * @param error - The `graph.error` object from a failed `conan graph info`
 * @returns The conflict, or undefined when the failure was not a conflict
 */
export function conflictFromGraphError(
	error: ConanGraphError
): CfsDependencyConflict | undefined {
	const packageName = error.name;

	if (error.type !== "conflict" || packageName === undefined) {
		return undefined;
	}

	const conflictingRequirements: CfsPackageReference[] = [];
	const seen = new Set<string>();

	for (const branch of [error.branch1, error.branch2]) {
		const requirementRef = branch?.require?.ref;

		if (requirementRef === undefined) {
			continue;
		}

		const requirement = parseRef(requirementRef);
		const key = `${requirement.name}/${requirement.version}`;

		// Both sides can name the same requirement when the conflict is
		// reported from two places in the graph; show it once.
		if (!seen.has(key)) {
			seen.add(key);
			conflictingRequirements.push(requirement);
		}
	}

	return { packageName, conflictingRequirements };
}
