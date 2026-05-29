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

/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type {
	CfsPackageManagerProvider,
	CfsPackageReference
} from "cfs-package-manager";
import type { CfsSocDataModel } from "cfs-types";
import { findMatchingVersion } from "../utils/semantic-versioning.js";
import { MissingDependencyError } from "../utils/missing-dependency-error.js";

const DATA_MODEL_INDEX_FILENAME = ".cfsdatamodels";

interface DataModelIndexEntry {
	version: string;
	schema: string;
	timestamp: string;
	description: string;
	path: string;
	traceInfo?: boolean;
}

type DataModelIndex = Record<
	string,
	Record<string, DataModelIndexEntry>
>;

export interface DataModelMetaData {
	name: string;
	version: string;
	schema: string;
	package: string;
	timestamp: string;
	description: string;
	path: string;
	pkgPath: string;
	pkgName?: string; // custom search paths will not have this field.
	traceInfo?: boolean;
}

interface SearchLocation {
	packageRef?: CfsPackageReference;
	path: string;
}

export class CfsDataModelManager {
	private pkgManager: CfsPackageManagerProvider | undefined;

	/**
	 * Custom search paths for data models.
	 * Accepts a static array of paths or a function that returns an array.
	 */
	private customSearchPaths: string[] | (() => string[]) = [];

	/**
	 * Cache for data model index files.
	 * Structure: dataModelIndexCache[name][packageId][version] = metadata
	 */
	private dataModelIndexCache: Record<
		// Normalized SoC name (lowercase)
		string,
		// Normalized package ID (lowercase) as first level key
		// Data model version as second level key
		Record<string, Record<string, DataModelMetaData>>
	> = {};

	/**
	 * Cache for parsed data models.
	 * Structure: dataModelCache[name][packageId][version] = CfsSocDataModel
	 */
	private dataModelCache: Record<
		string,
		Record<string, Record<string, CfsSocDataModel>>
	> = {};

	constructor(
		pkgManager: CfsPackageManagerProvider | undefined,
		searchPaths: string[] | (() => string[]) = () => []
	) {
		this.pkgManager = pkgManager;
		this.customSearchPaths = searchPaths;
	}

	/**
	 * Validate that a data model exists without loading it.
	 * Checks cache and index without reading/parsing the actual JSON file.
	 * @param name - SoC name
	 * @param packageId - Package identifier
	 * @param dataModelVersion - optional data model version or semver range
	 * @throws {MissingDependencyError} if no matching data model is found
	 */
	public async validateDataModel(
		name: string,
		packageId: string,
		dataModelVersion: string
	): Promise<void> {
		const normalizedName = name.toLowerCase();
		const normalizedPackageId = packageId.toLowerCase();

		// 1) Check if already cached (fully loaded)
		const cachedModel = this.findCachedDataModelByVersionOrRange(
			normalizedName,
			normalizedPackageId,
			dataModelVersion
		);

		if (cachedModel) {
			return; // Already loaded, validation successful
		}

		// 2) Check if exists in index cache (metadata only, no file read)
		const cachedMeta = this.resolveDataModelMetadata(
			normalizedName,
			normalizedPackageId,
			dataModelVersion
		);

		if (cachedMeta) {
			return; // Exists in index, validation successful
		}

		// 3) Not in index, refresh from package manager and custom paths
		await this.discoverDataModelPackages();

		// 4) Check index again after discovery
		const discoveredMeta = this.resolveDataModelMetadata(
			normalizedName,
			normalizedPackageId,
			dataModelVersion
		);

		if (discoveredMeta) {
			return; // Found after discovery, validation successful
		}

		// 5) Still not found - throw error with available versions
		const availableVersions = this.getAvailableVersionsFromCache(
			normalizedName,
			normalizedPackageId
		);

		throw new MissingDependencyError("data-model", {
			socName: name,
			packageId,
			requestedVersion: dataModelVersion,
			availableVersions
		});
	}

