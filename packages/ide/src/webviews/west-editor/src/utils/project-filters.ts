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
	WestManifest,
	WestProject,
	WestProjectStatus
} from '@west-editor/types';
import {resolveProjectRemote} from './project-resolution';

/** The status filters, in the order their chips appear. */
export const PROJECT_STATUS_FILTERS: readonly WestProjectStatus[] = [
	'in-sync',
	'not-cloned',
	'different-revision',
	'untracked-files',
	'modified-files',
	'disabled'
];

/** The filters applied to the project list. */
export type ProjectFilters = Readonly<{
	statuses: readonly WestProjectStatus[];
	groups: readonly string[];
	remotes: readonly string[];
}>;

export const EMPTY_PROJECT_FILTERS: ProjectFilters = {
	statuses: [],
	groups: [],
	remotes: []
};

/**
 * @param filters Filters to inspect.
 * @returns Whether at least one filter is set.
 */
export function hasActiveFilters(filters: ProjectFilters): boolean {
	return (
		filters.statuses.length > 0 ||
		filters.groups.length > 0 ||
		filters.remotes.length > 0
	);
}

/**
 * Picks the status filters worth offering: those some project is in, plus
 * any already active so they can still be turned off.
 *
 * @param statuses Status of each project the list holds, before filtering;
 * undefined for a project whose status is not known.
 * @param active Status filters currently set.
 * @returns The status filters to show, in chip order.
 */
export function visibleStatusFilters(
	statuses: ReadonlyArray<WestProjectStatus | undefined>,
	active: readonly WestProjectStatus[]
): WestProjectStatus[] {
	return PROJECT_STATUS_FILTERS.filter(
		status => statuses.includes(status) || active.includes(status)
	);
}

/**
 * Tests a project against the active filters. Selections within a category
 * (statuses, groups, remotes) combine with OR, and the categories combine
 * with AND. A category with nothing selected does not constrain the project.
 *
 * @param project Project to test.
 * @param manifest Manifest the project belongs to, to resolve its remote.
 * @param filters Filters to apply.
 * @param status The project's status, as shown on its card, if known.
 * @returns `true` when the project satisfies every category that is set.
 */
export function matchesFilters(
	project: WestProject,
	manifest: WestManifest,
	filters: ProjectFilters,
	status?: WestProjectStatus
): boolean {
	const statusMatches =
		filters.statuses.length === 0 ||
		(status !== undefined && filters.statuses.includes(status));

	const groupMatches =
		filters.groups.length === 0 ||
		(project.groups ?? []).some(group =>
			filters.groups.includes(group)
		);

	if (!statusMatches || !groupMatches) return false;

	if (filters.remotes.length === 0) return true;

	const remote = resolveProjectRemote(project, manifest);

	return remote !== undefined && filters.remotes.includes(remote);
}
