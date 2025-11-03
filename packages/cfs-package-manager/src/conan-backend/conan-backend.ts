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

import { ExecFileOptions } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

import type {
	CfsPackage,
	CfsInstalledPackage,
	CfsPackageManagerProvider,
	CfsPackageReference,
	CfsPackageRemote,
	CfsPackageRemoteCredentialProvider,
	CfsPackageInstallOptions
} from "../api/api.js";
import PackmanUtils from "../utils/utils.js";
import { ConanRunner, ConanError } from "./conan-runner.js";
import {
	ConanRemoteManager,
	ConanRemoteInfo
} from "./conan-remote.js";

interface PackageIndexEntry {
	full_ref: string;
	path: string;
	requires: string[];
	description: string;
	license: string;
	cfsVersion: string;
	soc: string[];
	type: string;
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

	// Registered credential providers
	private readonly credentialProviders = new Map<
		string,
		CfsPackageRemoteCredentialProvider
	>();

	// Executes conan commands
	private readonly _conanRun: ConanRunner;

	// Manages conan remotes
	private readonly remoteMgr: ConanRemoteManager;

	constructor({
		conanHome = defaultConanHomePath,
		indexDir = defaultIndexDir,
		cfsInstallDir = PackmanUtils.getCFSInstallPath(),
		conanConfigPath = defaultConanConfigPath,
		credentialProviders = new Array<CfsPackageRemoteCredentialProvider>()
	} = {}) {
		this._indexDir = indexDir;
		this._conanHomePath = conanHome;
		this._conanConfigPath = conanConfigPath;
		this._conanRun = new ConanRunner(conanHome, cfsInstallDir);
		this.remoteMgr = new ConanRemoteManager(
			this._conanRun,
			this._conanHomePath
		);
		// Register initial credential providers
		for (const provider of credentialProviders) {
			this.credentialProviders.set(provider.name, provider);
		}
	}

	private _refToString(ref: CfsPackageReference): string {
		return `${ref.name}/${ref.version}`;
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
						// Re-authenticate the remotes with credential providers
						await this._reAuthWithProvider(error.remotes);

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
			// No default profile. Run conan command to create a new one.
			// This will only happen on a clean cache
			await this._conanCommand(["profile", "detect"]);
		}

