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

import path from "node:path";
import { ConanError, ConanRunner } from "./conan-runner.js";
import { promises as fs } from "node:fs";
import type {
	CfsPackageRemote,
	CfsPackageRemoteConfigError,
	CfsPackageRemoteConfigErrorCode,
	CfsPackageRemotesProvider,
	CfsPackageRemoteCredentialClient,
	CfsPackageRemoteCredential
} from "../api/api.js";

// Types for `conan remote list` and `conan remote list-users` CLI outputs
interface ConanRemote {
	name: string;
	url: string;
	verify_ssl: boolean;
	enabled: boolean;
}

interface ConanRemoteAuth {
	name: string;
	user_name?: string;
	authenticated: boolean;
}

// Combined info about a conan remote (disabled remotes don't show auth info)
type ConanRemoteInfo =
	| (ConanRemote & { enabled: false })
	| (ConanRemote & {
			enabled: true;
	  } & ConanRemoteAuth);

// Types used by our config files
interface RemoteConfig {
	name: string;
	url: string;
	provider?: string;
}

interface UserRemoteConfig {
	name: string;
	disabled: boolean;
}

// The final config for a remote once config and provider info is merged
interface MergedRemoteConfig extends RemoteConfig, UserRemoteConfig {
	managed: boolean;
}

// A remote config may include an auth client
type ResolvedRemoteConfig =
	| (MergedRemoteConfig & { managed: false; provider?: never })
	| (MergedRemoteConfig & { managed: true; provider: string })
	| (MergedRemoteConfig & {
			managed: true;
			provider: string;
	  } & CfsPackageRemoteCredentialClient);

const defaultCustomRemotesConfig = "customRemotes.json"; // User defined remotes
const defaultUserRemotesConfig = "userRemotesCfg.json"; // User settings for remotes (custom or managed) such as enabled/disabled state
const defaultConanRemotesConfig = "remotes.json"; // Conan's remotes config file

export class ConanRemoteManager {
	private readonly _userRemotesConfigPath: string;
	private readonly _customRemotesConfigPath: string;
	private readonly _conanRemotesConfigPath: string;

	private _normalizeConfigPath(configPath: string): string {
		return path.isAbsolute(configPath)
			? configPath
			: path.resolve(this._conanHomePath, configPath);
	}

	constructor(
		private readonly _conanRun: ConanRunner,
		private readonly _conanHomePath: string,
		private readonly _remotesProvider?: CfsPackageRemotesProvider,
		userRemotesConfigPath: string = defaultUserRemotesConfig,
		customRemotesConfigPath: string = defaultCustomRemotesConfig,
		conanRemotesConfigPath: string = defaultConanRemotesConfig
	) {
		this._userRemotesConfigPath = this._normalizeConfigPath(
			userRemotesConfigPath
		);
		this._customRemotesConfigPath = this._normalizeConfigPath(
			customRemotesConfigPath
		);
		this._conanRemotesConfigPath = this._normalizeConfigPath(
			conanRemotesConfigPath
		);
	}

	public async init(): Promise<void> {
		// Ensure conan remotes config exists
		await this._ensureConanRemotesConfigExists();
	}

