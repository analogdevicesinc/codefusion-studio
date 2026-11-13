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
	CfsApiClient,
	CatalogError,
	DataStoreError,
	SWPackageCatalog
} from "cfs-ccm-lib";

import * as fs from "node:fs";

/** Options for the software package catalog manager. */
export interface SWPackageCatalogManagerOptions {
	/** The directory where the catalog store is located. It can be shared with the SoC catalog. */
	catalogStoreDir: string;
	/** Path to a zip file with a backup copy of the catalog. */
	catalogBackupZipFile?: string;
	/** API client to use; the catalog works offline if not provided. */
	apiClient?: CfsApiClient;
	/**
	 * CFS version sent to the server when refreshing, so it returns only
	 * compatible packages. Defaults to the `cfs-ccm-lib` version; `*`
	 * requests every package.
	 */
	cfsVersion?: string;
}

/**
 * Manages the software package catalog: the local copy of every package
 * the signed-in user may install. The catalog is per session, so it is
 * expected to be purged on logout and refreshed on login.
 */
export class SWPackageCatalogManager {
	private readonly apiClient: CfsApiClient | undefined;
	private readonly cfsVersion: string | undefined;
	readonly catalogStoreDir: string;
	readonly catalogBackupZipFile: string | undefined;
	#swPackageCatalog: SWPackageCatalog;

	/**
	 * Creates the manager and its catalog. The store directory is created
	 * if it does not exist.
	 * @param options - where the catalog lives and how it reaches the server
	 */
	constructor(options: SWPackageCatalogManagerOptions) {
		this.catalogStoreDir = options.catalogStoreDir;
		this.catalogBackupZipFile = options.catalogBackupZipFile;
		this.apiClient = options.apiClient;
		this.cfsVersion = options.cfsVersion;

		fs.mkdirSync(this.catalogStoreDir, {
			recursive: true
		});

		this.#swPackageCatalog = this.createCatalog();
	}

	/** The managed software package catalog. */
	get swPackageCatalog(): SWPackageCatalog {
		return this.#swPackageCatalog;
	}

	/**
	 * Loads the catalog: validates its contents, refreshes it from the
	 * server when online, and imports the backup zip when it is still
	 * empty afterwards (fails if no backup is configured).
	 * @returns A promise that resolves when the catalog is loaded.
	 * @throws an error if the catalog cannot be loaded.
	 */
	async loadCatalog(): Promise<void> {
		await this.validateCatalog();
		await this.refreshCatalog();
		if (await this.#swPackageCatalog.isEmpty()) {
			await this.importBackupCatalog();
		}
	}

	/**
	 * Throws away the catalog contents, for example on logout.
	 * @returns A promise that resolves when the catalog is empty.
	 */
	async purgeCatalog(): Promise<void> {
		await this.#swPackageCatalog.purge();
	}

	/**
	 * Disposes of the manager and its catalog.
	 * @returns A promise that resolves when the resources are disposed.
	 */
	async dispose(): Promise<void> {
		await this.#swPackageCatalog.dispose();
	}

	private createCatalog(): SWPackageCatalog {
		return new SWPackageCatalog(
			{ directory: this.catalogStoreDir },
			this.apiClient,
			this.cfsVersion
		);
	}

	/**
	 * Refreshes the catalog from the server if the client is online.
	 * Network errors are ignored (the machine may be offline) unless the
	 * server refused the request as unauthorized.
	 * @returns A promise that resolves when the catalog is refreshed.
	 * @throws {Error} If a non-network error occurs during the refresh.
	 */
	private async refreshCatalog(): Promise<void> {
		try {
			await this.#swPackageCatalog.refresh();
		} catch (err) {
			if (err instanceof CatalogError) {
				if (
					err.type !== "SERVICE_ERROR" ||
					(err.cause instanceof Error &&
						err.cause.message.includes("Unauthorized"))
				) {
					throw err;
				}
			}
		}
	}

	/**
	 * Validates the existing contents. Invalid contents are purged, and an
	 * unusable store is destroyed and recreated, so the catalog can be
	 * reloaded from the server or the backup.
	 * @returns A promise that resolves when the catalog is valid (may be empty).
	 * @throws {Error} If the catalog is invalid and could not be purged or recreated.
	 */
	private async validateCatalog(): Promise<void> {
		try {
			await this.#swPackageCatalog.validate();
		} catch (err) {
			if (err instanceof CatalogError) {
				if (err.type === "INVALID_CONTENTS") {
					await this.#swPackageCatalog.purge();
					return;
				} else if (
					err.type === "PERSISTENCE_ERROR" &&
					err.cause instanceof DataStoreError &&
					err.cause.type === "INVALID_DATA"
				) {
					await this.#swPackageCatalog.destroy();
					this.#swPackageCatalog = this.createCatalog();
					return;
				}
			}
			throw err;
		}
	}

	/**
	 * Imports the catalog from the backup zip file.
	 * @returns A promise that resolves when the catalog is imported.
	 * @throws {Error} If no backup is configured or it cannot be imported.
	 */
	private async importBackupCatalog(): Promise<void> {
		try {
			if (!this.catalogBackupZipFile) {
				throw new Error(
					"SWPackageCatalogManager: No catalog backup configured, cannot import catalog"
				);
			}
			await this.#swPackageCatalog.import(this.catalogBackupZipFile);
		} catch (err) {
			throw new Error(
				`Unexpected error during catalog import: ${err instanceof Error ? err.message : String(err)}`
			);
		}
	}
}
