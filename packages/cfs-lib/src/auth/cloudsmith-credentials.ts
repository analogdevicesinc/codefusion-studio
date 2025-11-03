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

import {
	CfsApiClient,
	PackageRepository,
	RepositoryClient
} from "cfs-ccm-lib";
import type {
	CfsPackageRemoteCredential,
	CfsPackageRemoteCredentialProvider
} from "cfs-package-manager";

export class MyAnalogCloudsmithCredentialProvider
	implements CfsPackageRemoteCredentialProvider
{
	private readonly cloudsmithBaseUrl: string = ".cloudsmith.io/";
	private readonly repoClient: RepositoryClient;
	private readonly repoCache = new Map<string, PackageRepository>();

	public readonly name: string = "myAnalog";

	constructor(ccmClient: CfsApiClient) {
		this.repoClient = new RepositoryClient(ccmClient);
	}

	async getRemoteCredential(
		url: string
	): Promise<CfsPackageRemoteCredential | undefined> {
		let pkgRepo = this.repoCache.get(url);
		if (pkgRepo === undefined) {
			pkgRepo = await this.repoClient.getRepository(url);
			this.repoCache.set(url, pkgRepo);
		}
		const token = await pkgRepo.getToken();
		if (!token) return undefined;
		let repoPath = url.slice(
			url.lastIndexOf(this.cloudsmithBaseUrl) +
				this.cloudsmithBaseUrl.length
		);
		if (repoPath.endsWith("/")) repoPath = repoPath.slice(0, -1);

		return { user: repoPath, password: token };
	}

	async refreshRemoteCredential(url: string): Promise<void> {
		if (this.repoCache.has(url)) {
			const pkgRepo = this.repoCache.get(url);
			await pkgRepo?.refreshToken();
		}
	}
}