	// Compare the current remotes in conan with the resolved config, and apply any necessary changes
	// optionally filtered to a subset of remotes by name, and with the option to refresh credentials for remotes with credential providers
	// returns a map of the resolved config and another map of any errors encountered while applying the config (both indexed by remote name)
	public async applyRemotesConfig({
		remoteNames = undefined,
		refreshCredentials = false
	}: {
		remoteNames?: string[] | undefined;
		refreshCredentials?: boolean;
	} = {}): Promise<
		[
			Map<string, ResolvedRemoteConfig>,
			Map<string, CfsPackageRemoteConfigError>
		]
	> {
		const [currentRemotes, resolvedRemotes] = await Promise.all([
			this._conanRemoteStatus(),
			this._resolveRemotesConfig()
		]);

		const remoteConfigErrors = new Map<
			string,
			CfsPackageRemoteConfigError
		>();

		// Remove any current remotes that are not in the resolved remotes,
		// or whose URL has changed
		const processedRemoteNames = new Set<string>();
		for (const current of currentRemotes) {
			if (remoteNames && !remoteNames.includes(current.name)) {
				resolvedRemotes.delete(current.name);
				continue;
			}

			const resolved = resolvedRemotes.get(current.name);

			// Check it should exist and has the right URL
			if (!resolved || resolved.url !== current.url) {
				try {
					if (current.enabled) {
						await this._conanLogoutRemote(current.name);
					}
					await this._conanRemoveRemote(current.name);
				} catch (error) {
					remoteConfigErrors.set(
						current.name,
						new ConanRemoteError(
							"REMOTE_REMOVE_FAILED",
							"failed to remove remote",
							{
								cause: error
							}
						)
					);
				}

				if (!resolved) {
					processedRemoteNames.add(current.name);
				} // else re-add with the correct URL below

				continue;
			}

			// Configure the remote (enabled state, credentials)
			try {
				await this._configureConanRemote(
					current,
					resolved,
					refreshCredentials
				);
			} catch (error) {
				remoteConfigErrors.set(
					current.name,
					error instanceof ConanRemoteError
						? error
						: new ConanRemoteError(
								"REMOTE_CONFIGURE_FAILED",
								"failed to configure remote",
								{ cause: error }
							)
				);
			}

			processedRemoteNames.add(current.name);
		}

		// Add any missing resolved remotes
		for (const [name, resolved] of resolvedRemotes) {
			if (remoteNames && !remoteNames.includes(name)) {
				resolvedRemotes.delete(name);
				continue;
			}

			if (!processedRemoteNames.has(name)) {
				processedRemoteNames.add(name);

				try {
					await this._conanAddRemote(name, resolved.url);
				} catch (error) {
					remoteConfigErrors.set(
						name,
						new ConanRemoteError(
							"REMOTE_ADD_FAILED",
							"failed to add remote",
							{ cause: error }
						)
					);
					continue;
				}

				const current = {
					name,
					url: resolved.url,
					enabled: true,
					verify_ssl: true,
					authenticated: false
				};

				// Configure the remote (enabled state, credentials)
				try {
					await this._configureConanRemote(
						current,
						resolved,
						refreshCredentials
					);
				} catch (error) {
					remoteConfigErrors.set(
						name,
						error instanceof ConanRemoteError
							? error
							: new ConanRemoteError(
									"REMOTE_CONFIGURE_FAILED",
									"failed to configure remote",
									{ cause: error }
								)
					);
					continue;
				}
			}
		}

		if (remoteNames) {
			// Report any missing remotes
			for (const name of remoteNames) {
				if (!processedRemoteNames.has(name)) {
					remoteConfigErrors.set(
						name,
						new ConanRemoteError(
							"REMOTE_CONFIGURE_FAILED",
							`Remote '${name}' does not exist`,
							{
								cause: new ConanError(
									"REMOTE_NOT_FOUND",
									`Remote '${name}' does not exist`,
									{
										remotes: [name]
									}
								)
							}
						)
					);
				}
			}
		}

		return [resolvedRemotes, remoteConfigErrors];
	}

	// Ensures a remote is configured according to the given config (enabled/disabled state, credentials)
	private async _configureConanRemote(
		remote: ConanRemoteInfo,
		config: ResolvedRemoteConfig,
		refreshCredential = false
	): Promise<void> {
		// Ensure the remote is enabled/disabled
		if (config.disabled === remote.enabled) {
			try {
				if (config.managed && remote.enabled) {
					// Logout of a managed remote if it is being disabled
					await this._conanLogoutRemote(remote.name);
				}
				await (remote.enabled
					? this._conanDisableRemote(remote.name)
					: this._conanEnableRemote(remote.name));
			} catch (error) {
				throw new ConanRemoteError(
					"REMOTE_CONFIGURE_FAILED",
					`failed to ${config.disabled ? "disable" : "enable"} remote`,
					{ cause: error }
				);
			}
		}

		// Authenticate managed remotes with their a credential provider
		if (config.managed && !config.disabled) {
			try {
				if ("auth" in config && config.auth.credentialProvider) {
					await this._authenticateRemoteWithProvider(
						config,
						refreshCredential
					);
				} else {
					await this._conanLogoutRemote(remote.name); // ensure no credentials are set for a managed remote without a credential provider
				}
			} catch (error) {
				if (error instanceof ConanRemoteError) {
					throw error;
				}

				throw new ConanRemoteError(
					"REMOTE_CONFIGURE_FAILED",
					`failed to authenticate remote`,
					{ cause: error }
				);
			}
		}
	}

