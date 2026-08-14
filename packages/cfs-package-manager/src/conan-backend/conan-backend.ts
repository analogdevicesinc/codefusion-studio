/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import { ExecFileOptions } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import semver from "semver";
import { withLock } from "@ster5/global-mutex";

import type {
	CfsPackage,
	CfsCachedPackage,
	CfsInstalledPackage,
	CfsPackageManagerProvider,
	CfsPackageLicenseReporter,
	CfsPackageReference,
	CfsPackageRemote,
	CfsPackageInstallOptions,
	CfsPackageDependenciesOptions,
	CfsPackageRemotesProvider,
	CfsInstallInput,
	CfsInstallPlan,
	CfsPackageFilter,
	CfsPackageComponent
} from "../api/api.js";
import PackmanUtils from "../utils/utils.js";
import { ConanRunner, ConanError } from "./conan-runner.js";
import { ConanRemoteManager } from "./conan-remote.js";

interface PackageIndexEntry {
	full_ref: string;
	path: string;
	requires: string[];
	description: string;
	license: string;
	cfsVersion: string;
	soc?: string[];
	type: string;
	components?: CfsPackageComponent[];
}

type PackageIndex = Record<string, PackageIndexEntry | undefined>;

// Variables to default location of package manager cache and index on APPDATA
const pkgMgrAppDataPath = PackmanUtils.getPkgMgrAppDataPath();
const defaultIndexDir = pkgMgrAppDataPath;
const defaultConanHomePath = path.join(pkgMgrAppDataPath, "conan");
const currentFileFullPath = fileURLToPath(import.meta.url);
const defaultConanConfigPath = path.join(
	path.dirname(currentFileFullPath),
	"config"
);

export class ConanPkgManager implements CfsPackageManagerProvider {
	// Path to conan custom configuration files, to be copied during initialization.
	// These files are provided next to this file for the moment.
	private readonly _conanConfigPath;

	// Location of the .cfsPackages file which keeps track of the installed packages
	private readonly _indexDir: string;

	// Location of the conan local cache and configuration
	private readonly _conanHomePath: string;

	// Initialization state flag for remotes
	private _remotesReady = false;

	// Optional remote provider
	private remotesProvider?: CfsPackageRemotesProvider;

	// Optional reporter used to send license acceptance to cloud backends
	private licenseReporter?: CfsPackageLicenseReporter;

	// Executes conan commands
	private readonly _conanRun: ConanRunner;

	// Manages conan remotes
	private remoteMgr: ConanRemoteManager;

	constructor({
		conanHome = defaultConanHomePath,
		indexDir = defaultIndexDir,
		cfsInstallDir = PackmanUtils.getCFSInstallPath(),
		conanConfigPath = defaultConanConfigPath
	} = {}) {
		this._indexDir = indexDir;
		this._conanHomePath = conanHome;
		this._conanConfigPath = conanConfigPath;
		this._conanRun = new ConanRunner(conanHome, cfsInstallDir);
		this.remoteMgr = new ConanRemoteManager(
			this._conanRun,
			this._conanHomePath
		);

		// Lockfile to prevent concurrent executions
		const lockFilePath = path.join(
			this._conanHomePath,
			".packman.lock"
		);

		// Functions to exclude from locking
		// These references are used instead of method names to avoid
		// issues with minification or bundling renaming them
		/* eslint-disable @typescript-eslint/unbound-method */
		const lockExemptMethods = new WeakSet([
			ConanPkgManager.prototype.getIndexFilePath as object
		]);
		/* eslint-enable @typescript-eslint/unbound-method */

		// Returns a proxy which wraps (non-exempt) instance methods defined on ConanPkgManager.prototype
		// in a lock to prevent concurrent executions across processes.
		// Note: wrapped methods always return a promise
		return new Proxy(this, {
			get(target: ConanPkgManager, prop: string | symbol): unknown {
				const member = Reflect.get(target, prop) as unknown;

				// Only wrap functions in the lock,
				// return other properties directly
				if (typeof member !== "function" || prop === "constructor") {
					return member;
				}

				const method = member as (
					this: ConanPkgManager,
					...fnArgs: unknown[]
				) => unknown;

				// Check if the method is exempt from locking
				if (
					// Only lock methods defined in ConanPkgManager, not inherited ones
					typeof prop !== "string" ||
					!Object.prototype.hasOwnProperty.call(
						ConanPkgManager.prototype,
						prop
					) ||
					lockExemptMethods.has(method as object)
				) {
					return (...args: unknown[]) => {
						// Calls the method as usual with the correct 'this' context and the provided arguments
						return method.call(target, ...args);
					};
				}

				return async (...args: unknown[]) => {
					// The lockfile directory must exist
					await fs.promises.mkdir(path.dirname(lockFilePath), {
						recursive: true
					});
					return await withLock(
						{ fileToLock: lockFilePath },
						async () => {
							// Calls the method once the lock is obtained,
							// with the correct 'this' context and the provided arguments
							return await method.call(target, ...args);
						}
					);
				};
			}
		});
	}

