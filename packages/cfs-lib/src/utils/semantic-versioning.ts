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

/**
 * Compare two semantic version strings
 * @param a - First version string
 * @param b - Second version string
 * @returns Positive number if a > b, negative if a < b, 0 if equal
 */
export function compareVersions(a: string, b: string): number {
	const parseVersion = (version: string) => {
		const parts = version.split(".").map((part) => parseInt(part, 10) || 0);
		return {
			major: parts[0] || 0,
			minor: parts[1] || 0,
			patch: parts[2] || 0
		};
	};

	const versionA = parseVersion(a);
	const versionB = parseVersion(b);

	if (versionA.major !== versionB.major) {
		return versionA.major - versionB.major;
	}
	if (versionA.minor !== versionB.minor) {
		return versionA.minor - versionB.minor;
	}
	return versionA.patch - versionB.patch;
}

/**
 * Find the latest version string from a list of semantic version strings.
 * @param versions - Array of version strings (e.g., ["1.0.0", "1.2.0"])
 * @returns The highest (latest) version string.
 */
export function findLatestVersion(versions: string[]): string {
	return versions.reduce((latest, current) => {
		return compareVersions(current, latest) > 0 ? current : latest;
	});
}