	// Calculate the desired remotes config
	//  - merges managed remotes from the provider with custom remotes from the config files,
	//  - applies user overrides for enabled/disabled state
	private async _resolveRemotesConfig(): Promise<
		Map<string, ResolvedRemoteConfig>
	> {
		// Fetch managed remotes from the provider, read custom remotes and user config files
		const [managedRemotes, customRemotes, userConfig] =
			await Promise.all([
				this._getManagedRemotesConfig(),
				this._readCustomRemotesConfig(), // user defined custom remotes
				this._readUserRemotesConfig() // user config for remotes (enabled/disabled state)
			]);

		const remotesMap = new Map<string, ResolvedRemoteConfig>();

		if (!managedRemotes && !customRemotes) {
			// No remotes to merge
			return remotesMap;
		}

		// track whether we need to update the config files after merging
		let userConfigChanged = false;
		let remotesConfigChanged = false;

		if (customRemotes) {
			for (const remote of customRemotes) {
				let skipRemote = false; // indicates this custom remote is not included in the merged config

				// migrate legacy configuration
				// - when a custom remote has a url which matches the url of a managed remote,
				//   - if user has explicitly disabled the managed remote then the custom remote is preserved (unless removed by another rule)
				//   - if the managed remote is not disabled, then it is explicitly enabled in the user config (overriding its default disabled state) and the custom remote is removed
				// - custom remotes with a provider are always removed
				// - custom remotes are always replaced by managed remotes with the same name

				if (managedRemotes) {
					const urlMatches = managedRemotes.filter(
						(r) => r.url.href === remote.url
					);

					for (const mr of urlMatches) {
						if (
							!userConfig.has(mr.name) && // no existing config entry for a matching managed remote
							!userConfig.get(remote.name)?.disabled // custom remote is not explicitly disabled
						) {
							// explicitly enable it
							userConfig.set(mr.name, {
								name: mr.name,
								disabled: false
							});

							userConfigChanged = true;
						}

						if (
							!(userConfig.get(mr.name)?.disabled ?? mr.disabled) &&
							!userConfig.get(remote.name)?.disabled
						) {
							// if the managed remote is not disabled,
							// the custom remote will be removed unless it is also explicitly disabled
							skipRemote = true;
						}
					}
				}

				if (remote.provider) {
					skipRemote = true; // custom remotes with a provider are always removed
				}

				if (skipRemote) {
					remotesConfigChanged = true;

					continue;
				}

				delete remote.provider;
				remotesMap.set(remote.name, {
					...remote,
					managed: false as const,
					disabled: Boolean(userConfig.get(remote.name)?.disabled)
				} as MergedRemoteConfig & {
					managed: false;
					provider?: never;
				});
			}
		}

		if (managedRemotes) {
			// Replace any with the same name
			for (const remote of managedRemotes) {
				if (remotesMap.has(remote.name)) {
					remotesConfigChanged = true;
				}

				if (remote.disabled && !userConfig.has(remote.name)) {
					// if the remote is disabled by default and hasn't been
					// re-enabled by a URL match then explicitly disable it in the user config
					userConfig.set(remote.name, {
						name: remote.name,
						disabled: true
					});

					userConfigChanged = true;
				}

				remotesMap.set(remote.name, {
					...remote,
					url: remote.url.toString(),
					managed: true as const,
					disabled: Boolean(userConfig.get(remote.name)?.disabled)
				});
			}
		}

		// make sure no two remotes with the same URL are active at once
		// in case of invalid customRemotes.json
		for (const [name, remote] of remotesMap) {
			if (!remote.disabled) {
				for (const [otherName, otherRemote] of remotesMap) {
					if (
						name !== otherName &&
						!otherRemote.disabled &&
						remote.url === otherRemote.url
					) {
						// disable the other remote to prevent duplicate enabled remotes with the same URL
						otherRemote.disabled = true;

						userConfig.set(otherName, {
							name: otherName,
							disabled: true
						});

						userConfigChanged = true;
					}
				}
			}
		}

		// update the config files if migration caused changes
		const fileUpdates = [];
		if (remotesConfigChanged) {
			fileUpdates.push(
				this._writeCustomRemotesConfig(
					Array.from(remotesMap.values())
				)
			);
		}
		if (userConfigChanged) {
			fileUpdates.push(this._writeUserRemotesConfig(userConfig));
		}

		await Promise.all(fileUpdates);

		return remotesMap;
	}