	private static _packageFilter(
		pkg: Omit<CfsPackage, "reference">,
		filter: CfsPackageFilter
	): boolean {
		if (filter.type) {
			const filterTypes = Array.isArray(filter.type)
				? filter.type
				: [filter.type];
			if (!pkg.type || !filterTypes.includes(pkg.type)) {
				return false;
			}
		}
		if (filter.soc) {
			const filterSocs = Array.isArray(filter.soc)
				? filter.soc
				: [filter.soc];
			if (!pkg.soc || !filterSocs.some((s) => pkg.soc?.includes(s))) {
				return false;
			}
		}
		if (filter.cfsVersion && pkg.cfsVersion !== filter.cfsVersion) {
			return false;
		}
		if (filter.component) {
			if (!pkg.components) {
				return false;
			}

			if (
				!pkg.components.some((pkgComponent) => {
					if (
						filter.component?.name &&
						pkgComponent.name !== filter.component.name
					) {
						return false;
					}
					if (
						filter.component?.version &&
						pkgComponent.version !== filter.component.version
					) {
						if (!semver.validRange(filter.component.version)) {
							throw new Error(
								`Invalid semver version in filter component: ${filter.component.version}`
							);
						}
						if (
							!semver.satisfies(
								pkgComponent.version,
								filter.component.version
							)
						) {
							return false;
						}
					}
					if (
						filter.component?.type &&
						pkgComponent.type !== filter.component.type
					) {
						return false;
					}
					return true;
				})
			) {
				return false;
			}
		}
		return true;
	}

	private _refToString(ref: CfsPackageReference): string {
		return `${ref.name}/${ref.version}`;
	}

	private _parsePackageReferences(
		refStr: string
	): CfsPackageReference[] {
		return refStr
			.split("\n")
			.filter(Boolean)
			.map((x) => {
				const [name, v] = x.split("/");
				let version = v;

				// Remove bracket notation from version if present (e.g., "[1.0]" -> "1.0")
				if (version.startsWith("[") && version.endsWith("]")) {
					version = version.slice(1, -1);
				}

				// Also handle revision suffix (e.g., "1.0#abc123" -> "1.0")
				const hashIndex = version.indexOf("#");
				if (hashIndex !== -1) {
					version = version.substring(0, hashIndex);
				}

				return { name: name, version: version };
			});
	}

	// Executes a conan command with error handling and retries
	private async _conanCommand(
		args: string[],
		options: Omit<ExecFileOptions, "shell"> = { cwd: this._indexDir },
		maxTries = 2
	): Promise<string> {
		for (let retry = 1; retry <= maxTries; retry++) {
			try {
				const result = await this._conanRun.execute(args, options);
				return result;
			} catch (error) {
				if (retry == maxTries) throw error;
				if (error instanceof ConanError) {
					if (error.code == "AUTH_ERROR") {
						// Re-configure/authenticate the remotes
						await this.remoteMgr.applyRemotesConfig({
							refreshCredentials: true,
							remoteNames: error.remotes
						});

						// retry the command
						continue;
					}
				}
				throw error; // rethrow error if we cannot handle it
			}
		}

		// Unreachable
		throw new Error("Unexpected error");
	}

	private async _readPkgIndex(): Promise<PackageIndex> {
		try {
			const indexPath = path.join(this._indexDir, ".cfsPackages");
			const indexString = await fs.promises.readFile(
				indexPath,
				"utf-8"
			);
			return JSON.parse(indexString) as PackageIndex;
		} catch {
			return {};
		}
	}

