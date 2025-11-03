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

import path from "node:path";
import { ConanError, ConanRunner } from "./conan-runner.js";
import { promises as fs } from "node:fs";

interface ConanRemote {
	name: string;
	url: string;
	verify_ssl: boolean;
	enabled: boolean;
}

interface ConanRemoteAuth {
	name: string;
	user_name: string;
	authenticated: boolean;
}

interface ConanRemoteConfig {
	name: string;
	url: string;
	provider?: string; // credential provider
}

interface MergedConanRemoteConfig extends ConanRemoteConfig {
	managed: boolean;
}

export interface ConanRemoteInfo
	extends ConanRemote,
		ConanRemoteAuth {
	provider?: string; // credential provider
	managed: boolean; // is a default (managed) remote
}

const defaultManagedRemotesConfig = "managedRemotes.json";
const defaultCustomRemotesConfig = "customRemotes.json";
const defaultConanRemotesConfig = "remotes.json";

export class ConanRemoteManager {
	private readonly _managedRemotesConfigPath: string;
	private readonly _customRemotesConfigPath: string;
	private readonly _conanRemotesConfigPath: string;

	constructor(
		private readonly _conanRun: ConanRunner,
		private readonly _conanHomePath: string,
		managedRemotesConfigPath: string = defaultManagedRemotesConfig,
		customRemotesConfigPath: string = defaultCustomRemotesConfig,
		conanRemotesConfigPath: string = defaultConanRemotesConfig
	) {
		this._managedRemotesConfigPath = path.isAbsolute(
			managedRemotesConfigPath
		)
			? managedRemotesConfigPath
			: path.join(this._conanHomePath, defaultManagedRemotesConfig);
		this._customRemotesConfigPath = path.isAbsolute(
			customRemotesConfigPath
		)
			? customRemotesConfigPath
			: path.join(this._conanHomePath, defaultCustomRemotesConfig);
		this._conanRemotesConfigPath = path.isAbsolute(
			conanRemotesConfigPath
		)
			? conanRemotesConfigPath
			: path.join(this._conanHomePath, defaultConanRemotesConfig);
	}

	public async init(): Promise<void> {
		// Ensure conan remotes config exists
		await this.ensureConanRemotesConfigExists();
	}

	// Merge managed and custom remotes, overwriting custom with managed if names clash
	public async applyRemotesConfig(): Promise<void> {
		// Read merged config
		const mergedRemotes =
			(await this._getMergedRemotesConfig()) ??
			new Map<string, MergedConanRemoteConfig>();

		// Get current remotes from conan
		let currentRemotes: ConanRemote[] = [];
		if (await this.ensureConanRemotesConfigExists()) {
			try {
				const currentRemotesOut = await this._conanRun.execute([
					"remote",
					"list",
					"-f",
					"json"
				]);
				currentRemotes = JSON.parse(
					currentRemotesOut
				) as ConanRemote[];
			} catch (error) {
				if (
					error instanceof ConanError &&
					error.code === "NO_REMOTE"
				) {
					currentRemotes = [];
				} else {
					throw error;
				}
			}
		}

		// Remove any current remotes that are not in the merged remotes
		// Or whose URL has changed
		const validCurrentRemotes = new Map<string, ConanRemote>();
		for (const r of currentRemotes) {
			validCurrentRemotes.set(r.name, r);
		}
		for (const r of currentRemotes) {
			if (
				!mergedRemotes.has(r.name) ||
				mergedRemotes.get(r.name)?.url !== r.url
			) {
				await this._conanRun.execute(["remote", "remove", r.name]);
				validCurrentRemotes.delete(r.name);
			}
		}

		// Apply merged remotes, skipping those that already exist with the same URL
		for (const [name, remote] of mergedRemotes) {
			if (!validCurrentRemotes.has(name)) {
				await this._conanRun.execute([
					"remote",
					"add",
					name,
					remote.url
				]);
			}
		}
	}

