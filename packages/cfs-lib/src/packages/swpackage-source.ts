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

import type { SWPackage } from "cfs-ccm-lib";

import {
	SWPackageCatalogManager,
	type SWPackageCatalogManagerOptions
} from "../catalog/swpackage-catalog-manager.js";

/** A provider of software packages with a session-bound lifecycle. */
export interface SWPackageSource {
	/**
	 * Every package version visible to the current session.
	 * @returns the packages; callers must not mutate them
	 */
	getAll(): Promise<SWPackage[]>;
	/**
	 * Reloads the packages, for example after the user logs in.
	 * @returns a promise that resolves once the packages are current
	 */
	refresh(): Promise<void>;
	/**
	 * Drops every package, for example when the user logs out.
	 * @returns a promise that resolves once nothing is left
	 */
	purge(): Promise<void>;
	/**
	 * Releases the underlying store.
	 * @returns a promise that resolves once resources are released
	 */
	dispose(): Promise<void>;
}

/** Options for creating a software package source. */
export type SWPackageSourceOptions = SWPackageCatalogManagerOptions;

/**
 * Creates the software package source used by the Package Manager.
 * @param options - where the catalog lives and how it reaches the server
 * @returns the source, ready to serve packages
 */
export async function createSWPackageSource(
	options: SWPackageSourceOptions
): Promise<SWPackageSource> {
	return createCatalogSWPackageSource(options);
}

/**
 * A source backed by the on-disk software package catalog, refreshed
 * from the CCM API through {@link SWPackageCatalogManager}.
 * @param options - where the catalog lives and how it reaches the server
 * @returns the source once the catalog has been loaded
 */
export async function createCatalogSWPackageSource(
	options: SWPackageSourceOptions
): Promise<SWPackageSource> {
	const manager = new SWPackageCatalogManager(options);
	try {
		await manager.loadCatalog();
	} catch (error) {
		// Dispose so the store's temp folder is removed.
		await manager.dispose().catch(() => undefined);
		throw error;
	}
	return {
		getAll: async () =>
			(await manager.swPackageCatalog.getAll()) as SWPackage[],
		refresh: () => manager.loadCatalog(),
		purge: () => manager.purgeCatalog(),
		dispose: () => manager.dispose()
	};
}