		if (initRemotes) {
			await this._ensureRemotesReady();
		}
	}

	/**
	 * Ensures remotes are configured and authenticated.
	 * This is required for operations that access remote repositories.
	 */
	private async _ensureRemotesReady(): Promise<void> {
		if (this._remotesReady) return;

		// Ensure remotes are initialized before running any conan command
		await this.remoteMgr.init();

		// Ensure remotes config is up to date
		await this.remoteMgr.applyRemotesConfig();

		// Update remotes status based on their authentication
		// This will enable/disable remotes based on the registered credential providers
		// and will try to authenticate with them if needed.
		await this._authUpdateRemoteStatus(
			await this.remoteMgr.listRemotes()
		);

		this._remotesReady = true;
	}

	// Re-authenticates the given remotes with refreshed credentials
	// from their registered credential providers
	// Accepts an optional list of remote names to re-authenticate
	// Ignores non-provider remotes
	private async _reAuthWithProvider(
		remoteNames?: string[]
	): Promise<void> {
		// Get the list of remotes to re-authenticate
		// either the list provided or all remotes that have a provider
		const remotes = (await this.remoteMgr.listRemotes())
			.filter((r) =>
				remoteNames && remoteNames.length > 0
					? remoteNames.includes(r.name)
					: true
			)
			.filter((r) => r.provider !== undefined);

		// If we received a list with only non-provider remotes, do nothing
		if (remotes.length === 0) {
			return;
		}

		// attempt to fetch new credentials and re-authenticate
		await this._authUpdateRemoteStatus(remotes, true);
	}

	// Logs in using credentials from the provider, refreshes and retries if needed
	// returns true if authentication was successful, false if the provider did not have credentials
	// throws if some other error happened
	private async _authWithProvider(
		remote: ConanRemoteInfo,
		provider: CfsPackageRemoteCredentialProvider
	): Promise<boolean> {
		const maxTries = 2;
		for (let retry = 1; retry <= maxTries; retry++) {
			const creds = await provider.getRemoteCredential(remote.url);
			if (creds) {
				try {
					await this._login(remote.name, creds.user, creds.password);
					return true;
				} catch (error) {
					if (retry == maxTries) throw error;
					if (error instanceof ConanError) {
						if (error.code === "AUTH_ERROR") {
							// try refreshing the credential
							await provider.refreshRemoteCredential(remote.url);
							continue;
						}
					}

					throw error; // rethrow error if we cannot handle it
				}
			}
			return false;
		}
		return false;
	}

	// Updates the status of the given remotes based on their authentication
	// This will try to authenticate remotes that have a registered credential provider
	// and will enable/disable them based on the authentication result
	// remotes without a provider will be enabled
	// remotes with a provider but no credentials will be disabled
	// remotes with a provider and valid credentials will be enabled
	// remotes with a provider that isn't registered will be disabled
	private async _authUpdateRemoteStatus(
		remotes: ConanRemoteInfo[],
		refresh = false
	): Promise<void> {
		// group by provider
		const byProvider = new Map<
			string | undefined,
			ConanRemoteInfo[]
		>();
		for (const remote of remotes) {
			// Group remotes by provider
			// remotes without a provider will be grouped under undefined
			const provider = remote.provider;
			if (!byProvider.has(provider)) {
				byProvider.set(provider, []);
			}
			byProvider.get(provider)?.push(remote);
		}

		// for each provider, try to authenticate and enable all the remotes that belong to it
		for (const [providerName, providerRemotes] of byProvider) {
			if (providerName) {
				const provider = this.credentialProviders.get(providerName);
				if (provider) {
					for (const r of providerRemotes) {
						if (refresh) {
							// if refresh is true, we want to re-authenticate even if already authenticated
							r.authenticated = false;
							await provider.refreshRemoteCredential(r.url);
						}
						// try to authenticate and enable/disable the remote based on the result
						await this._enableAuthenticatedRemote(r, provider);
					}
				} else {
					// disable all remotes that belong to a non-registered provider
					for (const r of providerRemotes) {
						if (r.enabled) {
							await this.remoteMgr.disableRemote(r.name);
						}
					}
				}
			} else {
				// enable all non-provider remotes
				for (const r of providerRemotes) {
					if (!r.enabled) {
						await this.remoteMgr.enableRemote(r.name);
					}
				}
			}
		}
	}

	// Ensures the given remote is enabled if authenticated, disabled if not
	private async _enableAuthenticatedRemote(
		remote: ConanRemoteInfo,
		provider: CfsPackageRemoteCredentialProvider
	): Promise<void> {
		if (!remote.authenticated) {
			// try to authenticate with the provider
			if (await this._authWithProvider(remote, provider)) {
				// authentication successful
				if (!remote.enabled) {
					await this.remoteMgr.enableRemote(remote.name);
				}
			} else {
				// disable remote if we could not authenticate
				if (remote.enabled) {
					await this.remoteMgr.disableRemote(remote.name);
				}
			}
		} else {
			// remote is already authenticated, ensure it's enabled
			if (!remote.enabled) {
				await this.remoteMgr.enableRemote(remote.name);
			}
		}
	}

	async list(
		pattern?: string,
		filter: Record<string, string | string[]> = {}
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

			// Filter packages based on the provided filter
			const matchesFilter = Object.entries(filter).every(
				([key, filterValue]) => {
					if (!(key in pkg)) {
						return false;
					}

					const pkgValue = pkg[key as keyof PackageIndexEntry];

					// Normalize filter value to an array for consistent processing
					const filterValues = Array.isArray(filterValue)
						? filterValue
						: [filterValue];

					// Check if any of the filter values match
					return filterValues.some((value) => {
						if (Array.isArray(pkgValue)) {
							return pkgValue.includes(value);
						} else {
							return pkgValue === value;
						}
					});
				}
			);

			if (!matchesFilter) {
				continue;
			}

			const fullVersion = pkg.full_ref.split("/")[1];
			const version = fullVersion.split("#")[0];

			packages.push({ name: pkgName, version: version });
		}

		return packages;
	}

	async search(pattern: string): Promise<CfsPackageReference[]> {
		await this._ensureRemotesReady();

		const out = await this._conanCommand(["cfs", "search", pattern]);

		return out
			.split("\n")
			.filter(Boolean)
			.map((x) => {
				const [n, v] = x.split("/");
				return { name: n, version: v };
			});
	}

	public getIndexFilePath(): string {
		return path.join(this._indexDir, ".cfsPackages");
	}

	async getInstalledPackageInfo(
		filter: Record<string, string | string[]> = {}
	): Promise<CfsInstalledPackage[]> {
		const pkgIndex = await this._readPkgIndex();
		const packages: CfsInstalledPackage[] = [];

		for (const pkgName in pkgIndex) {
			const pkgEntry = pkgIndex[pkgName];

			if (pkgEntry === undefined) {
				continue;
			}

			// Filter packages based on the provided filter
			const matchesFilter = Object.entries(filter).every(
				([key, filterValue]) => {
					if (!(key in pkgEntry)) {
						return false;
					}

					const pkgValue = pkgEntry[key as keyof PackageIndexEntry];

					// Normalize filter value to an array for consistent processing
					const filterValues = Array.isArray(filterValue)
						? filterValue
						: [filterValue];

					// Check if any of the filter values match
					return filterValues.some((value) => {
						if (Array.isArray(pkgValue)) {
							return pkgValue.includes(value);
						} else {
							return pkgValue === value;
						}
					});
				}
			);

			if (!matchesFilter) {
				continue;
			}

			const fullVersion = pkgEntry.full_ref.split("/")[1];
			const version = fullVersion.split("#")[0];

			packages.push({
				name: pkgName,
				version,
				path: pkgEntry.path,
				...(pkgEntry.type ? { type: pkgEntry.type } : {})
			});
		}

		return packages;
	}

	async getPackageInfo(
		reference: CfsPackageReference
	): Promise<CfsPackage> {
		await this._ensureRemotesReady();

		const out = await this._conanCommand([
			"cfs",
			"get-pkg-info",
			this._refToString(reference)
		]);
		return JSON.parse(out) as CfsPackage;
	}

	async install(
		reference: CfsPackageReference,
		options?: CfsPackageInstallOptions
	): Promise<CfsPackageReference[]> {
		const commandOptions: string[] = [];

		if (options?.localOnly == true) {
			commandOptions.push("--no-remote");
		} else {
			await this._ensureRemotesReady();
		}

		const out = await this._conanCommand([
			"cfs",
			"install",
			this._refToString(reference),
			...commandOptions
		]);

		return out
			.split("\n")
			.filter(Boolean)
			.map((x) => {
				const [n, v] = x.split("/");
				return { name: n, version: v };
			});
	}

	async uninstall(pkgName: string): Promise<void> {
		await this._conanCommand(["cfs", "uninstall", pkgName]);
	}

	async delete(pattern: string): Promise<CfsPackageReference[]> {
		const out = await this._conanCommand(["cfs", "delete", pattern]);

		return out
			.split("\n")
			.filter(Boolean)
			.map((x) => {
				const [n, v] = x.split("/");
				return { name: n, version: v };
			});
	}

	async dependencies(
		reference: CfsPackageReference
	): Promise<CfsPackageReference[]> {
		await this._ensureRemotesReady();

		const out = await this._conanCommand([
			"cfs",
			"dependencies",
			this._refToString(reference)
		]);

		return out
			.split("\n")
			.filter(Boolean)
			.map((x) => {
				const [n, v] = x.split("/");
				return { name: n, version: v };
			});
	}

	async localConsumers(
		pkgName: string
	): Promise<CfsPackageReference[]> {
		const out = await this._conanCommand([
			"cfs",
			"local-consumers",
			pkgName
		]);

		return out
			.split("\n")
			.filter(Boolean)
			.map((x) => {
				const [n, v] = x.split("/");
				return { name: n, version: v };
			});
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
		await this._ensureRemotesReady();
		const remotes = await this.remoteMgr.listRemotes();
		return remotes.map((r) => ({
			name: r.name,
			url: new URL(r.url),
			// auth is an object with either username or provider, or is undefined
			auth: r.provider
				? ({ credentialProvider: r.provider } as {
						username: never;
						credentialProvider: string;
					})
				: r.authenticated
					? ({ username: r.user_name } as {
							username: string;
							credentialProvider: never;
						})
					: undefined,
			custom: !r.managed
		}));
	}

	async login(
		remote: string,
		user: string,
		password: string
	): Promise<void> {
		await this._ensureRemotesReady();
		await this.remoteMgr.setCustomRemoteCredentialProvider(
			remote,
			undefined
		); // remove provider
		await this._login(remote, user, password);
	}

	private async _login(
		remote: string,
		user: string,
		password: string
	): Promise<void> {
		await this._conanRun.execute(
			["remote", "login", "-p", password, remote, user],
			{ cwd: this._indexDir }
		);
	}

	async logout(remoteName: string): Promise<void> {
		await this._ensureRemotesReady();
		const remote = await this.remoteMgr.getRemote(remoteName);
		if (!remote) {
			throw new Error(`Remote '${remoteName}' does not exist.`);
		}
		if (remote.provider) {
			await this.remoteMgr.setCustomRemoteCredentialProvider(
				remoteName,
				undefined
			); // remove provider
		}
		if (!remote.enabled) {
			// cannot logout from a disabled remote, enable it first
			await this.remoteMgr.enableRemote(remoteName);
		}
		await this._conanRun.execute(["remote", "logout", remoteName], {
			cwd: this._indexDir
		});
	}

	async installFromManifest(
		manifestPath: string,
		options?: CfsPackageInstallOptions
	): Promise<CfsPackageReference[]> {
		const commandOptions: string[] = [];

		if (options?.localOnly == true) {
			commandOptions.push("--no-remote");
		} else {
			await this._ensureRemotesReady();
		}

		const out = await this._conanCommand([
			"cfs",
			"install-manifest",
			manifestPath,
			...commandOptions
		]);

		return out
			.split("\n")
			.filter(Boolean)
			.map((x) => {
				const [n, v] = x.split("/");
				return { name: n, version: v };
			});
	}

	async checkManifest(
		manifestPath: string
	): Promise<CfsPackageReference[]> {
		const out = await this._conanCommand([
			"cfs",
			"check-manifest",
			manifestPath
		]);

		return JSON.parse(out) as CfsPackageReference[];
	}

	async registerCredentialProvider(
		provider: CfsPackageRemoteCredentialProvider
	): Promise<void> {
		this.credentialProviders.set(provider.name, provider);
		// enable all the remotes that use this provider
		// which are either already authenticated, or we can authenticate now
		const remotes = await this.remoteMgr.listRemotes(provider.name);
		for (const remote of remotes) {
			await this._enableAuthenticatedRemote(remote, provider);
		}
	}

	async unregisterCredentialProvider(
		provider: string | CfsPackageRemoteCredentialProvider
	): Promise<void> {
		const providerName =
			typeof provider === "string" ? provider : provider.name;
		this.credentialProviders.delete(providerName);
		// disable all the remotes that use this provider
		const remotes = await this.remoteMgr.listRemotes(providerName);
		for (const remote of remotes) {
			if (remote.enabled) {
				await this.remoteMgr.disableRemote(remote.name);
			}
		}
	}

	async setRemoteCredentialProvider(
		remoteName: string,
		providerName: string
	): Promise<void> {
		await this.remoteMgr.setCustomRemoteCredentialProvider(
			remoteName,
			providerName
		);
		const remote = await this.remoteMgr.getRemote(remoteName);
		const provider = this.credentialProviders.get(providerName);
		if (provider && remote) {
			await this._enableAuthenticatedRemote(remote, provider);
		}
	}
}