	/**
	 * Get a data model by name, packageId, and optional dataModelVersion.
	 * Supports semver ranges (e.g., "^1.0.0", "~1.2.0", "1.x") in addition to exact versions.
	 * @param name - SoC name
	 * @param packageId - Package identifier
	 * @param dataModelVersion - optional data model version or semver range (latest if undefined)
	 * @returns Parsed data model object
	 * @throws {MissingDependencyError} if no matching data model is found
	 */
	public async getDataModel(
		name: string,
		packageId: string,
		dataModelVersion?: string
	): Promise<CfsSocDataModel> {
		const normalizedName = name.toLowerCase();
		const normalizedPackageId = packageId.toLowerCase();

		let result: CfsSocDataModel | undefined;

		// 1) Check cache for either specific or latest version (undefined treated as "*")
		result = this.findCachedDataModelByVersionOrRange(
			normalizedName,
			normalizedPackageId,
			dataModelVersion
		);

		if (result) return result;

		// 2) Not found in cache, look in index and parse if found
		const cachedMeta = this.resolveDataModelMetadata(
			normalizedName,
			normalizedPackageId,
			dataModelVersion
		);

		if (cachedMeta) {
			result = this.loadDataModelFromMetadata(
				normalizedName,
				normalizedPackageId,
				cachedMeta
			);
		}

		if (result) return result;

		// 3) If no matching data model is found in the cached index, refresh the index cache
		// with the latest data from package manager and custom search paths
		await this.discoverDataModelPackages();

		const discoveredMeta = this.resolveDataModelMetadata(
			normalizedName,
			normalizedPackageId,
			dataModelVersion
		);

		if (discoveredMeta) {
			result = this.loadDataModelFromMetadata(
				normalizedName,
				normalizedPackageId,
				discoveredMeta
			);
		}

		if (result) return result;

		// 4) Still not found - throw typed error with available versions
		const availableVersions = this.getAvailableVersionsFromCache(
			normalizedName,
			normalizedPackageId
		);

		throw new MissingDependencyError("data-model", {
			socName: name,
			packageId,
			requestedVersion: dataModelVersion,
			availableVersions
		});
	}

	/**
	 * Get a packageID for a given SoC.
	 * @param name - SoC name
	 * @returns First packageId associated with the SoC
	 */
	public async getFirstPackageIdForSoc(
		name: string
	): Promise<string | undefined> {
		// Always fetch fresh data
		await this.discoverDataModelPackages();

		const socEntry = this.dataModelIndexCache[name];
		if (socEntry) {
			const packageIds = Object.keys(socEntry);
			if (packageIds.length) {
				return packageIds[0];
			}
		}
		// No soc or packages
		return undefined;
	}

	/**
	 * List all installed data models.
	 * @returns Array of data model metadata objects
	 */
	public async listDataModels(): Promise<DataModelMetaData[]> {
		// Always fetch fresh data for listing, don't use cache
		await this.discoverDataModelPackages();

		// Extract all data models from the nested cache structure
		const allDataModels: DataModelMetaData[] = [];

		for (const socName in this.dataModelIndexCache) {
			for (const packageId in this.dataModelIndexCache[socName]) {
				for (const version in this.dataModelIndexCache[socName][
					packageId
				]) {
					allDataModels.push(
						this.dataModelIndexCache[socName][packageId][version]
					);
				}
			}
		}

		return allDataModels;
	}