	async init(options?: { initRemotes?: boolean }): Promise<void> {
		const { initRemotes = false } = options ?? {};

		// Configure conan with CFS custom configuration
		await fs.promises.cp(this._conanConfigPath, this._conanHomePath, {
			recursive: true
		});

		// Generate default conan profile (if not done already)
		const defaultProfilePath = path.join(
			this._conanHomePath,
			"profiles",
			"default"
		);

		try {
			await fs.promises.access(defaultProfilePath, fs.constants.R_OK);
			// A default profile exist, no need to do anything else
		} catch (error) {
			// No default profile. Create a minimal one manually rather than invoking
			// 'conan profile detect', because that fails if it encounters a C/C++
			// toolchain version that Conan is not aware of yet. We don't actually
			// need to declare a compiler, as we're not using Conan as a C/C++ package
			// manager.

			// Map node.js's OS and architecture names to Conan's.
			const osMap: Record<string, string> = {
				linux: "Linux",
				win32: "Windows",
				darwin: "Macos"
			};
			const archMap: Record<string, string> = {
				x64: "x86_64",
				arm64: "armv8"
			};
			const conanOs = osMap[os.platform()];
			const conanArch = archMap[os.arch()];
			if (!conanOs || !conanArch) {
				throw new Error(
					`Unsupported platform: ${os.platform()}-${os.arch()}`
				);
			}

			const profile =
				`[settings]\n` +
				`os=${conanOs}\n` +
				`arch=${conanArch}\n` +
				`build_type=Release\n`;

			try {
				await fs.promises.mkdir(path.dirname(defaultProfilePath), {
					recursive: true
				});
				await fs.promises.writeFile(defaultProfilePath, profile);
			} catch (err) {
				throw new Error("Failed to create Conan profile", {
					cause: err
				});
			}
		}

		if (initRemotes) {
			this._remotesReady = false;
			await this._ensureRemotesReady();
		}
	}

	/**
	 * Ensures remotes are configured and authenticated.
	 * This is required for operations that access remote repositories.
	 */
	private async _ensureRemotesReady({
		applyConfig = true
	}: { applyConfig?: boolean } = {}): Promise<void> {
		if (this._remotesReady) return;

		// Ensure remotes are initialized before running any conan command
		await this.remoteMgr.init();

		// Ensure remotes config is up to date
		if (applyConfig) {
			await this.remoteMgr.applyRemotesConfig();
		}

		this._remotesReady = true;
	}

	async list(
		pattern?: string,
		filter: CfsPackageFilter = {}
	): Promise<CfsPackageReference[]> {
		const pkgIndex = await this._readPkgIndex();

		const packages: CfsPackageReference[] = [];

		if (pattern === undefined) {
			pattern = "*";
		}

		const regxPattern = new RegExp(
			"^" + pattern.replace(/\*/g, ".+") + "$"
		);

		for (const pkgName in pkgIndex) {
			if (!regxPattern.test(pkgName)) {
				continue;
			}
			const pkg = pkgIndex[pkgName];

			if (pkg === undefined) {
				continue;
			}

			if (!ConanPkgManager._packageFilter(pkg, filter)) {
				continue;
			}

			const fullVersion = pkg.full_ref.split("/")[1];
			const version = fullVersion.split("#")[0];

			packages.push({ name: pkgName, version: version });
		}

		return packages;
	}

	async listCache(pattern?: string): Promise<CfsCachedPackage[]> {
		if (pattern === undefined) {
			pattern = "*";
		}

		// Get cached packages from conan
		const out = await this._conanCommand([
			"cfs",
			"list-cache",
			pattern
		]);

		// Parse and normalize cached package references
		const cachedReferences = this._parsePackageReferences(out);

		// Get installed packages to determine installation status
		const installedPackages = await this.list();
		const installedSet = new Set(
			installedPackages.map((pkg) => `${pkg.name}/${pkg.version}`)
		);

		return cachedReferences.map((reference) => {
			const pkgRef = `${reference.name}/${reference.version}`;
			return {
				reference,
				isInstalled: installedSet.has(pkgRef)
			};
		});
	}

	async search(pattern: string): Promise<CfsPackageReference[]> {
		await this._ensureRemotesReady();

		const out = await this._conanCommand(["cfs", "search", pattern]);

		return this._parsePackageReferences(out);
	}

	async searchInfo(
		pattern: string,
		filter: CfsPackageFilter = {}
	): Promise<CfsPackage[]> {
		await this._ensureRemotesReady();

		const out = await this._conanCommand([
			"cfs",
			"search-info",
			pattern
		]);
		const pkgs = JSON.parse(out) as Record<string, CfsPackage>;

		const filteredPkgs = Object.values(pkgs).filter((info) =>
			ConanPkgManager._packageFilter(info, filter)
		);

		return filteredPkgs;
	}

