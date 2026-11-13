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

import * as chai from "chai";
import { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { spy } from "sinon";
import type { SWPackageRepo } from "cfs-ccm-lib";
import type {
	CfsPackageRemoteCredential,
	CfsPackageRemoteCredentialProvider,
	CfsPackageRemotesProvider
} from "cfs-package-manager";
import {
	DefaultConanCloudsmithRemotesProvider,
	RemotesProviderWithFallback,
	MyAnalogConanCloudsmithRemotesProvider,
	type RepoInfoClient
} from "../../src/packages/cloudsmith-remotes.js";

chai.use(chaiAsPromised);

// Minimal SWPackageRepo fixture factory
function makeRepo(
	overrides: Partial<SWPackageRepo> & {
		repoUrl: string;
	}
): SWPackageRepo {
	return {
		id: "repo-id",
		packageFormat: "conan",
		authRequired: false,
		disabledByDefault: false,
		...overrides
	};
}

// Mock RepoInfoClient that returns a configurable list of repos
function makeRepoClient(repos: SWPackageRepo[]): RepoInfoClient {
	return {
		getRepositoryInfo: () => Promise.resolve(repos),
		getRepository: () => Promise.reject(new Error("not implemented"))
	};
}

// Mock CfsPackageRemoteCredentialProvider
function makeCredentialProvider(
	name = "mock-creds",
	credential: CfsPackageRemoteCredential | undefined = {
		user: "test-user",
		password: "test-password"
	}
): CfsPackageRemoteCredentialProvider {
	return {
		name,
		getRemoteCredential: async () => Promise.resolve(credential),
		refreshRemoteCredential: async () => Promise.resolve(undefined)
	};
}

describe("DefaultConanCloudsmithRemotesProvider", () => {
	let provider: DefaultConanCloudsmithRemotesProvider;

	beforeEach(() => {
		provider = new DefaultConanCloudsmithRemotesProvider();
	});

	it("should have name 'default'", () => {
		expect(provider.name).to.equal("default");
	});

	describe("getRemotes()", () => {
		it("should return exactly one remote", async () => {
			const remotes = await provider.getRemotes();
			expect(remotes).to.have.lengthOf(1);
		});

		it("should return the cfs-public remote with the correct URL", async () => {
			const [remote] = await provider.getRemotes();
			expect(remote.name).to.equal("cfs-public");
			expect(remote.url.href).to.equal(
				"https://conan.cloudsmith.io/adi/codefusion-public"
			);
		});

		it("should return a non-custom, enabled remote with provider 'default'", async () => {
			const [remote] = await provider.getRemotes();
			expect(remote.provider).to.equal("default");
			expect(remote.custom).to.be.false;
			expect(remote.disabled).to.be.false;
		});
	});
});

describe("MyAnalogConanCloudsmithRemotesProvider", () => {
	describe("getRemotes() — basic shape", () => {
		it("should return a remote with provider 'myAnalog'", async () => {
			const client = makeRepoClient([
				makeRepo({ repoUrl: "https://conan.cloudsmith.io/adi/test" })
			]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			const [remote] = await provider.getRemotes();
			expect(remote.provider).to.equal("myAnalog");
			expect(remote.custom).to.be.false;
		});

		it("should use repoName to form the remote name", async () => {
			const client = makeRepoClient([
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/test",
					repoName: "My Repo Name"
				})
			]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			const [remote] = await provider.getRemotes();
			expect(remote.name).to.equal("my-repo-name");
		});

		it("should preserve remotes with distinct names", async () => {
			const client = makeRepoClient([
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/repo-a",
					repoName: "alpha"
				}),
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/repo-b",
					repoName: "beta"
				})
			]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			const remotes = await provider.getRemotes();
			expect(remotes).to.have.lengthOf(2);
		});

		it("should fall back to a URL-derived name when repoName is absent", async () => {
			const client = makeRepoClient([
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/test-repo"
				})
			]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			const [remote] = await provider.getRemotes();
			expect(remote.name).to.equal(
				"conan-cloudsmith-io-adi-test-repo"
			);
		});

		it("should fall back to a URL-derived name when repoName is an empty string", async () => {
			const client = makeRepoClient([
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/test-repo",
					repoName: ""
				})
			]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			const [remote] = await provider.getRemotes();
			expect(remote.name).to.equal(
				"conan-cloudsmith-io-adi-test-repo"
			);
		});

		it("should set disabled to match disabledByDefault", async () => {
			const client = makeRepoClient([
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/test",
					disabledByDefault: true
				})
			]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			const [remote] = await provider.getRemotes();
			expect(remote.disabled).to.be.true;
		});

		it("should return a URL object for the remote url", async () => {
			const repoUrl = "https://conan.cloudsmith.io/adi/test";
			const client = makeRepoClient([makeRepo({ repoUrl })]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			const [remote] = await provider.getRemotes();
			expect(remote.url).to.be.instanceOf(URL);
			expect(remote.url.href).to.equal(repoUrl);
		});

		it("should throw an error when the repository client returns no repos", async () => {
			const client = makeRepoClient([]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			await expect(provider.getRemotes()).to.be.rejectedWith(
				"Cloud provider response did not contain any remotes"
			);
		});
	});

	describe("getRemotes() — authentication", () => {
		it("should set auth property to public when authRequired is false", async () => {
			const client = makeRepoClient([
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/test",
					authRequired: false
				})
			]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			const [remote] = await provider.getRemotes();
			expect(remote).to.have.property("auth");
			expect(remote.auth).to.deep.equal({ public: true });
			expect(remote).to.not.have.property("getCredential");
			expect(remote).to.not.have.property("refreshCredential");
		});

		it("should include auth properties when authRequired is true", async () => {
			const client = makeRepoClient([
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/test",
					authRequired: true
				})
			]);
			const credProvider = makeCredentialProvider("my-creds");
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client,
				credProvider
			);

			const [remote] = await provider.getRemotes();
			expect(remote).to.have.property("auth");
			expect(remote.auth).to.deep.equal({
				public: false,
				credentialProvider: "my-creds"
			});
			expect(remote).to.have.property("getCredential");
			expect(remote).to.have.property("refreshCredential");
		});

		it("should set auth.credentialProvider to the credential provider name", async () => {
			const client = makeRepoClient([
				makeRepo({
					repoUrl: "https://conan.cloudsmith.io/adi/test",
					authRequired: true
				})
			]);
			const credProvider = makeCredentialProvider("my-creds");
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client,
				credProvider
			);

			const [remote] = await provider.getRemotes();
			expect(
				(remote as { auth: { credentialProvider: string } }).auth
					.credentialProvider
			).to.equal("my-creds");
		});

		it("should delegate getCredential() to the credential provider", async () => {
			const repoUrl = "https://conan.cloudsmith.io/adi/test";
			const client = makeRepoClient([
				makeRepo({ repoUrl, authRequired: true })
			]);
			const credProvider = makeCredentialProvider();
			const getCredSpy = spy(credProvider, "getRemoteCredential");
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client,
				credProvider
			);

			const [remote] = await provider.getRemotes();
			const getCredential = (
				remote as {
					getCredential: () => Promise<
						CfsPackageRemoteCredential | undefined
					>;
				}
			).getCredential;
			const result = await getCredential();

			expect(getCredSpy.calledOnceWith(repoUrl)).to.be.true;
			expect(result).to.deep.equal({
				user: "test-user",
				password: "test-password"
			});
		});

		it("should delegate refreshCredential() to the credential provider", async () => {
			const repoUrl = "https://conan.cloudsmith.io/adi/test";
			const client = makeRepoClient([
				makeRepo({ repoUrl, authRequired: true })
			]);
			const credProvider = makeCredentialProvider();
			const refreshSpy = spy(credProvider, "refreshRemoteCredential");
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client,
				credProvider
			);

			const [remote] = await provider.getRemotes();
			const refreshCredential = (
				remote as { refreshCredential: () => Promise<void> }
			).refreshCredential;
			await refreshCredential();

			expect(refreshSpy.calledOnceWith(repoUrl)).to.be.true;
		});
	});

	describe("init()", () => {
		it("should resolve successfully when getRemotes() succeeds", async () => {
			const client = makeRepoClient([
				makeRepo({ repoUrl: "https://conan.cloudsmith.io/adi/test" })
			]);
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			await expect(provider.init()).to.eventually.be.fulfilled;
		});

		it("should reject when getRemotes() fails", async () => {
			const client: RepoInfoClient = {
				getRepositoryInfo: () =>
					Promise.reject(new Error("network error")),
				getRepository: () =>
					Promise.reject(new Error("not implemented"))
			};
			const provider = new MyAnalogConanCloudsmithRemotesProvider(
				client
			);

			await expect(provider.init()).to.eventually.be.rejectedWith(
				"network error"
			);
		});
	});
});

