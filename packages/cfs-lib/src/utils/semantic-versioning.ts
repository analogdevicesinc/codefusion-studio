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

import * as semver from "semver";

/**
 * Find the latest version string from a list of semantic version strings.
 * @param versions - Array of version strings (e.g., ["1.0.0", "1.2.0"])
 * @returns The highest (latest) version string, or undefined if no valid versions found.
 */
export function findLatestVersion(
	versions: string[]
): string | undefined {
	if (versions.length === 0) {
		return undefined;
	}

	// Filter out invalid versions and sort descending
	const validVersions = versions.filter((v) => semver.valid(v));

	if (validVersions.length === 0) {
		return undefined;
	}

	const sorted = semver.rsort([...validVersions]);

	return sorted[0];
}

/**
 * Find a matching version from available versions based on a version or range specification.
 *
 * @param versionOrRange - Either an exact version or a valid semver range
 * See: https://www.npmjs.com/package/semver for a list of all valid range formats
 *
 * @param availableVersions - Array of available version strings to match against
 * @returns The matching version string if found, undefined otherwise
 *
 * @example
 * // Exact version - requires exact match
 * findMatchingVersion("1.2.0", ["1.0.0", "1.2.0", "1.3.0"]) // "1.2.0"
 *
 * @example
 * // Semver ranges - finds highest compatible version.
 * findMatchingVersion("^1.0.0", ["1.0.0", "1.2.0", "2.0.0"]) // "1.2.0"
 * findMatchingVersion("~1.2.0", ["1.2.0", "1.2.5", "1.3.0"]) // "1.2.5"
 * findMatchingVersion(">=1.1.0 <2.0.0", ["1.0.0", "1.2.0", "1.5.0", "2.0.0"]) // "1.5.0"
 *
 * @example
 * // No match found
 * findMatchingVersion("3.0.0", ["1.0.0", "2.0.0"]) // undefined
 */
export function findMatchingVersion(
	versionOrRange: string,
	availableVersions: string[]
): string | undefined {
	// Filter to only valid semver versions
	const validVersions = availableVersions.filter((v) =>
		semver.valid(v)
	);

	// Check if input is an exact valid version
	if (semver.valid(versionOrRange)) {
		// Exact version - require exact match
		const exactMatch = validVersions.find((v) =>
			semver.eq(v, versionOrRange)
		);

		return exactMatch;
	}

	// Check if input is a valid range
	if (semver.validRange(versionOrRange)) {
		// Range - find highest satisfying version
		return (
			semver.maxSatisfying(validVersions, versionOrRange) ?? undefined
		);
	}

	// Invalid version/range format
	return undefined;
}
