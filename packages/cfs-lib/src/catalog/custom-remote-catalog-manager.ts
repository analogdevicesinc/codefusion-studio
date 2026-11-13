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

import { zSWPackage, type SWPackage } from "cfs-ccm-lib";
import type {
	CfsPackage,
	CfsPackageManagerProvider,
	CfsPackageRemoteState
} from "cfs-package-manager";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/** The package manager calls the custom remote catalog needs. */
export type CustomRemoteIndexer = Pick<
	CfsPackageManagerProvider,
	"listRemoteStates" | "listRemoteRefs" | "getRemotePackageInfo"
>;

/** A remote that could not be listed or fetched. */
export interface CustomRemoteFailure {
	remote: string;
	error: unknown;
	/** Whether the remote rejected the credentials; set when listing it failed. */
	auth?: boolean;
}

/**
 * How many packages one package manager call fetches. Each call holds the
 * package manager lock while it runs.
 */
const FETCH_CHUNK_SIZE = 5;

/** Options for {@link CustomRemoteCatalogManager.apply}. */
export interface CustomRemoteApplyOptions {
	/** Stops fetching after the current chunk. */
	signal?: AbortSignal;
	/**
	 * Called when a remote starts and after each chunk, with how many of the
	 * remote's packages are done.
	 */
	onProgress?: (remote: string, done: number, total: number) => void;
}

/** What {@link CustomRemoteCatalogManager.apply} did. */
export interface CustomRemoteApplyResult {
	/** Remotes with packages that could not be fetched, with the first error. */
	failures: CustomRemoteFailure[];
	/** Remotes whose packages were not all fetched because of a cancel. */
	cancelled: string[];
}

/** What {@link CustomRemoteCatalogManager.check} found. */
export interface CustomRemoteChanges {
	/** Whether the index needs to be written. */
	changed: boolean;
	/** Indexed packages that are still current. */
	kept: SWPackage[];
	/** New or changed references to fetch, per remote. */
	fetch: Map<CfsPackageRemoteState, string[]>;
	/** Remotes that could not be listed. */
	failures: CustomRemoteFailure[];
}

/**
 * The packages of custom remotes, indexed from Conan into a JSON file.
 * Packages of a disabled or unreachable remote are kept; those of a removed
 * remote, or of one that rejects authentication, are dropped.
 */
export class CustomRemoteCatalogManager {
	readonly #file: string;

	/**
	 * @param catalogStoreDir - the catalog store directory, which holds `custom-remotes.json`
	 * @param indexer - the package manager that lists and inspects the remotes
	 */
	constructor(
		catalogStoreDir: string,
		private readonly indexer: CustomRemoteIndexer
	) {
		this.#file = path.join(catalogStoreDir, "custom-remotes.json");
	}

