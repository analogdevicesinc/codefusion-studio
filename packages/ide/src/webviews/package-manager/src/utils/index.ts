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

import type {PackageListEntry} from '@constants/messages/package-manager-messages';
import semver from 'semver';

export const URL_REGEX = /https?:\/\/\S+/gi;

const PAIRED_CLOSERS: Record<string, string> = {
	')': '(',
	']': '[',
	'}': '{'
};

export function stripTrailingUrlPunctuation(url: string): string {
	let result = url;
	let changed = true;

	while (changed) {
		changed = false;
		const last = result[result.length - 1];

		if (!last) break;

		if (/[.,;:>"']/.test(last)) {
			result = result.slice(0, -1);
			changed = true;
		} else if (last in PAIRED_CLOSERS) {
			const opener = PAIRED_CLOSERS[last];
			const opens = (
				result.match(new RegExp(`\\${opener}`, 'g')) ?? []
			).length;
			const closes = (
				result.match(new RegExp(`\\${last}`, 'g')) ?? []
			).length;

			if (closes > opens) {
				result = result.slice(0, -1);
				changed = true;
			}
		}
	}

	return result;
}

/**
 * Compares two version strings and returns:
 * - A negative number if v1 < v2
 * - Zero if v1 == v2
 * - A positive number if v1 > v2
 *
 * Uses semver.compareBuild so build metadata (e.g. "+73") participates in
 * ordering. Accepts loose version strings (e.g. "1.0" without a patch).
 * Falls back to a lexicographic comparison for non-semver strings (e.g.
 * Conan test/CI channel versions), which compareBuild otherwise throws on.
 */
export const compareVersions = (v1: string, v2: string): number => {
	try {
		return semver.compareBuild(v1, v2, true);
	} catch {
		return v1.localeCompare(v2);
	}
};

export const isUpdateAvailable = (
	installedVersion: string,
	availableVersion: string
): boolean => compareVersions(installedVersion, availableVersion) < 0;

export const satisfiesAll = (
	version: string,
	constraints: string[]
): boolean => {
	const coerced = semver.coerce(version, {includePrerelease: true});

	return constraints.every(constraint => {
		if (coerced) {
			try {
				return semver.satisfies(coerced, constraint);
			} catch {
				return version === constraint;
			}
		}

		return version === constraint;
	});
};

/**
 * Formats a package's cached versions for display, excluding the
 * currently installed version. Returns '—' when there are none left.
 */
export const formatCachedVersions = (
	entry: Pick<PackageListEntry, 'cachedVersions' | 'installedVersion'>
): string => {
	const otherCachedVersions = entry.cachedVersions.filter(
		v => v !== entry.installedVersion
	);

	return otherCachedVersions.length > 0
		? otherCachedVersions.map(v => `v${v}`).join(', ')
		: '—';
};

/**
 * The version shown by default in a package card's dropdown:
 * - Required packages: highest available version satisfying all workspace
 *   constraints (AND semantics, semver coerce + satisfies).
 * - All others: the latest available version.
 */
export const getDefaultVersion = (
	entry: PackageListEntry
): string => {
	const sorted = [...entry.versions].sort((a, b) =>
		compareVersions(b, a)
	);
	const {requiredVersions} = entry;

	if (requiredVersions && requiredVersions.length > 0) {
		const match = sorted.find(v => satisfiesAll(v, requiredVersions));
		if (match) return match;
	}

	return sorted[0] ?? '';
};