	/**
	 * Discover packages of type "data model" from package manager and custom search paths
	 * @returns Promise that resolves when discovery is complete
	 */
	private async discoverDataModelPackages(): Promise<void> {
		const searchLocations: SearchLocation[] = [];

		// Get paths from package manager
		try {
			const installedPackages =
				(await this.pkgManager?.getInstalledPackageInfo({
					type: "data-model"
				})) ?? [];

			for (const pkg of installedPackages) {
				if (pkg.path) {
					searchLocations.push({
						packageRef: {
							name: pkg.name,
							version: pkg.version
						},
						path: pkg.path
					});
				}
			}
		} catch (error: unknown) {
			console.error(
				`Error while getting package list from package manager:`,
				error instanceof Error ? error.message : String(error)
			);
		}

		const customSearchPaths = this.getCustomSearchPaths();

		// Include all valid custom search paths provided by the user
		for (const packagePath of customSearchPaths) {
			if (existsSync(packagePath)) {
				searchLocations.push({
					path: packagePath
				});
			} else {
				console.error(
					`Provided search path "${packagePath}" does not exist or is not a valid directory, skipping.`
				);
			}
		}

		const newDataModelIndexCache: typeof this.dataModelIndexCache =
			{};

		for (const location of searchLocations) {
			const idxFilePath = path.join(
				location.path,
				DATA_MODEL_INDEX_FILENAME
			);

			if (existsSync(idxFilePath)) {
				try {
					const content = readFileSync(idxFilePath, "utf8");

					const dataModelIndex = JSON.parse(
						content
					) as DataModelIndex;

					// Process the .cfsdatamodels file and populate the new data model index cache
					for (const [socName, packages] of Object.entries(
						dataModelIndex
					)) {
						const normalizedSocName = socName.toLowerCase();

						if (!newDataModelIndexCache[normalizedSocName]) {
							newDataModelIndexCache[normalizedSocName] = {};
						}

						for (const [packageName, entry] of Object.entries(
							packages
						)) {
							const normalizedPackageName = packageName.toLowerCase();

							if (
								!newDataModelIndexCache[normalizedSocName][
									normalizedPackageName
								]
							) {
								newDataModelIndexCache[normalizedSocName][
									normalizedPackageName
								] = {};
							}

							newDataModelIndexCache[normalizedSocName][
								normalizedPackageName
							][entry.version] = {
								name: socName,
								version: entry.version,
								schema: entry.schema,
								package: packageName,
								timestamp: entry.timestamp,
								description: entry.description,
								path: entry.path,
								pkgPath: location.path,
								pkgName: location.packageRef?.name,
								traceInfo: entry.traceInfo ?? false
							};
						}
					}
				} catch (error: unknown) {
					console.error(
						`Error reading ${DATA_MODEL_INDEX_FILENAME} file at ${idxFilePath}:`,
						error instanceof Error ? error.message : String(error)
					);
				}
			} else {
				console.warn(
					`No ${DATA_MODEL_INDEX_FILENAME} file found in package path: ${location.path}`
				);
			}
		}

		// Replace the cache with the newly computed one
		this.dataModelIndexCache = newDataModelIndexCache;

		// Invalidate stale entries from the data model cache
		this.invalidateStaleDataModelCacheEntries();
	}

	/**
	 * Invalidate data model cache entries that no longer exist in the index cache
	 */
	private invalidateStaleDataModelCacheEntries(): void {
		for (const socName in this.dataModelCache) {
			for (const packageId in this.dataModelCache[socName]) {
				for (const version in this.dataModelCache[socName][
					packageId
				]) {
					// Check if this entry still exists in the index cache
					const existsInIndex =
						this.dataModelIndexCache[socName]?.[packageId]?.[
							version
						] !== undefined;

					if (!existsInIndex) {
						// Remove the stale cache entry
						Reflect.deleteProperty(
							this.dataModelCache[socName][packageId],
							version
						);

						// Clean up empty nested objects
						if (
							Object.keys(this.dataModelCache[socName][packageId])
								.length === 0
						) {
							Reflect.deleteProperty(
								this.dataModelCache[socName],
								packageId
							);
						}
						if (
							Object.keys(this.dataModelCache[socName]).length === 0
						) {
							Reflect.deleteProperty(this.dataModelCache, socName);
						}
					}
				}
			}
		}
	}