	private async _getMergedRemotesConfig(): Promise<
		Map<string, MergedConanRemoteConfig> | undefined
	> {
		// Read managed and custom remotes config files
		const managedRemotes = await this._readRemotesConfig(
			this._managedRemotesConfigPath
		);
		const customRemotes = await this._readRemotesConfig(
			this._customRemotesConfigPath
		);

		if (!managedRemotes && !customRemotes) {
			// No remotes to merge
			return;
		}

		// Merge remotes, managed remotes take precedence over custom remotes
		const remotesMap = new Map<string, MergedConanRemoteConfig>();
		if (customRemotes) {
			for (const remote of customRemotes) {
				remotesMap.set(remote.name, { ...remote, managed: false });
			}
		}
		if (managedRemotes) {
			for (const remote of managedRemotes) {
				remotesMap.set(remote.name, { ...remote, managed: true });
			}
		}

		return remotesMap;
	}

	// Read remotes config file, returning undefined if file does not exist
	private async _readRemotesConfig(
		configPath: string
	): Promise<ConanRemoteConfig[] | undefined> {
		try {
			const fileContent = await fs.readFile(configPath, "utf-8");
			const parsed = JSON.parse(fileContent) as {
				remotes: ConanRemoteConfig[];
			};
			return parsed.remotes;
		} catch (err) {
			if (
				!(err instanceof Error) ||
				(err as NodeJS.ErrnoException).code !== "ENOENT"
			) {
				throw err;
			}
		}
	}

	// Write custom remotes config file
	private async _writeCustomRemotesConfig(
		remotes: MergedConanRemoteConfig[]
	): Promise<void> {
		const customRemotes: ConanRemoteConfig[] = remotes
			.filter((r) => !r.managed) // custom remotes only
			.map(({ url, name, provider }) => ({
				url,
				name,
				provider
			})); // strip out any extra properties
		const fileContent = JSON.stringify(
			{ remotes: customRemotes },
			null,
			1
		);
		await fs.writeFile(
			this._customRemotesConfigPath,
			fileContent,
			"utf-8"
		);
	}

	// write an empty remotes.json file if it does not exist
	// this prevents the conancenter from being used as a default remote
	public async ensureConanRemotesConfigExists(): Promise<boolean> {
		const existingRemotes = await this._readRemotesConfig(
			this._conanRemotesConfigPath
		);
		// File exists and has content
		if (existingRemotes) {
			return existingRemotes.length > 0;
		}

		// File (or directory) does not exist, create it
		await fs.mkdir(path.dirname(this._conanRemotesConfigPath), {
			recursive: true
		});
		const fileContent = JSON.stringify({ remotes: [] }, null, 1);
		await fs.writeFile(
			this._conanRemotesConfigPath,
			fileContent,
			"utf-8"
		);

		return false;
	}

	// Public methods to manage custom remotes
	// Managed remotes are read-only and cannot be modified or deleted
	// Custom remotes can be added, deleted and modified

	// Add a custom remote
	// Throws an error if a remote with the same name already exists
	public async addCustomRemote(
		name: string,
		url: string,
		providerName?: string
	): Promise<void> {
		// Implementation for adding a custom remote
		const mergedConfig =
			(await this._getMergedRemotesConfig()) ??
			new Map<string, MergedConanRemoteConfig>();
		const remote = mergedConfig.get(name);
		if (remote) {
			throw new Error(`Remote '${name}' already exists.`);
		}
		mergedConfig.set(name, {
			name,
			url,
			provider: providerName,
			managed: false
		});

		await this._conanRun.execute(["remote", "add", name, url]);
		await this._writeCustomRemotesConfig(
			Array.from(mergedConfig.values())
		);
	}

