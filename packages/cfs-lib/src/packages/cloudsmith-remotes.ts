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

import { CfsApiClient, RepositoryClient } from "cfs-ccm-lib";
import type { PackageRepository, SWPackageRepo } from "cfs-ccm-lib";
import type {
	CfsPackageRemotesProvider,
	CfsPackageRemoteCredentialProvider,
	CfsManagedPackageRemote,
	CfsPackageRemoteCredentialClient
} from "cfs-package-manager";
import { MyAnalogCloudsmithCredentialProvider } from "../auth/cloudsmith-credentials.js";

/**
 * Minimal interface for a repository info client, used to decouple
 * the provider from the concrete {@link RepositoryClient} class.
 */
export interface RepoInfoClient {
	getRepositoryInfo(opts?: {
		format?: string;
	}): Promise<SWPackageRepo[]>;
	getRepository(repoUrl: string): Promise<PackageRepository>;
}

/**
 * Provides managed Conan Cloudsmith remotes discovered through CCM, including
 * myAnalog-backed credentials for repositories that require authentication.
 */
export class MyAnalogConanCloudsmithRemotesProvider
	implements CfsPackageRemotesProvider
{
	private readonly repoClient: RepoInfoClient;
	private readonly credProvider: CfsPackageRemoteCredentialProvider;
	public readonly name: string = "myAnalog";
	#remotesCache:
		| (
				| (CfsManagedPackageRemote & { auth: { public: true } })
				| (CfsManagedPackageRemote & CfsPackageRemoteCredentialClient)
		  )[]
		| null = null;

	constructor(
		client: CfsApiClient | RepoInfoClient,
		credProvider?: CfsPackageRemoteCredentialProvider
	) {
		if (client instanceof CfsApiClient) {
			this.repoClient = new RepositoryClient(client);
		} else {
			this.repoClient = client;
		}
		this.credProvider =
			credProvider ??
			new MyAnalogCloudsmithCredentialProvider(client);
	}

	public async init() {
		// Ensure the provider supplies valid remotes
		await this.getRemotes();
	}

	public async getRemotes(): Promise<
		(
			| (CfsManagedPackageRemote & { auth: { public: true } })
			| (CfsManagedPackageRemote & CfsPackageRemoteCredentialClient)
		)[]
	> {
		try {
			const reposInfo = await this.repoClient.getRepositoryInfo({
				format: "conan"
			});

			const names = new Set<string>();
			const urls = new Set<string>();
			const remotes = reposInfo.map((repo) => {
				const remote = {
					name:
						(repo.repoName ? formatRepoName(repo.repoName) : "") ||
						formatRepoName(repo.repoUrl.replace(/^https?:\/\//, "")),
					url: new URL(repo.repoUrl),
					provider: this.name,
					custom: false as const,
					disabled: repo.disabledByDefault
				};

				// Ensure that remotes have unique names and URLs
				if (names.has(remote.name) || urls.has(remote.url.href)) {
					throw new Error(
						"Cloud package remotes contain duplicate names or URLs"
					);
				}
				names.add(remote.name);
				urls.add(remote.url.href);

				if (repo.authRequired) {
					return {
						...remote,
						auth: {
							public: false as const,
							credentialProvider: this.credProvider.name
						},
						getCredential: async () => {
							return await this.credProvider.getRemoteCredential(
								repo.repoUrl
							);
						},
						refreshCredential: async () => {
							await this.credProvider.refreshRemoteCredential(
								repo.repoUrl
							);
						}
					};
				}

				return { ...remote, auth: { public: true as const } };
			});

			if (remotes.length === 0) {
				throw new Error(
					"Cloud provider response did not contain any remotes"
				);
			}

			this.#remotesCache = remotes;
		} catch (error) {
			// Return the last successful result or
			// throw the error if no remotes have been cached yet
			if (!this.#remotesCache) {
				throw error;
			}
		}

		return this.#remotesCache;
	}
}

/**
 * Provides the default public Conan Cloudsmith remote when cloud-managed
 * repository metadata is unavailable.
 */
export class DefaultConanCloudsmithRemotesProvider
	implements CfsPackageRemotesProvider
{
	public readonly name: string = "default";

	public async getRemotes() {
		return Promise.resolve([
			{
				name: "cfs-public",
				url: new URL(
					"https://conan.cloudsmith.io/adi/codefusion-public"
				),
				provider: this.name,
				custom: false as const,
				disabled: false,
				auth: { public: true as const }
			}
		]);
	}
}

const formatRepoName = (name: string): string => {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/gi, "-")
		.replace(/^-|-$/g, "");
};