	/**
	 * Every indexed package; empty when nothing has been indexed or the
	 * file is unreadable or invalid, so the next update rebuilds it.
	 * @returns the packages
	 */
	async getPackages(): Promise<SWPackage[]> {
		try {
			const packages: unknown = JSON.parse(
				await fs.readFile(this.#file, "utf8")
			);
			return Array.isArray(packages) &&
				packages.every((pkg) => zSWPackage.safeParse(pkg).success)
				? packages
				: [];
		} catch {
			return [];
		}
	}

	/**
	 * Compares the index with the remotes without downloading recipes.
	 * @returns the changes
	 */
	async check(): Promise<CustomRemoteChanges> {
		const remotes = (await this.indexer.listRemoteStates()).filter(
			(remote) => remote.custom
		);
		const enabled = remotes
			.filter((remote) => !remote.disabled)
			.map((remote) => remote.name);
		const listed =
			enabled.length > 0
				? await this.indexer.listRemoteRefs(enabled)
				: {};
		const indexed = await this.getPackages();

		const kept: SWPackage[] = [];
		const fetch = new Map<CfsPackageRemoteState, string[]>();
		const failures: CustomRemoteFailure[] = [];
		for (const remote of remotes) {
			const own = indexed.filter(
				(pkg) => pkg.repo.id === remote.name
			);
			const refs = listed[remote.name];
			if (!Array.isArray(refs)) {
				// Without access its packages cannot be installed, so they go.
				if (!refs?.auth) {
					kept.push(...own);
				}
				if (refs) {
					failures.push({
						remote: remote.name,
						error: refs.error,
						auth: refs.auth
					});
				}
				continue;
			}
			const current = new Set(refs);
			// Entries stored under an older URL of the remote are fetched again.
			const sameUrl = own.filter(
				(pkg) => pkg.repo.repoUrl === remote.url.toString()
			);
			// Recipes are immutable, so an indexed version that is still
			// listed is current and is never fetched again.
			const known = new Set(sameUrl.map((pkg) => toRef(remote, pkg)));
			kept.push(
				...sameUrl.filter((pkg) => current.has(toRef(remote, pkg)))
			);
			const missing = refs.filter((ref) => !known.has(ref));
			if (missing.length > 0) {
				fetch.set(remote, missing);
			}
		}

		const dropped = indexed.length - kept.length;
		return {
			changed: fetch.size > 0 || dropped > 0,
			kept,
			fetch,
			failures
		};
	}

	/**
	 * Fetches the new packages and stores the result. Packages that cannot be
	 * fetched are skipped and retried next time. They are fetched a few at a
	 * time, each its own package manager call, so other calls are not held up
	 * for the whole run and a cancel takes effect between chunks. Packages
	 * fetched before a cancel are stored too, so the next run resumes.
	 * @param changes - what {@link check} found
	 * @param options - cancellation and progress reporting
	 * @returns the failed and the cancelled remotes
	 */
	async apply(
		changes: CustomRemoteChanges,
		{ signal, onProgress }: CustomRemoteApplyOptions = {}
	): Promise<CustomRemoteApplyResult> {
		const fetched: SWPackage[] = [];
		const failures: CustomRemoteFailure[] = [];
		const cancelled: string[] = [];
		for (const [remote, refs] of changes.fetch) {
			const errors: unknown[] = [];
			let done = 0;
			if (!signal?.aborted) {
				onProgress?.(remote.name, 0, refs.length);
			}
			while (done < refs.length && !signal?.aborted) {
				const chunk = refs.slice(done, done + FETCH_CHUNK_SIZE);
				const result = await this.#fetchPackages(remote.name, chunk);
				for (const [ref, info] of Object.entries(result.infos)) {
					fetched.push(toSWPackage(remote, ref, info));
				}
				errors.push(...result.errors);
				done += chunk.length;
				onProgress?.(remote.name, done, refs.length);
			}
			if (done < refs.length) {
				cancelled.push(remote.name);
			}
			if (errors.length > 0) {
				failures.push({ remote: remote.name, error: errors[0] });
			}
		}
		// Written to this process's own temp file and renamed, so readers never
		// see a partial file and two windows never write the same temp file.
		const temp = `${this.#file}.${process.pid}.tmp`;
		await fs.mkdir(path.dirname(this.#file), { recursive: true });
		await fs.writeFile(
			temp,
			JSON.stringify([...changes.kept, ...fetched])
		);
		await fs.rename(temp, this.#file);
		return { failures, cancelled };
	}

	/**
	 * Fetches all references in one go; if that fails, one by one, so a
	 * single broken recipe does not block the rest of the remote.
	 * @param remote - the remote name
	 * @param refs - the references to fetch
	 * @returns the fetched packages and the errors of those that failed
	 */
	async #fetchPackages(
		remote: string,
		refs: string[]
	): Promise<{
		infos: Record<string, CfsPackage>;
		errors: unknown[];
	}> {
		try {
			return {
				infos: await this.indexer.getRemotePackageInfo(remote, refs),
				errors: []
			};
		} catch {
			const infos: Record<string, CfsPackage> = {};
			const errors: unknown[] = [];
			for (const ref of refs) {
				try {
					Object.assign(
						infos,
						await this.indexer.getRemotePackageInfo(remote, [ref])
					);
				} catch (error) {
					errors.push(error);
				}
			}
			return { infos, errors };
		}
	}
}

const toId = (remote: CfsPackageRemoteState, ref: string): string =>
	`${remote.name}:${ref}`;

/**
 * The `name/version` an indexed package of a remote was stored under.
 * Indexes written before versions were listed without revisions have a
 * `#revision` suffix, which is dropped.
 * @param remote - the remote the package comes from
 * @param pkg - the indexed package
 * @returns the reference
 */
const toRef = (
	remote: CfsPackageRemoteState,
	pkg: SWPackage
): string => pkg.id.slice(remote.name.length + 1).split("#")[0];

/**
 * Converts Conan package metadata into a catalog package of that remote.
 * @param remote - the remote the package comes from
 * @param ref - the `name/version` reference
 * @param info - the package metadata
 * @returns the catalog package
 */
export function toSWPackage(
	remote: CfsPackageRemoteState,
	ref: string,
	info: CfsPackage
): SWPackage {
	return {
		id: toId(remote, ref),
		name: info.reference.name,
		version: info.reference.version,
		license: info.license ?? "",
		description: info.description || undefined,
		type: info.type,
		// A plain version is also a valid (exact) semver range.
		cfsVersionConstraint: info.cfsVersion || undefined,
		compatibleHardware: info.soc ? { soc: info.soc } : undefined,
		repo: {
			id: remote.name,
			repoName: remote.name,
			repoUrl: remote.url.toString(),
			packageFormat: "conan",
			// Not known for custom remotes; nothing relies on it
			authRequired: false,
			disabledByDefault: false
		}
	};
}
