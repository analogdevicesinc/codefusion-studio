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

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "node:fs/promises";
import path from "node:path";
import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";
import type {
	CfsManagedPackageRemote,
	CfsPackageRemoteCredential,
	CfsPackageRemoteCredentialClient,
	CfsPackageRemotesProvider
} from "../src/index.js";

use(chaiAsPromised);

interface ConanRemoteConfig {
	name: string;
	url: string;
	provider?: string;
}

interface UserRemoteConfig {
	name: string;
	disabled: boolean;
}

interface RemotesJson {
	remotes: { name: string; url: string }[];
}

type ManagedProviderRemote =
	| (CfsManagedPackageRemote & { auth: { public: true } })
	| (CfsManagedPackageRemote & CfsPackageRemoteCredentialClient);

const conanURL = `http://${process.env.CONAN_SERVER_HOST ?? "localhost"}:${process.env.CONAN_SERVER_PORT ?? "9300"}`;

class MockCfsRemotesProvider implements CfsPackageRemotesProvider {
	public readonly name = "mock-remotes-provider";

	private remotes: ManagedProviderRemote[] = [];

	public getRemotesCalls = 0;

	setRemotes(remotes: ManagedProviderRemote[]): void {
		this.remotes = remotes;
	}

	async getRemotes(): Promise<ManagedProviderRemote[]> {
		this.getRemotesCalls += 1;
		return Promise.resolve(this.remotes);
	}
}

class MockCredentialClient
	implements CfsPackageRemoteCredentialClient
{
	public readonly auth: { public: false; credentialProvider: string };

	public getCredentialCalls = 0;
	public refreshCredentialCalls = 0;

	constructor(
		providerName: string,
		private readonly credential?: CfsPackageRemoteCredential,
		private readonly options: {
			throwOnGetCredential?: boolean;
		} = {}
	) {
		this.auth = { public: false, credentialProvider: providerName };
	}

	async getCredential(): Promise<
		CfsPackageRemoteCredential | undefined
	> {
		this.getCredentialCalls += 1;
		if (this.options.throwOnGetCredential) {
			throw new Error("Failed to fetch remote credential");
		}
		return Promise.resolve(this.credential);
	}

	async refreshCredential(): Promise<void> {
		this.refreshCredentialCalls += 1;
		return Promise.resolve();
	}
}

function managedRemote(
	name: string,
	url: string,
	disabled = false
): CfsManagedPackageRemote & { auth: { public: true } } {
	return {
		name,
		url: new URL(url),
		provider: "mock-remotes-provider",
		custom: false,
		disabled,
		auth: { public: true }
	};
}

function managedRemoteWithAuth(
	name: string,
	url: string,
	credentialClient: MockCredentialClient,
	disabled = false
): CfsManagedPackageRemote & CfsPackageRemoteCredentialClient {
	return {
		...managedRemote(name, url, disabled),
		auth: {
			public: false,
			credentialProvider: credentialClient.auth.credentialProvider
		},
		getCredential: () => credentialClient.getCredential(),
		refreshCredential: () => credentialClient.refreshCredential()
	};
}