	/**
	 * Check if a data model exists in the index cache without loading the file.
	 * @param normalizedName - Normalized SoC name (lowercase)
	 * @param normalizedPackageId - Normalized package ID (lowercase)
	 * @param dataModelVersion - optional data model version or semver range
	 * @returns true if the data model exists in the index, false otherwise
	 */
	private dataModelExistsInIndex(
		normalizedName: string,
		normalizedPackageId: string,
		dataModelVersion?: string
	): boolean {
		return (
			this.resolveDataModelMetadata(
				normalizedName,
				normalizedPackageId,
				dataModelVersion
			) !== undefined
		);
	}

	private resolveDataModelMetadata(
		normalizedName: string,
		normalizedPackageId: string,
		dataModelVersion?: string
	): DataModelMetaData | undefined {
		const indexedSocForPackage =
			this.dataModelIndexCache[normalizedName]?.[normalizedPackageId];

		if (!indexedSocForPackage) return undefined;

		// Use semver matching (undefined treated as "*" which returns highest version)
		const versions = Object.keys(indexedSocForPackage);

		const versionToUse = findMatchingVersion(
			dataModelVersion ?? "*",
			versions
		);

		if (!versionToUse) {
			return undefined;
		}

		return indexedSocForPackage[versionToUse];
	}

	private loadDataModelFromMetadata(
		normalizedName: string,
		normalizedPackageId: string,
		metadata: DataModelMetaData
	): CfsSocDataModel | undefined {
		// Found matching data model in index - read and cache the file
		const dataModelFilePath = path.join(
			metadata.pkgPath,
			metadata.path
		);

		if (!existsSync(dataModelFilePath)) {
			return undefined;
		}

		const content = readFileSync(dataModelFilePath, "utf8");
		const parsed = JSON.parse(content) as CfsSocDataModel;

		// Cache the parsed data model using the nested structure
		if (!this.dataModelCache[normalizedName]) {
			this.dataModelCache[normalizedName] = {};
		}

		if (!this.dataModelCache[normalizedName][normalizedPackageId]) {
			this.dataModelCache[normalizedName][normalizedPackageId] = {};
		}

		this.dataModelCache[normalizedName][normalizedPackageId][
			metadata.version
		] = parsed;

		return parsed;
	}

	/**
	 * Get the search paths configured for this data model manager
	 * @returns Array of search paths
	 */
	public getCustomSearchPaths(): string[] {
		return typeof this.customSearchPaths === "function"
			? this.customSearchPaths()
			: this.customSearchPaths;
	}

	/**
	 * Find a cached data model by version or semver range.
	 * If versionOrRange is undefined, returns the latest version (uses "*" range).
	 * @param name - Normalized SoC name (lowercase)
	 * @param pkgId - Normalized package ID (lowercase)
	 * @param versionOrRange - Exact version, semver range (e.g., "^1.0.0", "~1.2.0"), or undefined for latest
	 * @returns The matching cached CfsSocDataModel or undefined if none found.
	 */
	private findCachedDataModelByVersionOrRange(
		name: string,
		pkgId: string,
		versionOrRange?: string
	): CfsSocDataModel | undefined {
		const cachedVersions = this.dataModelCache[name]?.[pkgId];

		if (!cachedVersions) return undefined;

		const availableVersions = Object.keys(cachedVersions);

		if (availableVersions.length === 0) return undefined;

		// Treat undefined as "*" (match any, returns highest)
		const range = versionOrRange ?? "*";

		const matchedVersion =
			findMatchingVersion(range, availableVersions) ?? "";

		return cachedVersions[matchedVersion];
	}

	/**
	 * Get available versions for a specific SoC and package from the already-populated cache.
	 * Used internally after cache has been refreshed.
	 * @param normalizedName - Normalized (lowercase) SoC name
	 * @param normalizedPackageId - Normalized (lowercase) package identifier
	 * @returns Array of available version strings
	 */
	private getAvailableVersionsFromCache(
		normalizedName: string,
		normalizedPackageId: string
	): string[] {
		const indexedSocForPackage =
			this.dataModelIndexCache[normalizedName]?.[normalizedPackageId];

		if (!indexedSocForPackage) return [];

		return Object.keys(indexedSocForPackage);
	}
}
