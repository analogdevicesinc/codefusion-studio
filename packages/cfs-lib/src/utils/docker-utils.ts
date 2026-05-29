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

import { type CfsPackageRemoteCredential } from "cfs-package-manager";
import { execFile } from "child_process";
import { promisify } from "util";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { CfsApiClient } from "cfs-ccm-lib";
import { MyAnalogCloudsmithCredentialProvider } from "../auth/cloudsmith-credentials.js";
import {
	AuthConfig,
	SessionManager
} from "../auth/session-manager.js";

const execFileAsync = promisify(execFile);

export type SupportedUtils = "docker" | "podman";

export async function getContainerUtility(): Promise<SupportedUtils> {
	const utils: SupportedUtils[] = ["docker", "podman"];
	for (const cmd of utils) {
		try {
			await execFileAsync(cmd, ["images"], { timeout: 5000 });
			return cmd;
		} catch {
			continue;
		}
	}
	throw new Error(
		"No container utility found. Please install Docker or Podman."
	);
}

export async function containerImageExists(
	container: SupportedUtils,
	image: string
): Promise<boolean> {
	try {
		await execFileAsync(container, ["image", "inspect", image], {
			timeout: 3000
		});
		return true;
	} catch {
		return false;
	}
}

/**
 * Pull the specified Docker image using the specified container utility (docker or podman).
 * @param params - Object containing the image, registry, repository name, container utility, and optional credentials.
 * @returns Promise that resolves when the pull is complete.
 */
export async function pullImage(params: {
	image: string;
	registry: string;
	utility: SupportedUtils;
	creds?: CfsPackageRemoteCredential;
	quiet: boolean;
}): Promise<void> {
	const { image, registry, utility, creds, quiet } = params;

	// Create a tempdir and set DOCKER_CONFIG to it.
	const tmpDir = await fs.mkdtemp(
		path.join(os.tmpdir(), "cfs-docker-")
	);

	const env = { ...process.env };
	delete env.DOCKER_CONFIG;
	env.DOCKER_CONFIG = tmpDir;

	if (creds) {
		try {
			await new Promise<void>((resolve, reject) => {
				const child = spawn(
					utility,
					[
						"login",
						"--username",
						// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
						creds!.user,
						"--password-stdin",
						registry
					],
					{
						env,
						stdio: [
							"pipe",
							quiet ? "ignore" : "inherit",
							quiet ? "ignore" : "inherit"
						],
						windowsVerbatimArguments: process.platform === "win32",
						windowsHide: true
					}
				);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
				child.stdin!.write(creds!.password);
				// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
				child.stdin!.end();
				child.on("error", reject);
				child.on("close", (code) => {
					if (code === 0) {
						resolve();
					} else {
						reject(new Error(`Error code: ${String(code)}.`));
					}
				});
			});
		} catch (error) {
			// If we failed to login, clean up the temp dir and exit
			await fs.rm(tmpDir, { recursive: true, force: true });
			throw new Error(
				`Failed to login to registry. ${(error as Error).message}`
			);
		}
	}

	try {
		await new Promise<void>((resolve, reject) => {
			const child = spawn(utility, ["pull", image], {
				env,
				stdio: [
					"pipe",
					quiet ? "ignore" : "inherit",
					quiet ? "ignore" : "inherit"
				],
				windowsVerbatimArguments: process.platform === "win32",
				windowsHide: true
			});
			child.on("error", reject);
			child.on("close", (code) => {
				if (code === 0) {
					resolve();
				} else {
					reject(new Error(`Error code: ${String(code)}.`));
				}
			});
		});
	} catch (error) {
		throw new Error(
			`Failed to pull image. ${(error as Error).message}`
		);
	} finally {
		// Clean up the temporary folder after the pull is done
		await fs.rm(tmpDir, { recursive: true, force: true });
	}
}

/**
 * Extract the registry and repository name from a Docker image reference.
 * For example, given "docker.cloudsmith.io/adi/repo/image:tag", it will return:
 * { registry: "docker.cloudsmith.io", repo: "docker.cloudsmith.io/adi/repo/image" }
 * @param image - Docker image reference.
 * @returns Object containing the registry and repository name.
 */
export function extractRegistryAndRepoName(image: string): {
	registry: string;
	repo: string;
} {
	let repo = image.trim();

	// 1. Strip scheme if present
	// https://docker.cloudsmith.io/... -> docker.cloudsmith.io/...
	repo = repo.replace(/^https?:\/\//, "");

	// 2. Strip digest if present
	// repo@sha256:... -> repo
	const at = repo.indexOf("@");
	if (at >= 0) {
		repo = repo.slice(0, at);
	}

	// 3. Strip tag if present
	// repo:tag -> repo
	const lastColon = repo.lastIndexOf(":");
	const lastSlash = repo.lastIndexOf("/");

	// Only treat ':' as a tag separator if it appears *after* the last '/'
	if (lastColon > lastSlash) {
		repo = repo.slice(0, lastColon);
	}

	const registry = repo.split("/")[0];
	return { registry, repo };
}

async function getCredentialProvider(
	authConfig: AuthConfig
): Promise<MyAnalogCloudsmithCredentialProvider | undefined> {
	const session = await new SessionManager(authConfig).getSession();

	if (session) {
		return new MyAnalogCloudsmithCredentialProvider(
			new CfsApiClient({
				baseUrl: authConfig.ccmUrl,
				authorizer: session.authorizer
			})
		);
	}

	return undefined;
}

export async function getCredentials(
	repo: string,
	authConfig: AuthConfig,
	quiet = false
): Promise<CfsPackageRemoteCredential | undefined> {
	const credentialProvider = await getCredentialProvider(authConfig);

	if (!credentialProvider) {
		!quiet &&
			console.warn(
				"Unable to check for credentials. Not logged in to myAnalog."
			);
		return;
	}

	try {
		const creds = await credentialProvider.getRemoteCredential(
			"https://" + repo
		);
		return creds;
	} catch {
		return undefined;
	}
}