describe("ConanRemotesManager - provider-based and user-custom remotes", function () {
	const testCacheDir = path.join(
		process.cwd(),
		"test_cache_remotes_provider"
	);
	const testConanHome = path.join(testCacheDir, "conan");
	const remotesFilePath = path.join(testConanHome, "remotes.json");
	const customRemotesFilePath = path.join(
		testConanHome,
		"customRemotes.json"
	);
	const userRemotesConfigPath = path.join(
		testConanHome,
		"userRemotesCfg.json"
	);

	async function cleanCache() {
		await fs.rm(testCacheDir, {
			recursive: true,
			force: true
		});
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

	async function readJsonFile<T>(
		filePath: string
	): Promise<T | undefined> {
		try {
			const content = await fs.readFile(filePath, "utf-8");
			return JSON.parse(content) as T;
		} catch (err) {
			if ((err as NodeJS.ErrnoException).code === "ENOENT") {
				return undefined;
			}
			throw err;
		}
	}

	async function createApiWithProvider(
		provider: MockCfsRemotesProvider
	) {
		const api = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await api.registerRemotesProvider(provider);
		return api;
	}

	beforeEach(cleanCache);
	after(cleanCache);

	describe("initialization with provider remotes", () => {
		it("should initialize remotes.json from provider remotes", async function () {
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote("cfs-public", "https://example.com/public"),
				managedRemote(
					"cfs-restricted",
					"https://example.com/restricted",
					true
				)
			]);

			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			const remotesJson =
				await readJsonFile<RemotesJson>(remotesFilePath);
			expect(remotesJson).to.not.equal(undefined);
			expect(remotesJson?.remotes.map((r) => r.name)).to.have.members(
				["cfs-public", "cfs-restricted"]
			);

			const listedRemotes = await api.listRemotes();
			expect(listedRemotes).to.have.lengthOf(2);
			expect(
				listedRemotes.find((r) => r.name === "cfs-public")?.disabled
			).to.equal(false);
			expect(
				listedRemotes.find((r) => r.name === "cfs-restricted")
					?.disabled
			).to.equal(true);
		});

		it("should keep managed remotes disabled when disabled by default and user config does not override", async function () {
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"disabled-by-default",
					"https://example.com/disabled",
					true
				)
			]);

			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			const remotes = await api.listRemotes();
			expect(remotes).to.have.lengthOf(1);
			expect(remotes[0].name).to.equal("disabled-by-default");
			expect(remotes[0].disabled).to.equal(true);
		});

		it("should initialize remotes lazily for remote operations but not for local-only list", async function () {
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote("lazy-managed", "https://lazy.example.com/repo")
			]);

			const api = await createApiWithProvider(provider);

			// Default init does not initialize remotes.
			await api.init();
			expect(provider.getRemotesCalls).to.equal(0);

			// Local package listing should remain local-only.
			await api.list();
			expect(provider.getRemotesCalls).to.equal(0);

			// A remote operation should trigger lazy remotes initialization.
			await api.listRemotes();
			expect(provider.getRemotesCalls).to.be.greaterThan(0);
		});

		it("should preserve user-enabled state for disabled-by-default managed remotes across reinitialization", async function () {
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"managed-default-disabled",
					"https://persist-enabled.example.com/repo",
					true
				)
			]);

			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });
			await api.enableRemote("managed-default-disabled");

			// Simulate next session to force remotes initialization again.
			const apiNextSession = await createApiWithProvider(provider);
			await apiNextSession.init({ initRemotes: true });

			const remotes = await apiNextSession.listRemotes();
			expect(remotes).to.have.lengthOf(1);
			expect(remotes[0].name).to.equal("managed-default-disabled");
			expect(remotes[0].disabled).to.equal(false);
		});

		it("should remove managed remotes when provider is unregistered and leave custom remotes intact", async function () {
			await createCustomRemotesFile([
				{
					name: "custom-persists",
					url: "https://custom-persists.example.com/repo"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"managed-to-remove",
					"https://managed-remove.example.com/repo"
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			let remotes = await api.listRemotes();
			expect(remotes.map((r) => r.name)).to.include.members([
				"custom-persists",
				"managed-to-remove"
			]);

			await api.unregisterRemotesProvider();

			remotes = await api.listRemotes();
			expect(remotes.map((r) => r.name)).to.include(
				"custom-persists"
			);
			expect(remotes.map((r) => r.name)).to.not.include(
				"managed-to-remove"
			);
		});

		it("should swap managed remotes when provider is replaced and leave custom remotes intact", async function () {
			await createCustomRemotesFile([
				{
					name: "custom-persists",
					url: "https://custom-persists2.example.com/repo"
				}
			]);

			const firstProvider = new MockCfsRemotesProvider();
			firstProvider.setRemotes([
				managedRemote(
					"first-managed",
					"https://first-managed.example.com/repo"
				)
			]);
			const api = await createApiWithProvider(firstProvider);
			await api.init({ initRemotes: true });

			let remotes = await api.listRemotes();
			expect(remotes.map((r) => r.name)).to.include.members([
				"custom-persists",
				"first-managed"
			]);

			const secondProvider = new MockCfsRemotesProvider();
			secondProvider.setRemotes([
				managedRemote(
					"second-managed",
					"https://second-managed.example.com/repo"
				)
			]);
			await api.registerRemotesProvider(secondProvider);

			remotes = await api.listRemotes();
			expect(remotes.map((r) => r.name)).to.include.members([
				"custom-persists",
				"second-managed"
			]);
			expect(remotes.map((r) => r.name)).to.not.include(
				"first-managed"
			);
		});
	});

	describe("migration from older installs", () => {
		it("should keep provider-tagged legacy custom entries but ignore them when resolving remotes", async function () {
			await createCustomRemotesFile([
				{
					name: "old-custom-with-provider",
					url: "https://provider-custom.example.com/repo",
					provider: "legacy-provider"
				},
				{
					name: "legacy-managed",
					url: "https://legacy.example.com/repo",
					provider: "legacy-provider"
				},
				{
					name: "plain-custom",
					url: "https://custom.example.com/repo"
				},
				{
					name: "plain-custom",
					url: "https://custom.example.com/repo"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"provider-one",
					"https://provider1.example.com/repo"
				),
				managedRemote(
					"provider-two",
					"https://provider2.example.com/repo",
					true
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			const customFile = await readJsonFile<{
				remotes: ConanRemoteConfig[];
			}>(customRemotesFilePath);
			expect(customFile).to.not.equal(undefined);
			expect(customFile?.remotes.map((r) => r.name)).to.have.members([
				"plain-custom",
				"legacy-managed",
				"old-custom-with-provider"
			]);
			expect(
				customFile?.remotes.find((r) => r.name === "legacy-managed")
					?.provider
			).to.equal("legacy-provider");
			expect(
				customFile?.remotes.find(
					(r) => r.name === "old-custom-with-provider"
				)?.provider
			).to.equal("legacy-provider");
			expect(
				customFile?.remotes.find((r) => r.name === "plain-custom")
					?.provider
			).to.equal(undefined);

			const remotesJson =
				await readJsonFile<RemotesJson>(remotesFilePath);
			expect(remotesJson?.remotes.map((r) => r.name)).to.have.members(
				["provider-one", "provider-two", "plain-custom"]
			);

			const remotes = await api.listRemotes();
			expect(remotes.map((r) => r.name)).to.include.members([
				"provider-one",
				"provider-two",
				"plain-custom"
			]);
			expect(remotes.map((r) => r.name)).to.not.include(
				"legacy-managed"
			);
			expect(remotes.map((r) => r.name)).to.not.include(
				"old-custom-with-provider"
			);
		});

		it("should replace custom remote when provider returns same name", async function () {
			await createCustomRemotesFile([
				{
					name: "shared-name",
					url: "https://custom.example.com/old"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"shared-name",
					"https://provider.example.com/new"
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			const remotes = await api.listRemotes();
			expect(remotes).to.have.lengthOf(1);
			expect(remotes[0].name).to.equal("shared-name");
			expect(remotes[0].url.toString()).to.equal(
				"https://provider.example.com/new"
			);
			expect(remotes[0].custom).to.equal(false);
		});

		it("should replace same-url custom remote with managed and explicitly enable managed remote", async function () {
			await createCustomRemotesFile([
				{
					name: "custom-shared-url",
					url: "https://same-url.example.com/repo"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"managed-same-url",
					"https://same-url.example.com/repo",
					true
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			const remotes = await api.listRemotes();
			expect(remotes).to.have.lengthOf(1);
			expect(remotes[0].name).to.equal("managed-same-url");
			expect(remotes[0].disabled).to.equal(false);

			const userCfg = await readJsonFile<
				Record<string, UserRemoteConfig>
			>(userRemotesConfigPath);
			expect(userCfg).to.not.equal(undefined);
			expect(userCfg?.["managed-same-url"]?.disabled).to.equal(false);
		});
	});

	describe("enable, disable and add/remove constraints", () => {
		it("should enable and disable both managed and custom remotes", async function () {
			await createCustomRemotesFile([
				{
					name: "custom-toggle",
					url: "https://custom-toggle.example.com/repo"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"managed-toggle",
					"https://managed-toggle.example.com/repo"
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await api.disableRemote("managed-toggle");
			await api.disableRemote("custom-toggle");

			let remotes = await api.listRemotes();
			expect(
				remotes.find((r) => r.name === "managed-toggle")?.disabled
			).to.equal(true);
			expect(
				remotes.find((r) => r.name === "custom-toggle")?.disabled
			).to.equal(true);

			await api.enableRemote("managed-toggle");
			await api.enableRemote("custom-toggle");

			remotes = await api.listRemotes();
			expect(
				remotes.find((r) => r.name === "managed-toggle")?.disabled
			).to.equal(false);
			expect(
				remotes.find((r) => r.name === "custom-toggle")?.disabled
			).to.equal(false);
		});

		it("should keep only one active remote when custom and managed share URL after migration", async function () {
			await createCustomRemotesFile([
				{
					name: "custom-dup-url",
					url: "https://dup-url.example.com/repo"
				}
			]);
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"managed-dup-url",
					"https://dup-url.example.com/repo"
				)
			]);

			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			const remotes = await api.listRemotes();
			expect(remotes).to.have.lengthOf(1);
			expect(remotes[0].name).to.equal("managed-dup-url");
			expect(remotes[0].disabled).to.equal(false);
		});

		it("should reject adding custom remote when another active remote already has the same URL", async function () {
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"managed-active",
					"https://shared-active.example.com/repo"
				)
			]);

			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await expect(
				api.addRemote(
					"new-custom",
					"https://shared-active.example.com/repo"
				)
			).to.be.rejectedWith(/already exists/i);
		});

		it("should allow adding custom remote with duplicate URL when existing remotes with that URL are disabled", async function () {
			await createCustomRemotesFile([
				{
					name: "existing-disabled",
					url: "https://shared-disabled.example.com/repo"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			// Reject while the existing remote is still active.
			await expect(
				api.addRemote(
					"new-enabled",
					"https://shared-disabled.example.com/repo"
				)
			).to.be.rejectedWith(/already exists/i);

			// Disable the existing remote, then the add should succeed.
			await api.disableRemote("existing-disabled");

			await api.addRemote(
				"new-enabled",
				"https://shared-disabled.example.com/repo"
			);

			const remotes = await api.listRemotes();
			expect(remotes.map((r) => r.name)).to.include.members([
				"existing-disabled",
				"new-enabled"
			]);
			expect(
				remotes.find((r) => r.name === "existing-disabled")?.disabled
			).to.equal(true);
			expect(
				remotes.find((r) => r.name === "new-enabled")?.disabled
			).to.equal(false);
		});

		it("should reject enabling a remote if another active remote already has the same URL", async function () {
			await createCustomRemotesFile([
				{
					name: "first-active",
					url: "https://enable-conflict.example.com/repo"
				},
				{
					name: "second-disabled",
					url: "https://enable-conflict.example.com/repo"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });
			await api.disableRemote("second-disabled");

			await expect(
				api.enableRemote("second-disabled")
			).to.be.rejectedWith(/already exists/i);
		});

		it("should reject adding custom remote when name already exists even if existing remote is disabled", async function () {
			await createCustomRemotesFile([
				{
					name: "existing-custom",
					url: "https://existing-custom.example.com/repo"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });
			await api.disableRemote("existing-custom");

			await expect(
				api.addRemote(
					"existing-custom",
					"https://new-url.example.com/repo"
				)
			).to.be.rejectedWith(/already exists/i);
		});

		it("should reject deleting a managed remote", async function () {
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"managed-read-only",
					"https://readonly.example.com/repo"
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await expect(
				api.deleteRemote("managed-read-only")
			).to.be.rejectedWith(/Only custom remotes can be deleted/i);
		});

		it("should reject custom remote names with characters other than letters, numbers, underscores and hyphens", async function () {
			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await expect(
				api.addRemote(
					"name with space",
					"https://namecheck.example.com/repo"
				)
			).to.be.rejectedWith(
				/letters, numbers, underscores, and hyphens/i
			);
		});

		it("should accept custom remote names with letters, numbers, underscores and hyphens", async function () {
			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await api.addRemote(
				"valid_name_123",
				"https://valid-name.example.com/repo"
			);
			await api.addRemote(
				"valid-name-456",
				"https://valid-name-hyphen.example.com/repo"
			);

			const remotes = await api.listRemotes();
			expect(remotes.map((r) => r.name)).to.include("valid_name_123");
			expect(remotes.map((r) => r.name)).to.include("valid-name-456");
		});

		it("should reject adding custom remotes with invalid URLs", async function () {
			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await expect(
				api.addRemote("valid_name", "notaurl")
			).to.be.rejectedWith(/Invalid URL/i);
		});

		it("should overwrite provider-tagged legacy custom entry when adding a new custom remote with the same name", async function () {
			await createCustomRemotesFile([
				{
					name: "legacy-name",
					url: "https://legacy-name.example.com/old",
					provider: "legacy-provider"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await api.addRemote(
				"legacy-name",
				"https://legacy-name.example.com/new"
			);

			const customFile = await readJsonFile<{
				remotes: ConanRemoteConfig[];
			}>(customRemotesFilePath);
			expect(customFile).to.not.equal(undefined);

			expect(
				customFile?.remotes.filter((r) => r.name === "legacy-name")
			).to.have.lengthOf(1);
			expect(
				customFile?.remotes.find((r) => r.name === "legacy-name")?.url
			).to.equal("https://legacy-name.example.com/new");
			expect(
				customFile?.remotes.find((r) => r.name === "legacy-name")
					?.provider
			).to.equal(undefined);
		});

		it("should overwrite provider-tagged legacy custom entry when adding a new custom remote with the same URL", async function () {
			await createCustomRemotesFile([
				{
					name: "legacy-url-name",
					url: "https://legacy-url.example.com/repo",
					provider: "legacy-provider"
				}
			]);

			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await api.addRemote(
				"new-name",
				"https://legacy-url.example.com/repo"
			);

			const customFile = await readJsonFile<{
				remotes: ConanRemoteConfig[];
			}>(customRemotesFilePath);
			expect(customFile).to.not.equal(undefined);

			expect(
				customFile?.remotes.find((r) => r.name === "legacy-url-name")
			).to.equal(undefined);
			expect(
				customFile?.remotes.filter(
					(r) => r.url === "https://legacy-url.example.com/repo"
				)
			).to.have.lengthOf(1);
			expect(
				customFile?.remotes.find((r) => r.name === "new-name")
					?.provider
			).to.equal(undefined);
		});
	});

	describe("authentication behavior", () => {
		it("should call managed credential provider methods during initialization", async function () {
			const credentialClient = new MockCredentialClient(
				"managed-auth-provider",
				{
					user: "test_user",
					password: "test_password"
				}
			);
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemoteWithAuth(
					"managed-auth",
					conanURL,
					credentialClient
				)
			]);

			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			expect(provider.getRemotesCalls).to.be.greaterThan(0);
			expect(credentialClient.getCredentialCalls).to.be.greaterThan(
				0
			);
			expect(credentialClient.refreshCredentialCalls).to.equal(0);
		});

		it("should reject manual auth changes on managed remotes", async function () {
			const credentialClient = new MockCredentialClient(
				"managed-auth-provider",
				{
					user: "test_user",
					password: "test_password"
				}
			);
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemoteWithAuth(
					"managed-auth-read-only",
					conanURL,
					credentialClient
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await expect(
				api.login("managed-auth-read-only", "user", "password")
			).to.be.rejectedWith(
				/Cannot set credentials for default remote .*/i
			);
			await expect(
				api.logout("managed-auth-read-only")
			).to.be.rejectedWith(
				/Cannot set credentials for default remote .*/i
			);
		});

		it("should report provider auth failures via listRemotes configError", async function () {
			const failingCredentialClient = new MockCredentialClient(
				"managed-auth-provider",
				undefined,
				{ throwOnGetCredential: true }
			);
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemoteWithAuth(
					"managed-auth-failing",
					conanURL,
					failingCredentialClient
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			const remotes = await api.listRemotes();
			const remote = remotes.find(
				(r) => r.name === "managed-auth-failing"
			);
			expect(remote?.configError?.code).to.equal(
				"REMOTE_AUTH_FAILED"
			);
			expect((remote?.configError?.cause as Error).message).to.match(
				/Failed to fetch remote credential/i
			);
		});

		it("should clear configError when remote auth later succeeds", async function () {
			const failingCredentialClient = new MockCredentialClient(
				"managed-auth-provider",
				undefined,
				{ throwOnGetCredential: true }
			);
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemoteWithAuth(
					"managed-auth-recovers",
					conanURL,
					failingCredentialClient
				)
			]);
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			let remotes = await api.listRemotes();
			expect(
				remotes.find((r) => r.name === "managed-auth-recovers")
					?.configError?.code
			).to.equal("REMOTE_AUTH_FAILED");

			const workingCredentialClient = new MockCredentialClient(
				"managed-auth-provider",
				{
					user: "test_user",
					password: "test_password"
				}
			);
			provider.setRemotes([
				managedRemoteWithAuth(
					"managed-auth-recovers",
					conanURL,
					workingCredentialClient
				)
			]);

			remotes = await api.listRemotes();
			expect(
				remotes.find((r) => r.name === "managed-auth-recovers")
					?.configError
			).to.equal(undefined);
		});

		it("should reject auth changes on disabled custom remotes", async function () {
			await createCustomRemotesFile([
				{ name: "disabled-custom-auth", url: conanURL }
			]);
			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });
			await api.disableRemote("disabled-custom-auth");

			await expect(
				api.login(
					"disabled-custom-auth",
					"test_user",
					"test_password"
				)
			).to.be.rejectedWith(/is disabled/i);
			await expect(
				api.logout("disabled-custom-auth")
			).to.be.rejectedWith(/is disabled/i);
		});

		it("should allow custom remote manual auth and clearing auth", async function () {
			await createCustomRemotesFile([
				{ name: "custom-auth", url: conanURL }
			]);
			const provider = new MockCfsRemotesProvider();
			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			await api.login("custom-auth", "test_user", "test_password");

			let remotes = await api.listRemotes();
			expect(
				remotes.find((r) => r.name === "custom-auth")?.auth
			).to.deep.equal({
				public: false,
				username: "test_user"
			});

			await api.logout("custom-auth");

			remotes = await api.listRemotes();
			expect(
				remotes.find((r) => r.name === "custom-auth")?.auth
			).to.deep.equal({ public: true });
		});
	});

	describe("conan config updates", () => {
		it("should write remotes.json with expected managed and custom remotes on initialization", async function () {
			await createCustomRemotesFile([
				{
					name: "custom-config-check",
					url: "https://custom-config.example.com/repo"
				}
			]);
			const provider = new MockCfsRemotesProvider();
			provider.setRemotes([
				managedRemote(
					"managed-config-check",
					"https://managed-config.example.com/repo"
				)
			]);

			const api = await createApiWithProvider(provider);
			await api.init({ initRemotes: true });

			const remotesJson =
				await readJsonFile<RemotesJson>(remotesFilePath);
			expect(remotesJson).to.not.equal(undefined);
			expect(remotesJson?.remotes).to.not.equal(undefined);
			expect(remotesJson?.remotes.map((r) => r.name)).to.have.members(
				["custom-config-check", "managed-config-check"]
			);
		});
	});
});
