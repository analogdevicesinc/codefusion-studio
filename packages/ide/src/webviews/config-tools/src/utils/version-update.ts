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

import {
	searchPackage,
	updatePersistedConfigDataModelVersion,
	updatePersistedConfigPluginVersion
} from './api';
import semver from 'semver';
import type {CfsUpdateStatus} from '../screens/error/version-updater/missing-components/missing-components-error';
import type {CfsPackage} from 'cfs-package-manager';
import type {
	CfsMissingComponent,
	CfsUpdateResolution
} from 'cfs-types';

/**
 * Update file to use locally available component versions
 * @param resolutions List of resolutions with updates to local versions
 */
export async function updateVersionInCfsConfigFile(
	resolutions: CfsUpdateResolution[]
): Promise<CfsUpdateStatus[]> {
	const updateStatuses: CfsUpdateStatus[] = [];

	for (const fileUpdateResolution of resolutions) {
		// We have to update cfsconfig when selected resolutions is
		// ...to use local version
		// ...to upgrade and use upgraded version
		// considering using future compatible versions
		const {
			missingComponent,
			resolution,
			packageForUpdate,
			latestLocalCompatibleComponentVersion,
			allowFutureCompatibleVersion
		} = fileUpdateResolution;

		let versionToUse: string | undefined;

		if (resolution === 'UPDATE_CFS_FILE') {
			versionToUse = latestLocalCompatibleComponentVersion;
		} else if (
			resolution === 'UPDATE_CFS_FILE_AND_INSTALL_LATEST_COMPATIBLE'
		) {
			versionToUse = packageForUpdate?.componentVersion;
		} else if (resolution === 'INSTALL_REQUIRED_VERSION') {
			versionToUse = missingComponent.version;
		}

		if (!versionToUse) {
			continue;
		}

		const versionValue = allowFutureCompatibleVersion
			? `^${versionToUse}`
			: versionToUse;

		if (missingComponent.type === 'data-model') {
			// eslint-disable-next-line no-await-in-loop
			const results = await updateDataModelVersion(
				missingComponent.id,
				versionValue
			);

			updateStatuses.push({
				componentId: results.componentId,
				success: results.success,
				error: results.error
			});
		} else if (missingComponent.type === 'plugin') {
			// eslint-disable-next-line no-await-in-loop
			const results = await updateProjectPluginVersion(
				missingComponent.id,
				versionValue
			);

			updateStatuses.push({
				componentId: results.componentId,
				success: results.success,
				error: results.error
			});
		}
	}

	return updateStatuses;
}

/**
 * Update version of data model
 * @param componentId ID of the data model
 * @param version Version number to update on
 * @returns
 */
export const updateDataModelVersion = async (
	componentId: string,
	version: string
) => updatePersistedConfigDataModelVersion(componentId, version);

/**
 * Update version for given plugin
 * @param componentId pluginId
 * @param version Version number to update on
 * @returns
 */
export const updateProjectPluginVersion = async (
	componentId: string,
	version: string
) => updatePersistedConfigPluginVersion(componentId, version);

/**
 * Search for packages that contains specified components
 * @param componentList List of components, such as data model names or plugins. For example:
 * @returns List of packages for all specified components
 */
export const searchRemotePackagesForComponents = async (
	componentList: CfsMissingComponent[]
) => {
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => {
			reject(new Error('timeout'));
		}, 30000);
	});

	return Promise.race([searchPackage(componentList), timeoutPromise]);
};

export const filterLatestCompatiblePackageForGivenComponentVersion = (
	packages: CfsPackage[],
	componentName: string,
	componentVersion: string
) => {
	const allMatches = packages.flatMap(
		pkg =>
			pkg?.components
				?.filter(comp => comp.name === componentName)
				?.filter(comp =>
					getLatestCompatible(componentVersion, [comp.version])
				)
				?.map(comp => ({
					packageReference: {
						name: pkg.reference.name,
						version: pkg.reference.version
					},
					componentVersion: comp.version
				})) ?? []
	);

	if (allMatches.length === 0) return undefined;

	return allMatches.sort((a, b) =>
		semver.compare(b.componentVersion, a.componentVersion)
	)[0];
};

export const filterPackagesForGivenComponentVersion = (
	packages: CfsPackage[],
	componentName: string,
	componentVersion: string
) =>
	packages.flatMap(
		pkg =>
			pkg?.components
				?.filter(
					comp =>
						comp.name === componentName &&
						comp.version === componentVersion
				)
				?.map(comp => ({
					packageReference: {
						name: pkg.reference.name,
						version: pkg.reference.version
					},
					componentVersion: comp.version
				})) ?? []
	);

export const getLatestCompatible = (
	requested: string,
	available: string[]
): string | undefined => {
	const range = semver.valid(requested)
		? `^${requested}`
		: semver.validRange(requested);

	if (!range) return undefined;

	return semver.maxSatisfying(available, range) ?? undefined;
};

export const formatVersionForDisplay = (version: string): string => {
	const dashMatch = version.match(/^(.+)-(.+)$/);

	if (dashMatch) {
		return dashMatch[2];
	}

	return version.replace(/^[~^]/, '');
};

export const isSameEffectiveVersion = (
	a: string,
	b: string
): boolean => {
	const ca = semver.coerce(a);
	const cb = semver.coerce(b);

	if (!ca || !cb) return a === b;

	return semver.eq(ca, cb);
};