describe("RemotesProviderWithFallback", () => {
	function makeFailingProvider(): CfsPackageRemotesProvider {
		return {
			name: "failing",
			getRemotes: () => Promise.reject(new Error("network error"))
		};
	}

	it("should not contact the primary provider on construction", () => {
		const primary = new DefaultConanCloudsmithRemotesProvider();
		const getRemotesSpy = spy(primary, "getRemotes");

		new RemotesProviderWithFallback(
			primary,
			new DefaultConanCloudsmithRemotesProvider()
		);

		expect(getRemotesSpy.called).to.be.false;
	});

	it("should return the primary's remotes when it succeeds", async () => {
		const primary = new MyAnalogConanCloudsmithRemotesProvider(
			makeRepoClient([
				makeRepo({ repoUrl: "https://conan.cloudsmith.io/adi/test" })
			])
		);
		const onFallback = spy();
		const provider = new RemotesProviderWithFallback(
			primary,
			new DefaultConanCloudsmithRemotesProvider(),
			onFallback
		);

		const remotes = await provider.getRemotes();

		expect(remotes).to.have.length(1);
		expect(remotes[0].provider).to.equal("myAnalog");
		expect(provider.name).to.equal("myAnalog");
		expect(onFallback.called).to.be.false;
	});

	it("should return the fallback's remotes when the primary fails", async () => {
		const onFallback = spy();
		const provider = new RemotesProviderWithFallback(
			makeFailingProvider(),
			new DefaultConanCloudsmithRemotesProvider(),
			onFallback
		);

		const remotes = await provider.getRemotes();

		expect(remotes).to.have.length(1);
		expect(remotes[0].name).to.equal("cfs-public");
		expect(provider.name).to.equal("default");
		expect(onFallback.calledOnce).to.be.true;
		expect(onFallback.firstCall.args[0]).to.be.instanceOf(Error);
	});

	it("should stick with the fallback and notify only once", async () => {
		const primary = makeFailingProvider();
		const getRemotesSpy = spy(primary, "getRemotes");
		const onFallback = spy();
		const provider = new RemotesProviderWithFallback(
			primary,
			new DefaultConanCloudsmithRemotesProvider(),
			onFallback
		);

		await provider.getRemotes();
		await provider.getRemotes();

		expect(getRemotesSpy.calledOnce).to.be.true;
		expect(onFallback.calledOnce).to.be.true;
	});

	it("should share the first primary request between concurrent callers", async () => {
		// Fails on the first call and succeeds afterwards, so separate
		// requests would leave callers with different remote sets
		let calls = 0;
		const primary: CfsPackageRemotesProvider = {
			name: "flaky",
			getRemotes: () =>
				calls++ === 0
					? Promise.reject(new Error("network error"))
					: new DefaultConanCloudsmithRemotesProvider().getRemotes()
		};
		const getRemotesSpy = spy(primary, "getRemotes");
		const onFallback = spy();
		const provider = new RemotesProviderWithFallback(
			primary,
			new DefaultConanCloudsmithRemotesProvider(),
			onFallback
		);

		const [first, second] = await Promise.all([
			provider.getRemotes(),
			provider.getRemotes()
		]);

		expect(getRemotesSpy.calledOnce).to.be.true;
		expect(onFallback.calledOnce).to.be.true;
		expect(first[0].provider).to.equal("default");
		expect(second[0].provider).to.equal("default");
	});

	it("should keep querying the primary after it has succeeded", async () => {
		const primary = new MyAnalogConanCloudsmithRemotesProvider(
			makeRepoClient([
				makeRepo({ repoUrl: "https://conan.cloudsmith.io/adi/test" })
			])
		);
		const getRemotesSpy = spy(primary, "getRemotes");
		const provider = new RemotesProviderWithFallback(
			primary,
			new DefaultConanCloudsmithRemotesProvider()
		);

		await Promise.all([provider.getRemotes(), provider.getRemotes()]);
		await provider.getRemotes();

		expect(getRemotesSpy.callCount).to.equal(2);
	});
});
