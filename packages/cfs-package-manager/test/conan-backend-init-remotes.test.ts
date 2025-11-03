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

import { expect } from "chai";
import fs from "node:fs/promises";
import path from "node:path";
import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";

interface ConanRemote {
	name: string;
	url: string;
	verify_ssl: boolean;
	enabled?: boolean;
}

interface ConanRemoteConfig {
	name: string;
	url: string;
	provider?: string; // credential provider
}

interface RemotesFileContent {
	remotes: ConanRemote[];
}

describe("ConanPkgManager init method - custom and managed remotes scenarios", function () {
	const testCacheDir = path.join(process.cwd(), "test_cache_init");
	const testConanHome = path.join(testCacheDir, "conan");
	const remotesFilePath = path.join(testConanHome, "remotes.json");
	const customRemotesFilePath = path.join(
		testConanHome,
		"customRemotes.json"
	);

	async function cleanCache() {
		await fs.rm(testCacheDir, {
			recursive: true,
			force: true
		});
	}

	async function createRemotesFile(remotes: ConanRemote[]) {
		await fs.mkdir(testConanHome, { recursive: true });
		await fs.writeFile(
			remotesFilePath,
			JSON.stringify({ remotes }, null, 2),
			"utf-8"
		);
	}

	async function createCustomRemotesFile(
		remotes: ConanRemoteConfig[]
	) {
		await fs.mkdir(testConanHome, { recursive: true });
		await fs.writeFile(
			customRemotesFilePath,
			JSON.stringify({ remotes }, null, 2),
			"utf-8"
		);
	}

	async function createRemotesFileFromString(content: string) {
		await fs.mkdir(testConanHome, { recursive: true });
		await fs.writeFile(remotesFilePath, content, "utf-8");
	}

	async function readRemotesFile(): Promise<RemotesFileContent> {
		const content = await fs.readFile(remotesFilePath, "utf-8");
		return JSON.parse(content) as RemotesFileContent;
	}

	beforeEach(cleanCache);
	after(cleanCache);

	describe("when no customRemotes.json or remotes.json exists", () => {
		it("should create remotes.json with CFS required remotes only", async function () {
			const api = new ConanPkgManager({
				conanHome: testConanHome,
				indexDir: testCacheDir
			});

			await api.init({ initRemotes: true });

			const remotes = await readRemotesFile();
			expect(remotes.remotes).to.have.lengthOf(2);
			expect(remotes.remotes).to.deep.include({
				name: "cfs-public",
				url: "https://conan.cloudsmith.io/adi/codefusion-public",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "cfs-restricted",
				url: "https://conan.cloudsmith.io/adi/codefusion-restricted",
				verify_ssl: true,
				disabled: true
			});
		});
	});

	describe("when customRemotes.json exists with different remotes", () => {
		it("should merge existing remotes with CFS required remotes", async function () {
			// Create existing remotes
			await createCustomRemotesFile([
				{
					name: "custom-repo",
					url: "https://example.com/conan"
				},
				{
					name: "another-repo",
					url: "https://another.example.com/conan"
				}
			]);

			const api = new ConanPkgManager({
				conanHome: testConanHome,
				indexDir: testCacheDir
			});

			await api.init({ initRemotes: true });

			const remotes = await readRemotesFile();
			expect(remotes.remotes).to.have.lengthOf(4);

			// Should contain all original remotes
			expect(remotes.remotes).to.deep.include({
				name: "custom-repo",
				url: "https://example.com/conan",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "another-repo",
				url: "https://another.example.com/conan",
				verify_ssl: true
			});

			// Should contain CFS required remote
			expect(remotes.remotes).to.deep.include({
				name: "cfs-public",
				url: "https://conan.cloudsmith.io/adi/codefusion-public",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "cfs-restricted",
				url: "https://conan.cloudsmith.io/adi/codefusion-restricted",
				verify_ssl: true,
				disabled: true
			});
		});
	});

	describe("when customRemotes.json has duplicate remote name with CFS required", () => {
		it("should prioritize CFS required remote configuration", async function () {
			// Create existing remote with same name as CFS required but different config
			await createCustomRemotesFile([
				{
					name: "cfs-public",
					url: "https://old-url.example.com/conan"
				},
				{
					name: "custom-repo",
					url: "https://example.com/conan"
				}
			]);

			const api = new ConanPkgManager({
				conanHome: testConanHome,
				indexDir: testCacheDir
			});

			await api.init({ initRemotes: true });

			const remotes = await readRemotesFile();
			expect(remotes.remotes).to.have.lengthOf(3);

			// Should contain the custom repo unchanged
			expect(remotes.remotes).to.deep.include({
				name: "custom-repo",
				url: "https://example.com/conan",
				verify_ssl: true
			});

			// Should contain CFS required remote with its configuration (not the old one)
			expect(remotes.remotes).to.deep.include({
				name: "cfs-public",
				url: "https://conan.cloudsmith.io/adi/codefusion-public",
				verify_ssl: true
			});

			// Verify old configuration is overwritten
			const cfsPublic = remotes.remotes.find(
				(r: ConanRemote) => r.name === "cfs-public"
			);
			expect(cfsPublic).to.not.be.undefined;
			if (cfsPublic) {
				expect(cfsPublic.url).to.not.equal(
					"https://old-url.example.com/conan"
				);
			}
		});
	});

	describe("when existing remotes.json is empty", () => {
		it("should handle empty remotes array", async function () {
			await createRemotesFile([]);

			const api = new ConanPkgManager({
				conanHome: testConanHome,
				indexDir: testCacheDir
			});

			await api.init({ initRemotes: true });

			const remotes = await readRemotesFile();
			expect(remotes.remotes).to.have.lengthOf(2);
			expect(remotes.remotes).to.deep.include({
				name: "cfs-public",
				url: "https://conan.cloudsmith.io/adi/codefusion-public",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "cfs-restricted",
				url: "https://conan.cloudsmith.io/adi/codefusion-restricted",
				verify_ssl: true,
				disabled: true
			});
		});
	});

	describe("when init is called multiple times", () => {
		it("should be idempotent and not duplicate remotes", async function () {
			const api = new ConanPkgManager({
				conanHome: testConanHome,
				indexDir: testCacheDir
			});

			// First init
			await api.init({ initRemotes: true });
			let remotes = await readRemotesFile();
			expect(remotes.remotes).to.have.lengthOf(2);

			// Second init
			await api.init({ initRemotes: true });
			remotes = await readRemotesFile();
			expect(remotes.remotes).to.have.lengthOf(2);
			expect(remotes.remotes).to.deep.include({
				name: "cfs-public",
				url: "https://conan.cloudsmith.io/adi/codefusion-public",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "cfs-restricted",
				url: "https://conan.cloudsmith.io/adi/codefusion-restricted",
				verify_ssl: true,
				disabled: true
			});
		});

		it("should preserve user-added remotes across multiple inits", async function () {
			// Create initial user remote
			await createCustomRemotesFile([
				{
					name: "persistent-repo",
					url: "https://persistent.example.com/conan"
				}
			]);

			const api = new ConanPkgManager({
				conanHome: testConanHome,
				indexDir: testCacheDir
			});

			// First init
			await api.init({ initRemotes: true });
			let remotes = await readRemotesFile();
			expect(remotes.remotes).to.have.lengthOf(3);

			// Add another user remote
			await api.addRemote(
				"user-added",
				"https://user-added.example.com/conan"
			);

			// Second init
			await api.init({ initRemotes: true });
			remotes = await readRemotesFile();
			expect(remotes.remotes).to.have.lengthOf(4);

			// All remotes should still be there
			expect(remotes.remotes).to.deep.include({
				name: "persistent-repo",
				url: "https://persistent.example.com/conan",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "user-added",
				url: "https://user-added.example.com/conan",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "cfs-public",
				url: "https://conan.cloudsmith.io/adi/codefusion-public",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "cfs-restricted",
				url: "https://conan.cloudsmith.io/adi/codefusion-restricted",
				verify_ssl: true,
				disabled: true
			});
		});
	});

	describe("when remotes.json contains duplicates", () => {
		it("should handle duplicate remote names within existing remotes", async function () {
			await createRemotesFileFromString(
				JSON.stringify(
					{
						remotes: [
							{
								name: "duplicate-repo",
								url: "https://first.example.com/conan",
								verify_ssl: true
							},
							{
								name: "duplicate-repo", // Same name
								url: "https://second.example.com/conan",
								verify_ssl: true
							},
							{
								name: "unique-repo",
								url: "https://unique.example.com/conan",
								verify_ssl: true
							}
						]
					},
					null,
					2
				)
			);

			await createCustomRemotesFile([
				{
					name: "duplicate-repo",
					url: "https://first.example.com/conan"
				},
				{
					name: "duplicate-repo", // Same name
					url: "https://second.example.com/conan"
				},
				{
					name: "unique-repo",
					url: "https://unique.example.com/conan"
				}
			]);

			const api = new ConanPkgManager({
				conanHome: testConanHome,
				indexDir: testCacheDir
			});

			await api.init({ initRemotes: true });

			const remotes = await readRemotesFile();

			// Should have unique repo, one version of duplicate repo, cfs-public, and cfs-restricted
			expect(remotes.remotes).to.have.lengthOf(4);

			// Should contain CFS required remotes
			expect(remotes.remotes).to.deep.include({
				name: "cfs-public",
				url: "https://conan.cloudsmith.io/adi/codefusion-public",
				verify_ssl: true
			});
			expect(remotes.remotes).to.deep.include({
				name: "cfs-restricted",
				url: "https://conan.cloudsmith.io/adi/codefusion-restricted",
				verify_ssl: true,
				disabled: true
			});

			// Should contain unique repo
			expect(remotes.remotes).to.deep.include({
				name: "unique-repo",
				url: "https://unique.example.com/conan",
				verify_ssl: true
			});

			// Should contain only one version of duplicate repo
			const duplicateRepos = remotes.remotes.filter(
				(r) => r.name === "duplicate-repo"
			);
			expect(duplicateRepos).to.have.lengthOf(1);
			expect(duplicateRepos[0]).to.deep.include({
				name: "duplicate-repo",
				url: "https://second.example.com/conan",
				verify_ssl: true
			});
		});
	});

	describe("when conan home path contains special characters", () => {
		it("should handle paths with spaces", async function () {
			const specialTestDir = path.join(
				process.cwd(),
				"test_cache with spaces"
			);
			const specialConanHome = path.join(specialTestDir, "conan");
			const specialRemotesPath = path.join(
				specialConanHome,
				"remotes.json"
			);

			const api = new ConanPkgManager({
				conanHome: specialConanHome,
				indexDir: specialTestDir
			});

			try {
				await api.init({ initRemotes: true });

				// Verify file exists and is readable
				const remotes = JSON.parse(
					await fs.readFile(specialRemotesPath, "utf-8")
				) as RemotesFileContent;

				expect(remotes.remotes).to.have.lengthOf(2);
				expect(remotes.remotes).to.deep.include({
					name: "cfs-public",
					url: "https://conan.cloudsmith.io/adi/codefusion-public",
					verify_ssl: true
				});
				expect(remotes.remotes).to.deep.include({
					name: "cfs-restricted",
					url: "https://conan.cloudsmith.io/adi/codefusion-restricted",
					verify_ssl: true,
					disabled: true
				});
			} finally {
				// Cleanup special directory
				await fs.rm(specialTestDir, { recursive: true, force: true });
			}
		});
	});
});