	private async _authenticateRemoteWithProvider(
		config: ResolvedRemoteConfig,
		refreshCredential = false,
		maxTries = 2
	): Promise<void> {
		if ("auth" in config && config.auth.credentialProvider) {
			for (let retry = 1; retry <= maxTries; retry++) {
				try {
					let creds: CfsPackageRemoteCredential | undefined;
					try {
						if (refreshCredential) {
							await config.refreshCredential();
						}
						creds = await config.getCredential();
						if (!creds) {
							throw new Error(
								"No credentials returned from provider"
							);
						}
					} catch (error) {
						throw new ConanRemoteError(
							"REMOTE_AUTH_FAILED",
							"failed to get remote credentials",
							{ cause: error }
						);
					}

					try {
						await this._conanLoginRemote(
							config.name,
							creds.user,
							creds.password
						);

						break; // break out of the retry loop if successful
					} catch (error) {
						throw new ConanRemoteError(
							"REMOTE_AUTH_FAILED",
							"failed to authenticate with remote",
							{ cause: error }
						);
					}
				} catch (err) {
					refreshCredential = true; // on error, refresh the credential and try again (in case the error was caused by an expired credential)
					if (retry === maxTries) {
						throw err;
					}
				}
			}
		}
	}

	// Get managed remote config, returning undefined if no provider is registered or if the provider returns no remotes
	private async _getManagedRemotesConfig() {
		if (!this._remotesProvider) {
			return undefined;
		}

		const provider = this._remotesProvider; // capturing provider in a local variable for type narrowing (despite the readonly modifier, TypeScript needs this)
		try {
			const remotes = await provider.getRemotes();

			if (remotes.length === 0) {
				return undefined;
			}

			const mapped = remotes.map((r) => {
				const name = r.name
					.trim()
					.toLowerCase()
					.replace(/[^a-z0-9]+/gi, "-")
					.replace(/^-|-$/g, "");
				return "getCredential" in r
					? {
							...r,
							name,
							getCredential: () => r.getCredential(),
							refreshCredential: () => r.refreshCredential()
						}
					: { ...r, name };
			});

			const seenNames = new Set<string>();
			const seenUrls = new Set<string>();
			for (const remote of mapped) {
				if (seenNames.has(remote.name)) {
					throw new ConanRemoteError(
						"REMOTE_CONFIGURE_FAILED",
						`invalid remotes configuration: duplicate remote name '${remote.name}'`
					);
				}
				seenNames.add(remote.name);

				const urlHref = remote.url.href;
				if (seenUrls.has(urlHref)) {
					throw new ConanRemoteError(
						"REMOTE_CONFIGURE_FAILED",
						`invalid remotes configuration: duplicate remote URL '${urlHref}'`
					);
				}
				seenUrls.add(urlHref);
			}

			return mapped;
		} catch (error) {
			if (error instanceof ConanRemoteError) {
				throw error;
			}
			throw new ConanRemoteError(
				"REMOTE_CONFIGURE_FAILED",
				"failed to load remotes configuration",
				{ cause: error }
			);
		}
	}