	// Delete a custom remote by name
	// Throws an error if the remote does not exist or is a managed remote
	public async deleteCustomRemote(name: string): Promise<void> {
		const mergedConfig = await this._getMergedRemotesConfig();
		const remote = mergedConfig?.get(name);
		if (!remote) {
			throw new Error(`Remote '${name}' does not exist.`);
		}
		if (remote.managed) {
			throw new Error(
				`Cannot delete default remote '${name}'. Only custom remotes can be deleted.`
			);
		}
		mergedConfig?.delete(name);

		await this._conanRun.execute(["remote", "remove", name]);
		await this._writeCustomRemotesConfig(
			Array.from(mergedConfig?.values() ?? [])
		);
	}

	// Set a credential provider for a custom remote
	// Throws an error if the remote does not exist or is a managed remote
	// Setting a provider to undefined removes any existing provider
	public async setCustomRemoteCredentialProvider(
		name: string,
		provider?: string
	): Promise<void> {
		const mergedConfig =
			(await this._getMergedRemotesConfig()) ??
			new Map<string, MergedConanRemoteConfig>();
		const remote = mergedConfig.get(name);
		if (!remote) {
			throw new Error(`Remote '${name}' does not exist.`);
		}
		if (remote.managed) {
			throw new Error(
				`Cannot set credential provider for default remote '${name}'. Only custom remotes can be modified.`
			);
		}
		remote.provider = provider;
		mergedConfig.set(name, remote);
		await this._writeCustomRemotesConfig(
			Array.from(mergedConfig.values())
		);
	}

	// Get a remote by name, including auth and provider info
	// Returns undefined if the remote does not exist
	public async getRemote(
		name: string
	): Promise<ConanRemoteInfo | undefined> {
		return (await this.listRemotes()).find((r) => r.name === name);
	}

	// Enable a remote
	// Note: Enabling a remote does not add it to the config, it just marks it as enabled in conan
	// Enabled remotes can be disabled later
	public async enableRemote(name: string): Promise<void> {
		await this._conanRun.execute(["remote", "enable", name]);
	}

	// Disable a remote
	// Note: Disabling a remote does not remove it from the config, it just marks it as disabled in conan
	// Disabled remotes can be re-enabled later
	public async disableRemote(name: string): Promise<void> {
		await this._conanRun.execute(["remote", "disable", name]);
	}

	// List all remotes, optionally filtering by provider and/or custom (non-default) remotes
	public async listRemotes(
		provider?: string,
		custom?: boolean
	): Promise<ConanRemoteInfo[]> {
		let remotes: ConanRemote[];
		let remotesAuth: ConanRemoteAuth[];
		try {
			const remotesOut = await this._conanRun.execute([
				"remote",
				"list",
				"-f",
				"json"
			]);
			remotes = JSON.parse(remotesOut) as ConanRemote[];
			const remotesAuthOut = await this._conanRun.execute([
				"remote",
				"list-users",
				"-f",
				"json"
			]);
			remotesAuth = JSON.parse(remotesAuthOut) as ConanRemoteAuth[];
		} catch (error) {
			if (error instanceof ConanError && error.code === "NO_REMOTE") {
				remotes = [];
				remotesAuth = [];
			} else {
				throw error;
			}
		}

		const mergedConfig = await this._getMergedRemotesConfig();

		// Create a map of remotes, merging remote info and auth info with our config
		const remotesMap = new Map<string, ConanRemoteInfo>();
		for (const remote of remotes) {
			const remoteAuth = remotesAuth.find(
				(r) => r.name === remote.name
			);
			const mergedConfigEntry = mergedConfig?.get(remote.name);
			remotesMap.set(remote.name, {
				...remote,
				...(remoteAuth ?? {
					name: remote.name,
					user_name: "",
					authenticated: false
				}),
				...(mergedConfigEntry ?? {
					provider: undefined,
					managed: false
				})
			});
		}

		// filter by provider and/or custom if requested
		let result = Array.from(remotesMap.values());
		if (provider) {
			result = result.filter((r) => r.provider === provider);
		}
		if (custom !== undefined) {
			result = result.filter((r) => custom !== r.managed);
		}
		return result;
	}
}
