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
	private readonly cloudsmithDomain: string = ".cloudsmith.io";
	private readonly repoClient: RepositoryClient;
	private readonly repoCache = new Map<string, PackageRepository>();

	public static readonly name: string = "myAnalog";
	public readonly name: string =
		MyAnalogCloudsmithCredentialProvider.name;

	constructor(ccmClient: CfsApiClient) {
		this.repoClient = new RepositoryClient(ccmClient);
	}

	async getRemoteCredential(
		url: string
	): Promise<CfsPackageRemoteCredential | undefined> {
		if (!URL.canParse(url)) {
			return undefined;
		}
		const parsedUrl = new URL(url);
		const repoPath = parsedUrl.pathname
			.split("/")
			.filter(Boolean) // filter(Boolean) removes empty segments caused by leading/trailing slashes
			.slice(0, 2);
		if (
			!parsedUrl.hostname.endsWith(this.cloudsmithDomain) || // Not a cloudsmith URL
			repoPath.length < 2 // Not enough path segments to determine user/repo
		) {
			return undefined;
		}
		let pkgRepo = this.repoCache.get(url);
		if (pkgRepo === undefined) {
			pkgRepo = await this.repoClient.getRepository(url);
			this.repoCache.set(url, pkgRepo);
		}
		const token = await pkgRepo.getToken();
		if (!token) return undefined;

		return {
			user: repoPath.join("/"),
			password: token
		};
	}

	async refreshRemoteCredential(url: string): Promise<void> {
		if (this.repoCache.has(url)) {
			const pkgRepo = this.repoCache.get(url);
			await pkgRepo?.refreshToken();
		}
	}
}