	public getIndexFilePath(): string {
		return path.join(this._indexDir, ".cfsPackages");
	}

	async getInstalledPackageInfo(
		filter: CfsPackageFilter = {}
	): Promise<CfsInstalledPackage[]> {
		const pkgIndex = await this._readPkgIndex();
		const packages: CfsInstalledPackage[] = [];

		for (const pkgName in pkgIndex) {
			const pkgEntry = pkgIndex[pkgName];

			if (pkgEntry === undefined) {
				continue;
			}

			if (!ConanPkgManager._packageFilter(pkgEntry, filter)) {
				continue;
			}

			const fullVersion = pkgEntry.full_ref.split("/")[1];
			const version = fullVersion.split("#")[0];
			const cfsSoc = pkgEntry.soc
				? PackmanUtils.formatCfsSocAttribute(pkgEntry.soc)
				: [];

			packages.push({
				name: pkgName,
				version,
				path: pkgEntry.path,
				cfsSoc,
				components: pkgEntry.components,
				...(pkgEntry.type ? { type: pkgEntry.type } : {})
			});
		}

		return packages;
	}

	async getPackageInfo(
		reference: CfsPackageReference
	): Promise<CfsPackage>;
	async getPackageInfo(
		references: CfsPackageReference[]
	): Promise<CfsPackage[]>;
	async getPackageInfo(
		reference: CfsPackageReference | CfsPackageReference[]
	): Promise<CfsPackage | CfsPackage[]> {
		const isBatch = Array.isArray(reference);
		const references = isBatch ? reference : [reference];

		if (references.length === 0) {
			return [];
		}

		await this._ensureRemotesReady();

		const out = await this._conanCommand([
			"cfs",
			"get-pkg-info",
			...references.map((ref) => this._refToString(ref))
		]);
		const parsed = JSON.parse(out) as CfsPackage[];
		return isBatch ? parsed : parsed[0];
	}

	async install(
		references:
			| CfsPackageReference
			| CfsPackageReference[]
			| CfsInstallPlan,
		options?: CfsPackageInstallOptions
	): Promise<CfsPackageReference[]> {
		const commandOptions: string[] = [];

		if (options?.localOnly == true) {
			commandOptions.push("--no-remote");
		} else {
			await this._ensureRemotesReady();
		}

		if (options?.acceptLicense == true) {
			commandOptions.push("--accept-license");
		}

		// Normalize: extract refs and pre-fetched license info when a plan is passed
		const plan =
			!Array.isArray(references) && "toInstall" in references
				? references
				: undefined;
		const refsArray: CfsPackageReference[] = plan
			? plan.toInstall
			: Array.isArray(references)
				? references
				: [references as CfsPackageReference];
		const refsRequiringLicenseAcceptanceFromPlan:
			| CfsPackageReference[]
			| undefined = plan?.requiresLicenseAcceptance.map(
			(pkg) => pkg.reference
		);

		if (refsArray.length === 0) {
			return [];
		}

		// Only compute the install plan if we need to report license acceptance.
		// The plan doesn't change which references are installed (we don't have transitive
		// dependency filtering, and pre-installed refs are no-ops), so it's only needed to
		// identify which packages require license acceptance for reporting purposes.
		if (
			options?.acceptLicense === true &&
			this.licenseReporter !== undefined
		) {
			const refsRequiringLicenseAcceptance =
				refsRequiringLicenseAcceptanceFromPlan ??
				(
					await this.getInstallPlan(refsArray)
				).requiresLicenseAcceptance.map((pkg) => pkg.reference);
			await this._reportAcceptedLicensesIfNeeded(
				refsRequiringLicenseAcceptance,
				refsArray
			);
		}

		// Convert references to strings
		const refStrings = refsArray.map((ref) => this._refToString(ref));

		const out = await this._conanCommand([
			"cfs",
			"install",
			...refStrings,
			...commandOptions
		]);

		return this._parsePackageReferences(out);
	}

	async uninstall(pkgName: string): Promise<void> {
		await this._conanCommand(["cfs", "uninstall", pkgName]);
	}

	async delete(pattern: string): Promise<CfsPackageReference[]> {
		const out = await this._conanCommand(["cfs", "delete", pattern]);

		return this._parsePackageReferences(out);
	}

