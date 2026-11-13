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
import {useMemo, useState} from 'react';
import {Card, EmptyState} from 'cfs-react-library';
import type {WestProject} from '@west-editor/types';
import {useLocaleContext} from '@common/contexts/LocaleContext';
import {localizeWithArgs} from '@common/utils/string';
import {useWestEditor} from '../contexts/WestEditorContext';
import {
	resolveProjectPath,
	resolveProjectUrl
} from '../utils/project-resolution';
import {
	EMPTY_PROJECT_FILTERS,
	hasActiveFilters,
	matchesFilters,
	visibleStatusFilters
} from '../utils/project-filters';
import {matchesSearch} from '../utils/project-search';
import ProjectCard from './ProjectCard';
import ProjectsToolbar from './ProjectsToolbar';
import styles from './Section.module.scss';

/** The repositories the manifest pulls in, one card each. */
export default function ProjectsSection() {
	const l10n = useLocaleContext();
	const {manifest, groups, statuses, updateManifest} =
		useWestEditor();
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState(EMPTY_PROJECT_FILTERS);
	const remoteNames = useMemo(
		() => manifest?.remotes?.map(remote => remote.name) ?? [],
		[manifest?.remotes]
	);

	if (!manifest) return null;

	const projects = manifest.projects ?? [];

	const commit = (next: WestProject[]) => {
		updateManifest({
			...manifest,
			projects: next.length > 0 ? next : undefined
		});
	};

	// Spreads the whole project on purpose: `applyManifestEdits` replaces an
	// entry rather than merging it, so an omitted key is deleted and a
	// leftover key grafts onto the entry that follows. Do not narrow this to
	// a partial payload.
	const patch = (index: number, changes: Partial<WestProject>) => {
		commit(
			projects.map((project, i) =>
				i === index ? {...project, ...changes} : project
			)
		);
	};

	// Pairs the entry with its position before filtering: `patch` and `commit`
	// address the manifest by index, so a filtered list must carry the
	// original index rather than its own.
	const matches = projects
		.map((project, index) => ({project, index}))
		.filter(
			({project}) =>
				matchesSearch(project.name, search) &&
				matchesFilters(
					project,
					manifest,
					filters,
					statuses?.[project.name]
				)
		);

	return (
		<>
			<ProjectsToolbar
				search={search}
				filters={filters}
				// Statuses also cover workspace projects this manifest does not
				// list, so only the manifest's own projects decide the chips.
				statusFilters={visibleStatusFilters(
					projects.map(project => statuses?.[project.name]),
					filters.statuses
				)}
				groups={groups}
				remotes={remoteNames}
				onSearchChange={setSearch}
				onFiltersChange={setFilters}
			/>
			<section className={styles.section}>
				{projects.length === 0 && (
					<p className={styles.empty}>{l10n?.projects.empty}</p>
				)}
				{projects.length > 0 && matches.length === 0 && (
					<Card disableHoverEffects>
						<div className={styles.noResults}>
							<EmptyState
								type='info'
								title={l10n?.projects.noResultsTitle}
								description={
									search.trim() === '' && hasActiveFilters(filters)
										? l10n?.projects.noResultsFiltersDescription
										: localizeWithArgs(
												l10n,
												'projects.noResultsDescription',
												{search}
											)
								}
								dataTest='west-editor:projects-no-results'
							/>
						</div>
					</Card>
				)}
				{matches.map(({project, index}) => (
					<ProjectCard
						// eslint-disable-next-line react/no-array-index-key
						key={`project-${index}`}
						project={project}
						resolvedUrl={resolveProjectUrl(project, manifest)}
						effectivePath={resolveProjectPath(project)}
						inheritedRevision={manifest.defaults?.revision}
						index={index}
						searchTerm={search}
						availableGroups={groups}
						status={statuses ? statuses[project.name] : 'loading'}
						onRevisionChange={value => {
							patch(index, {revision: value || undefined});
						}}
						onGroupsChange={next => {
							patch(index, {
								groups: next.length > 0 ? next : undefined
							});
						}}
						onDelete={() => {
							commit(projects.filter((_, i) => i !== index));
						}}
					/>
				))}
			</section>
		</>
	);
}
