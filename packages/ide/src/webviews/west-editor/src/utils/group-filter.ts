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

import type {WestManifest} from '@west-editor/types';

/**
 * How `group-filter` treats a group: `+group` enables it, `-group` disables
 * it, and a group the filter does not mention is `none`.
 */
export type GroupState = 'enabled' | 'disabled' | 'none';

/**
 * Splits a `group-filter` entry into its prefix and group name.
 *
 * west requires every entry to start with `+` or `-`; anything else is not a
 * filter entry, so it yields undefined and is left untouched by the editor.
 */
function parseEntry(
	entry: string
): {state: Exclude<GroupState, 'none'>; group: string} | undefined {
	const prefix = entry[0];

	if ((prefix !== '+' && prefix !== '-') || entry.length < 2) {
		return undefined;
	}

	return {
		state: prefix === '+' ? 'enabled' : 'disabled',
		group: entry.slice(1)
	};
}

/**
 * Lists every group the manifest mentions, sorted alphabetically.
 *
 * Groups named only by `group-filter` are included too: they typically belong
 * to projects pulled in by an import, and would otherwise be impossible to
 * change from the editor.
 *
 * @param manifest Manifest to collect the groups of.
 * @returns Unique group names.
 */
export function collectGroups(manifest: WestManifest): string[] {
	const groups = new Set<string>();

	for (const project of manifest.projects ?? []) {
		for (const group of project.groups ?? []) {
			groups.add(group);
		}
	}

	for (const entry of manifest['group-filter'] ?? []) {
		const parsed = parseEntry(entry);

		if (parsed) groups.add(parsed.group);
	}

	return [...groups].sort((a, b) => a.localeCompare(b));
}

/**
 * Reads the state of one group from `group-filter`.
 *
 * When a group is listed more than once, the last entry wins, as it does in
 * west.
 *
 * @param filter Value of `group-filter`.
 * @param group Group to look up.
 * @returns The group's state.
 */
export function getGroupState(
	filter: string[] | undefined,
	group: string
): GroupState {
	let state: GroupState = 'none';

	for (const entry of filter ?? []) {
		const parsed = parseEntry(entry);

		if (parsed?.group === group) state = parsed.state;
	}

	return state;
}

/**
 * Returns a copy of `group-filter` with one group set to `state`.
 *
 * Every existing entry for the group is dropped. Unless `state` is `none`, a
 * single entry takes the place of the first one, or is appended when the
 * group was not listed, so the document diff stays as small as possible.
 *
 * @param filter Current value of `group-filter`.
 * @param group Group to change.
 * @param state State to give it.
 * @returns The new filter, or undefined when it is left empty so the key can
 *   be removed from the document.
 */
export function setGroupState(
	filter: string[] | undefined,
	group: string,
	state: GroupState
): string[] | undefined {
	const replacement =
		state === 'none'
			? []
			: [`${state === 'enabled' ? '+' : '-'}${group}`];
	const next: string[] = [];
	let replaced = false;

	for (const entry of filter ?? []) {
		if (parseEntry(entry)?.group !== group) {
			next.push(entry);
		} else if (!replaced) {
			next.push(...replacement);
			replaced = true;
		}
	}

	if (!replaced) next.push(...replacement);

	return next.length > 0 ? next : undefined;
}

/** Why a group name is rejected by {@link validateGroupName}. */
export type GroupNameError =
	| 'empty'
	| 'invalidCharacter'
	| 'invalidPrefix';

/**
 * Checks a group name against west's rules: it may not contain whitespace,
 * commas or colons, and may not start with `-` or `+`, which `group-filter`
 * reserves for its entries.
 *
 * @param name Name to check, already trimmed.
 * @returns Why the name is rejected, or undefined when it is valid.
 */
export function validateGroupName(
	name: string
): GroupNameError | undefined {
	if (name.length === 0) return 'empty';

	if (/[\s,:]/.test(name)) return 'invalidCharacter';

	if (name.startsWith('-') || name.startsWith('+'))
		return 'invalidPrefix';

	return undefined;
}