	async dependencies(
		reference: CfsPackageReference,
		options?: CfsPackageDependenciesOptions
	): Promise<CfsPackageReference[]> {
		const commandOptions: string[] = [];

		if (options?.localOnly === true) {
			commandOptions.push("--no-remote");
		} else {
			await this._ensureRemotesReady();
		}

		if (options?.unresolved === true) {
			commandOptions.push("--unresolved");
		}

		const out = await this._conanCommand([
			"cfs",
			"dependencies",
			this._refToString(reference),
			...commandOptions
		]);

		return this._parsePackageReferences(out);
	}

	async dependenciesBatch(
		references: CfsPackageReference[],
		options?: CfsPackageDependenciesOptions
	): Promise<Record<string, CfsPackageReference[]>> {
		if (references.length === 0) {
			return {};
		}

		const commandOptions: string[] = [];

		if (options?.localOnly === true) {
			commandOptions.push("--no-remote");
		} else {
			await this._ensureRemotesReady();
		}

		if (options?.unresolved === true) {
			commandOptions.push("--unresolved");
		}

		const out = await this._conanCommand([
			"cfs",
			"dependencies-batch",
			...references.map((ref) => this._refToString(ref)),
			...commandOptions
		]);

		const parsed = JSON.parse(out) as Record<string, string[]>;

		// Build the result from the requested references rather than the parsed
		// keys, so every caller-supplied reference is present regardless of what
		// the backend echoed back.
		const result: Record<string, CfsPackageReference[]> = {};

		for (const reference of references) {
			const key = this._refToString(reference);
			const dependencies = parsed[key] ?? [];

			result[key] = this._parsePackageReferences(
				dependencies.join("\n")
			);
		}

		return result;
	}

	async localConsumers(
		pkgName: string
	): Promise<CfsPackageReference[]> {
		const out = await this._conanCommand([
			"cfs",
			"local-consumers",
			pkgName
		]);

		return this._parsePackageReferences(out);
	}

	async getPath(pkgName: string): Promise<string> {
		const pkgIndex = await this._readPkgIndex();
		const pkg = pkgIndex[pkgName];

		if (pkg === undefined) {
			throw Error(`Package ${pkgName} is not installed`);
		}

		return pkg.path;
	}

	async addRemote(name: string, url: string): Promise<void> {
		await this._ensureRemotesReady();
		await this.remoteMgr.addCustomRemote(name, url);
	}

	async deleteRemote(name: string): Promise<void> {
		await this._ensureRemotesReady();
		await this.remoteMgr.deleteCustomRemote(name);
	}

	async listRemotes(): Promise<CfsPackageRemote[]> {
		await this._ensureRemotesReady({ applyConfig: false }); // listing the remotes also applies the config
		try {
			return await this.remoteMgr.listRemotes();
		} catch (error) {
			this._remotesReady = false;
			throw error;
		}
	}

	async login(
		remote: string,
		user: string,
		password: string
	): Promise<void> {
		await this._ensureRemotesReady();
		await this.remoteMgr.loginRemote(remote, user, password);
	}

	async logout(remoteName: string): Promise<void> {
		await this._ensureRemotesReady();
		await this.remoteMgr.logoutRemote(remoteName);
	}

	async enableRemote(name: string): Promise<void> {
		await this._ensureRemotesReady();
		await this.remoteMgr.enableRemote(name);
	}

	async disableRemote(name: string): Promise<void> {
		await this._ensureRemotesReady();
		await this.remoteMgr.disableRemote(name);
	}

	async installFromManifest(
		manifestPath: string,
		options?: CfsPackageInstallOptions
	): Promise<{
		installed: CfsPackageReference[];
		skipped: CfsPackageReference[];
	}> {
		const commandOptions: string[] = [];

		if (options?.localOnly == true) {
			commandOptions.push("--no-remote");
		} else {
			await this._ensureRemotesReady();
		}

		if (options?.acceptLicense === true) {
			commandOptions.push("--accept-license");
			if (this.licenseReporter !== undefined) {
				const plan = await this.getInstallPlan(manifestPath);
				await this._reportAcceptedLicensesIfNeeded(
					plan.requiresLicenseAcceptance.map((pkg) => pkg.reference),
					plan.toInstall
				);
			}
		}

		const out = await this._conanCommand([
			"cfs",
			"install-manifest",
			manifestPath,
			...commandOptions
		]);

		// Handle empty output (no packages to install)
		if (!out || out.trim() === "") {
			return { installed: [], skipped: [] };
		}

		const result = JSON.parse(out) as {
			installed?: string[];
			skipped?: string[];
		};

		const parseRef = (x: string): CfsPackageReference => {
			const [n, v] = x.split("/");
			return { name: n, version: v };
		};

		return {
			installed: (result.installed ?? []).map(parseRef),
			skipped: (result.skipped ?? []).map(parseRef)
		};
	}