	// Read the user remotes config file, returning an empty map if the file does not exist
	private async _readUserRemotesConfig(): Promise<
		Map<string, UserRemoteConfig>
	> {
		try {
			const fileContent = await fs.readFile(
				this._userRemotesConfigPath,
				"utf-8"
			);
			const parsed = JSON.parse(fileContent) as Record<
				string,
				UserRemoteConfig
			>;
			return new Map(Object.entries(parsed));
		} catch (err) {
			if (
				!(err instanceof Error) ||
				(err as NodeJS.ErrnoException).code !== "ENOENT"
			) {
				throw err;
			}
		}

		return new Map<string, UserRemoteConfig>();
	}

	// Write the user remotes config file
	private async _writeUserRemotesConfig(
		config: Map<string, UserRemoteConfig>
	): Promise<void> {
		const objConfig = Object.fromEntries(config);
		const fileContent = JSON.stringify(objConfig, null, 1);
		await fs.writeFile(
			this._userRemotesConfigPath,
			fileContent,
			"utf-8"
		);
	}

	// Read remotes config file, returning undefined if file does not exist
	private async _readRemotesConfig(
		configPath: string
	): Promise<RemoteConfig[] | undefined> {
		try {
			const fileContent = await fs.readFile(configPath, "utf-8");
			const parsed = JSON.parse(fileContent) as {
				remotes: RemoteConfig[];
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

		return undefined;
	}

	// Write a remotes config file
	private async _writeRemotesConfig(
		configPath: string,
		remotes: RemoteConfig[]
	): Promise<void> {
		const fileContent = JSON.stringify({ remotes }, null, 1);
		await fs.writeFile(configPath, fileContent, "utf-8");
	}

	// Read the custom remotes config file, returning undefined if the file does not exist
	private async _readCustomRemotesConfig(): Promise<
		RemoteConfig[] | undefined
	> {
		const remotes = await this._readRemotesConfig(
			this._customRemotesConfigPath
		);
		if (!remotes) {
			return undefined;
		}

		// Exclude any entries with invalid names or URLs,
		// and normalize the URLs and names of the valid entries
		return remotes
			.filter(
				(r) =>
					typeof r.name === "string" &&
					typeof r.url === "string" &&
					URL.canParse(r.url) &&
					/^[\w-]+$/.test(r.name.trim())
			)
			.map((r) => ({
				...r,
				name: r.name.trim().toLowerCase(),
				url: new URL(r.url).href
			}));
	}

	// Write custom remotes config file with the given remotes,
	// merging with existing legacy entries (those with a provider)
	private async _writeCustomRemotesConfig(
		remotes: ResolvedRemoteConfig[]
	): Promise<void> {
		// Read existing file so we can merge legacy entries
		const legacyEntries = (
			(await this._readRemotesConfig(
				this._customRemotesConfigPath
			)) ?? []
		).filter((r) => r.provider !== undefined);

		const customRemotes = remotes
			.filter((r) => !r.managed)
			.map(({ url, name }) => ({
				url,
				name
			}));

		// Remove any legacy entries that clash with the new remotes (by name or URL)
		const retainedEntries = legacyEntries.filter(
			(c) =>
				customRemotes.findIndex((r) => {
					const namesClash =
						c.name.trim().toLowerCase() ===
						r.name.trim().toLowerCase();
					const urlsClash =
						URL.canParse(c.url) && URL.canParse(r.url)
							? new URL(c.url).href === new URL(r.url).href
							: c.url === r.url;

					return namesClash || urlsClash;
				}) < 0
		);

		customRemotes.push(...retainedEntries);

		await this._writeRemotesConfig(
			this._customRemotesConfigPath,
			customRemotes
		);
	}

	// write an empty remotes.json file if it does not exist
	// this prevents the conancenter from being used as a default remote
	private async _ensureConanRemotesConfigExists(): Promise<void> {
		const existingRemotes = await this._readRemotesConfig(
			this._conanRemotesConfigPath
		);

		if (!existingRemotes) {
			// File (or directory) does not exist, create it
			await fs.mkdir(path.dirname(this._conanRemotesConfigPath), {
				recursive: true
			});
			await this._writeRemotesConfig(
				this._conanRemotesConfigPath,
				[]
			);
		}
	}

	// Public methods to manage custom remotes
	// Managed remotes are read-only and cannot be modified or deleted (but can be enabled or disabled)
	// Custom remotes can be added, deleted and modified

	// Add a custom remote
	// Throws an error if a remote with the same name already exists
	public async addCustomRemote(
		name: string,
		url: string
	): Promise<void> {
		name = name.trim().toLowerCase();
		if (!/^[\w-]+$/.test(name)) {
			throw new Error(
				"Remote name can only contain letters, numbers, underscores, and hyphens"
			);
		}
		try {
			url = new URL(url).href;
		} catch (err) {
			throw new Error(`Invalid URL: ${url}`);
		}
		const mergedConfig = await this._resolveRemotesConfig();
		for (const remote of mergedConfig.values()) {
			if (remote.name === name) {
				throw new Error(
					`Remote with name '${name}' already exists with URL '${remote.url}'.`
				);
			}
			if (!remote.disabled && remote.url === url) {
				throw new Error(
					`Active remote '${remote.name}' with URL '${url}' already exists. Please disable ${remote.managed ? "" : "or delete "}it before adding a new remote with the same URL.`
				);
			}
		}

		// add to conan first
		await this._conanAddRemote(name, url);

		// Update the custom remotes config file
		mergedConfig.set(name, {
			name,
			url,
			managed: false,
			disabled: false
		});

		// Note separate steps so we don't add to the config file if the conan command fails
		await this._writeCustomRemotesConfig(
			Array.from(mergedConfig.values())
		);

		// Delete any potential stale config for this remote
		const userConfig = await this._readUserRemotesConfig();
		if (userConfig.delete(name)) {
			await this._writeUserRemotesConfig(userConfig);
		}
	}

	// Delete a custom remote by name
	// Throws an error if the remote does not exist or is a managed remote
	public async deleteCustomRemote(name: string): Promise<void> {
		const mergedConfig = await this._resolveRemotesConfig();
		const remote = mergedConfig.get(name.trim().toLowerCase());

		if (remote?.managed) {
			throw new Error(
				`Cannot delete default remote '${remote.name}'. Only custom remotes can be deleted.  To prevent this remote being used, please disable it instead.`
			);
		}

		// Remove from conan first
		try {
			await this._conanRemoveRemote(remote?.name ?? name);
		} catch (error) {
			// If the remote was not found in conan, but was in config, we can consider it removed and not throw an error
			if (
				!remote || // remote wasn't in the config (throw any error including REMOTE_NOT_FOUND)
				!(
					// remote was in the config and some other error occurred
					(
						error instanceof ConanError &&
						error.code === "REMOTE_NOT_FOUND"
					)
				)
			) {
				throw error;
			}
		}

		// Remove from config after successfully removing from conan
		if (mergedConfig.delete(remote?.name ?? name)) {
			await this._writeCustomRemotesConfig(
				Array.from(mergedConfig.values())
			);
		}
		const userConfig = await this._readUserRemotesConfig();
		if (userConfig.delete(remote?.name ?? name)) {
			await this._writeUserRemotesConfig(userConfig);
		}
	}

	// Enable a remote
	public async enableRemote(name: string): Promise<void> {
		const mergedConfig = await this._resolveRemotesConfig();
		const target = mergedConfig.get(name.trim().toLowerCase());
		if (target) {
			for (const remote of mergedConfig.values()) {
				if (
					!remote.disabled &&
					remote.name !== target.name &&
					remote.url === target.url
				) {
					throw new Error(
						`Active remote '${remote.name}' with URL '${remote.url}' already exists. Please disable ${remote.managed ? "" : "or delete "}it before enabling a remote with the same URL.`
					);
				}
			}
		}

		// First update the config
		const userConfig = await this._readUserRemotesConfig();
		if (target) {
			userConfig.set(target.name, {
				name: target.name,
				disabled: false
			});

			await this._writeUserRemotesConfig(userConfig);
		}

		// Then apply the config to conan (will log back in to the remote if it has a credential provider)
		const [, configErrors] = await this.applyRemotesConfig({
			remoteNames: [target?.name ?? name]
		});
		if (configErrors.has(target?.name ?? name)) {
			throw (
				configErrors.get(target?.name ?? name) ??
				new ConanRemoteError(
					"REMOTE_CONFIGURE_FAILED",
					"failed to configure remote"
				)
			);
		}
	}

	// Disable a remote
	public async disableRemote(name: string): Promise<void> {
		const mergedConfig = await this._resolveRemotesConfig();

		// Set the config first
		const target = mergedConfig.get(name.trim().toLowerCase());
		if (target) {
			const userConfig = await this._readUserRemotesConfig();
			userConfig.set(target.name, {
				name: target.name,
				disabled: true
			});

			await this._writeUserRemotesConfig(userConfig);
		}

		// Then apply the config to conan (will log out of the remote if it has a credential provider)
		const [, configErrors] = await this.applyRemotesConfig({
			remoteNames: [target?.name ?? name]
		});
		if (configErrors.has(target?.name ?? name)) {
			throw (
				configErrors.get(target?.name ?? name) ??
				new ConanRemoteError(
					"REMOTE_CONFIGURE_FAILED",
					"failed to configure remote"
				)
			);
		}
	}

	public async loginRemote(
		name: string,
		username: string,
		password: string
	): Promise<void> {
		const mergedConfig = await this._resolveRemotesConfig();
		const remote = mergedConfig.get(name.trim().toLowerCase());

		if (remote?.disabled) {
			throw new Error(
				`Remote '${name}' is disabled. Please enable it before logging in.`
			);
		}
		if (remote?.managed) {
			throw new Error(
				`Cannot set credentials for default remote '${remote.name}'. Only custom remotes can be modified.`
			);
		}

		await this._conanLoginRemote(
			remote?.name ?? name,
			username,
			password
		);
	}

	public async logoutRemote(name: string): Promise<void> {
		const mergedConfig = await this._resolveRemotesConfig();
		const remote = mergedConfig.get(name.trim().toLowerCase());

		if (remote?.disabled) {
			throw new Error(
				`Remote '${remote.name}' is disabled. Please enable it before logging out.`
			);
		}
		if (remote?.managed) {
			throw new Error(
				`Cannot set credentials for default remote '${remote.name}'. Only custom remotes can be modified.`
			);
		}

		await this._conanLogoutRemote(remote?.name ?? name);
	}

	// Helper methods to run conan commands for remote management
	private async _conanRemoveRemote(name: string): Promise<void> {
		await this._conanRun.execute(["remote", "remove", name]);
	}

	private async _conanAddRemote(
		name: string,
		url: string
	): Promise<void> {
		await this._conanRun.execute([
			"remote",
			"add",
			"--force", // we allow remotes with duplicate URLs (but only one active at once) but conan does not by default
			name,
			url
		]);
	}

	private async _conanEnableRemote(name: string): Promise<void> {
		await this._conanRun.execute(["remote", "enable", name]);
	}

	private async _conanDisableRemote(name: string): Promise<void> {
		await this._conanRun.execute(["remote", "disable", name]);
	}

	private async _conanLogoutRemote(name: string): Promise<void> {
		await this._conanRun.execute(["remote", "logout", name]);
	}

	private async _conanLoginRemote(
		name: string,
		username: string,
		password: string
	): Promise<void> {
		await this._conanRun.execute([
			"remote",
			"login",
			"-p",
			password,
			name,
			username
		]);
	}

	private async _conanRemoteStatus(): Promise<ConanRemoteInfo[]> {
		let remotes: ConanRemote[];
		let remotesAuth: ConanRemoteAuth[];
		try {
			await this._ensureConanRemotesConfigExists();
			const remotesOut = await this._conanRun.execute([
				"remote",
				"list",
				"-f",
				"json"
			]);
			remotes = JSON.parse(remotesOut) as ConanRemote[];
			try {
				const remotesAuthOut = await this._conanRun.execute([
					"remote",
					"list-users",
					"-f",
					"json"
				]);
				remotesAuth = JSON.parse(remotesAuthOut) as ConanRemoteAuth[];
			} catch (error) {
				if (
					error instanceof ConanError &&
					error.code === "NO_REMOTE"
				) {
					// list-users reports no remotes if they are all disabled
					remotesAuth = [];
				} else {
					throw error;
				}
			}
		} catch (error) {
			if (error instanceof ConanError && error.code === "NO_REMOTE") {
				return [];
			} else {
				throw error;
			}
		}

		return remotes.map((remote) => {
			const remoteAuth = remotesAuth.find(
				(r) => r.name === remote.name
			) ?? { name: remote.name, authenticated: false };

			return remote.enabled
				? ({
						...remote,
						...remoteAuth
					} as ConanRemoteInfo)
				: (remote as ConanRemoteInfo);
		});
	}

	// List all remotes
	public async listRemotes(): Promise<CfsPackageRemote[]> {
		const [resolvedConfig, remoteErrors] =
			await this.applyRemotesConfig();

		const remotes = await this._conanRemoteStatus();

		// Create a map of remotes, merging remote info and auth info with our config (and any config errors)
		const remotesMap = new Map<string, CfsPackageRemote>();
		for (const remote of remotes) {
			const remoteConfig = resolvedConfig.get(remote.name);
			const configError = remoteErrors.get(remote.name);

			if (remoteConfig?.managed) {
				const credentialProvider =
					"auth" in remoteConfig
						? remoteConfig.auth.credentialProvider
						: undefined;
				remotesMap.set(remote.name, {
					name: remote.name,
					url: new URL(remote.url),
					provider: remoteConfig.provider,
					custom: false as const,
					disabled: !remote.enabled,
					configError,
					auth: credentialProvider
						? { public: false as const, credentialProvider }
						: { public: true as const }
				});
			} else if (remote.enabled) {
				remotesMap.set(remote.name, {
					name: remote.name,
					url: new URL(remote.url),
					custom: true as const,
					disabled: false,
					configError,
					auth:
						"user_name" in remote && remote.user_name
							? { public: false as const, username: remote.user_name }
							: { public: true as const }
				});
			} else {
				remotesMap.set(remote.name, {
					name: remote.name,
					url: new URL(remote.url),
					custom: true as const,
					disabled: true,
					configError
				});
			}
		}

		for (const [name, remoteConfig] of resolvedConfig) {
			if (!remotesMap.has(name)) {
				const configError = remoteErrors.get(name);

				if (remoteConfig.managed) {
					const credentialProvider =
						"auth" in remoteConfig
							? remoteConfig.auth.credentialProvider
							: undefined;
					remotesMap.set(name, {
						name,
						url: new URL(remoteConfig.url),
						provider: remoteConfig.provider,
						custom: false,
						disabled: remoteConfig.disabled,
						configError,
						auth: credentialProvider
							? { public: false as const, credentialProvider }
							: { public: true as const }
					});
				} else if (!remoteConfig.disabled) {
					remotesMap.set(name, {
						name,
						url: new URL(remoteConfig.url),
						custom: true,
						disabled: false,
						configError,
						auth: { public: true as const }
					});
				} else {
					remotesMap.set(name, {
						name,
						url: new URL(remoteConfig.url),
						custom: true,
						disabled: true,
						configError
					});
				}
			}
		}

		return Array.from(remotesMap.values());
	}
}

export class ConanRemoteError
	extends Error
	implements CfsPackageRemoteConfigError
{
	code: CfsPackageRemoteConfigErrorCode;
	cause?: unknown;

	constructor(
		code: CfsPackageRemoteConfigErrorCode,
		message?: string,
		options?: { cause?: unknown }
	) {
		super(message ?? code);
		this.name = "ConanRemoteError";
		this.code = code;
		if (options?.cause) {
			this.cause = options.cause;
		}
	}
}
