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
 * Turns a manifest entry into what west will actually do with it.
 *
 * A project rarely spells out its fetch URL or its destination on disk: both
 * are derived from the rest of the manifest. These resolvers apply west's own
 * rules so the editor can display the effective value rather than the raw key.
 */
import type {WestManifest, WestProject} from '@west-editor/types';

/**
 * Resolves the remote west fetches a project from.
 *
 * A project with its own `url` bypasses remotes entirely. Otherwise its
 * `remote` applies, falling back to the manifest default.
 *
 * @param project Project to resolve.
 * @param manifest Manifest the project belongs to, for its defaults.
 * @returns The remote name, or `undefined` when none applies.
 */
export function resolveProjectRemote(
	project: WestProject,
	manifest: WestManifest
): string | undefined {
	if (project.url) return undefined;

	return project.remote ?? manifest.defaults?.remote;
}

/**
 * Resolves the URL west fetches a project from.
 *
 * `url` wins outright. Otherwise the project's remote - or the manifest
 * default - supplies a `url-base`, which is joined to `repo-path` (falling
 * back to the project name, not its path).
 *
 * @param project Project to resolve.
 * @param manifest Manifest the project belongs to, for its remotes and defaults.
 * @returns The fetch URL, or `undefined` when no remote resolves.
 */
export function resolveProjectUrl(
	project: WestProject,
	manifest: WestManifest
): string | undefined {
	if (project.url) return project.url;

	const remoteName = resolveProjectRemote(project, manifest);

	if (!remoteName) return undefined;

	const urlBase = manifest.remotes?.find(
		remote => remote.name === remoteName
	)?.['url-base'];

	if (!urlBase) return undefined;

	return `${urlBase.replace(/\/+$/, '')}/${project['repo-path'] ?? project.name}`;
}

/**
 * Resolves where west checks a project out, relative to the workspace topdir.
 *
 * @param project Project to resolve.
 * @returns The project's `path`, or its name - west's own default.
 */
export function resolveProjectPath(project: WestProject): string {
	return project.path ?? project.name;
}