	async checkManifest(
		manifestPath: string
	): Promise<CfsPackageReference[]> {
		const out = await this._conanCommand([
			"cfs",
			"check-manifest",
			manifestPath
		]);

		const packages = JSON.parse(out) as CfsPackageReference[];

		// Remove bracket notation from versions if present as a matching pair (e.g., "[1.0]" -> "1.0")
		return packages.map((pkg) => {
			let version = pkg.version;
			if (version.startsWith("[") && version.endsWith("]")) {
				version = version.slice(1, -1);
			}
			return { name: pkg.name, version };
		});
	}

	async getInstallPlan(
		input: CfsInstallInput
	): Promise<CfsInstallPlan> {
		await this._ensureRemotesReady();

		const args = ["cfs", "install-plan"];

		if (typeof input === "string") {
			// It's a manifest file path
			args.push("--manifest", input);
		} else if (Array.isArray(input)) {
			// Array of package references
			for (const ref of input) {
				args.push(`${ref.name}/${ref.version}`);
			}
		} else {
			// Single package reference
			args.push(`${input.name}/${input.version}`);
		}

		const out = await this._conanCommand(args);

		const result = JSON.parse(out) as CfsInstallPlan;

		// Remove bracket notation from versions if present
		const cleanVersion = (version: string): string => {
			if (version.startsWith("[") && version.endsWith("]")) {
				return version.slice(1, -1);
			}
			return version;
		};

		const mapPackageReference = (
			pkg: CfsPackageReference
		): CfsPackageReference => ({
			name: pkg.name,
			version: cleanVersion(pkg.version)
		});

		return {
			toInstall: result.toInstall.map(mapPackageReference),
			alreadyInstalled: result.alreadyInstalled.map(
				mapPackageReference
			),
			skipped: (result.skipped ?? []).map((info) => ({
				reference: mapPackageReference(info.reference),
				reasonCode: info.reasonCode
			})),
			requiresLicenseAcceptance: result.requiresLicenseAcceptance.map(
				(info) => ({
					reference: mapPackageReference(info.reference),
					license: info.license,
					licenseText: info.licenseText
				})
			)
		};
	}

	async registerRemotesProvider(
		provider: CfsPackageRemotesProvider
	): Promise<void> {
		this.remotesProvider = provider;
		this.remoteMgr = new ConanRemoteManager(
			this._conanRun,
			this._conanHomePath,
			this.remotesProvider
		);
		this._remotesReady = false;
		return Promise.resolve();
	}

	async unregisterRemotesProvider(): Promise<void> {
		this.remotesProvider = undefined;
		this.remoteMgr = new ConanRemoteManager(
			this._conanRun,
			this._conanHomePath,
			this.remotesProvider
		);
		this._remotesReady = false;
		await this._ensureRemotesReady();
	}

	registerLicenseReporter(
		reporter: CfsPackageLicenseReporter
	): Promise<void> {
		this.licenseReporter = reporter;
		return Promise.resolve();
	}

	unregisterLicenseReporter(): Promise<void> {
		this.licenseReporter = undefined;
		return Promise.resolve();
	}

	private async _reportAcceptedLicensesIfNeeded(
		refsRequiringLicenseAcceptance: CfsPackageReference[],
		references: CfsPackageReference[]
	): Promise<void> {
		if (
			refsRequiringLicenseAcceptance.length === 0 ||
			!this.licenseReporter
		) {
			return;
		}

		// Filter to only report licenses for packages that are actually being installed.
		// This is necessary because callers may modify the plan's toInstall list (e.g., the IDE
		// may exclude certain packages like MSDK), and the pre-computed license info from the plan
		// may include packages that are no longer in the final install set.
		const referencesToInstall = new Set(
			references.map((reference) => this._refToString(reference))
		);
		const acceptedReferences = refsRequiringLicenseAcceptance.filter(
			(reference) =>
				referencesToInstall.has(this._refToString(reference))
		);

		if (acceptedReferences.length === 0) {
			return;
		}

		await this.licenseReporter.reportLicenseAcceptance(
			acceptedReferences
		);
	}
}
