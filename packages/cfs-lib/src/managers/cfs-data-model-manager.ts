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
import { CfsSocDataModel } from "cfs-plugins-api";
import { findLatestVersion } from "../utils/semantic-versioning.js";

const DATA_MODEL_INDEX_FILENAME = ".cfsdatamodels";

interface DataModelIndexEntry {
	version: string;
	schema: string;
	timestamp: string;
	description: string;
	path: string;
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
}

interface SearchLocation {
	packageRef?: CfsPackageReference;
	path: string;
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
	 * Get a data model by name, packageId, and optional dataModelVersion.
	 * @param name - SoC name
	 * @param packageId - Package identifier
	 * @param dataModelVersion - optional data model version (latest if undefined)
	 * @returns Parsed data model object
	 */
	public async getDataModel(
		name: string,
		packageId: string,
		dataModelVersion?: string
	): Promise<CfsSocDataModel | undefined> {
		const normalizedName = name.toLowerCase();
		const normalizedPackageId = packageId.toLowerCase();

		let result: CfsSocDataModel | undefined;

		// 1) Check cache for either specific or latest version
		if (dataModelVersion) {
			result =
				this.dataModelCache[normalizedName]?.[normalizedPackageId]?.[
					dataModelVersion
				];
		} else {
			result = this.findLatestCachedDataModel(
				normalizedName,
				normalizedPackageId
			);
		}

		if (result) return result;

		// 2) Not found in cache, look in index and parse if found
		result = this.findDataModelInCachedIndex(
			normalizedName,
			normalizedPackageId,
			dataModelVersion
		);

		if (result) return result;

		// 3) If no matching data model is found in the cached index, refresh the index cache
		// with the latest data from package manager and custom search paths
		await this.discoverDataModelPackages();

		result = this.findDataModelInCachedIndex(
			normalizedName,
			normalizedPackageId,
			dataModelVersion
		);

		return result;
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
				for (const schemaVersion in this.dataModelIndexCache[socName][
					packageId
				]) {
					allDataModels.push(
						this.dataModelIndexCache[socName][packageId][
							schemaVersion
						]
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
							][entry.schema] = {
								name: socName,
								version: entry.version,
								schema: entry.schema,
								package: packageName,
								timestamp: entry.timestamp,
								description: entry.description,
								path: entry.path,
								pkgPath: location.path,
								pkgName: location.packageRef?.name
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
				for (const schemaVersion in this.dataModelCache[socName][
					packageId
				]) {
					// Check if this entry still exists in the index cache
					const existsInIndex =
						this.dataModelIndexCache[socName]?.[packageId]?.[
							schemaVersion
						] !== undefined;

					if (!existsInIndex) {
						// Remove the stale cache entry
						Reflect.deleteProperty(
							this.dataModelCache[socName][packageId],
							schemaVersion
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

	private findDataModelInCachedIndex(
		normalizedName: string,
		normalizedPackageId: string,
		dataModelVersion?: string
	): CfsSocDataModel | undefined {
		const indexedSocForPackage =
			this.dataModelIndexCache[normalizedName]?.[normalizedPackageId];

		if (!indexedSocForPackage) return undefined;

		let versionToUse = dataModelVersion;

		if (!versionToUse) {
			const versions = Object.keys(indexedSocForPackage);

			if (versions.length === 0) return undefined;

			if (versions.length === 1) {
				versionToUse = versions[0];
			} else {
				versionToUse = findLatestVersion(versions);
			}
		}

		const dmMetaData = indexedSocForPackage[versionToUse];

		if (dmMetaData === undefined) {
			return undefined;
		}

		// Found matching data model in index - read and cache the file
		const dataModelFilePath = path.join(
			dmMetaData.pkgPath,
			dmMetaData.path
		);

		if (existsSync(dataModelFilePath)) {
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
				versionToUse
			] = parsed;

			return parsed;
		}

		return undefined;
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
	 * Find the latest cached data model for a given SoC name and package ID.
	 * If only one version exists, returns it directly.
	 * If multiple versions exist, returns the one with the highest semantic version.
	 * @param name - Normalized SoC name (lowercase)
	 * @param pkgId - Normalized package ID (lowercase)
	 * @returns The latest cached CfsSocDataModel or undefined if none found.
	 */
	private findLatestCachedDataModel(
		name: string,
		pkgId: string
	): CfsSocDataModel | undefined {
		const versions = Object.keys(
			this.dataModelCache[name]?.[pkgId] || {}
		);

		if (versions.length === 0) return undefined;

		if (versions.length === 1)
			return this.dataModelCache[name][pkgId][versions[0]];

		const latestVersion = findLatestVersion(versions);

		return this.dataModelCache[name][pkgId][latestVersion];
	}
}
