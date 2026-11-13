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

import { expect } from "chai";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { mock } from "node:test";
import { ConanRemoteManager } from "../src/conan-backend/conan-remote.js";
import { ConanRunner } from "../src/conan-backend/conan-runner.js";
import type { CfsPackageRemotesProvider } from "../src/api/api.js";

describe("ConanRemoteManager cache", () => {
	let home: string;
	let now: number;

	beforeEach(async () => {
		home = await fs.mkdtemp(
			path.join(os.tmpdir(), "cfs-remotes-cache-")
		);
		now = 1_000_000;
		mock.method(Date, "now", () => now);
	});

	afterEach(async () => {
		mock.restoreAll();
		await fs.rm(home, { recursive: true, force: true });
	});

	function createManager(cacheTTL?: number) {
		const runner = new ConanRunner(home);
		const execute = mock.method(
			runner,
			"execute",
			async (args: string[]) => {
				if (
					args[0] === "remote" &&
					(args[1] === "list" || args[1] === "list-users")
				) {
					return "[]";
				}
				throw new Error(
					`Unexpected Conan command: ${args.join(" ")}`
				);
			}
		);
		const provider: CfsPackageRemotesProvider = {
			name: "mock-provider",
			getRemotes: async () => []
		};
		const getRemotes = mock.method(provider, "getRemotes");
		const manager = new ConanRemoteManager(
			runner,
			home,
			provider,
			undefined,
			undefined,
			undefined,
			cacheTTL
		);
		return { manager, execute, getRemotes, runner };
	}

	it("has no cached result before listing and skips validation", async () => {
		const { manager, execute, getRemotes } = createManager();
		const stat = mock.method(fs, "stat");
		expect(await manager.getCachedRemotes()).to.equal(undefined);
		expect(execute.mock.callCount()).to.equal(0);
		expect(getRemotes.mock.callCount()).to.equal(0);
		expect(stat.mock.callCount()).to.equal(0);
	});

	for (const type of ["custom", "managed"] as const) {
		for (const source of [
			"listRemotes",
			"getCachedRemotes"
		] as const) {
			it(`mutating ${type} remotes returned by ${source} does not alter the cache`, async () => {
				const { manager, execute, getRemotes } = createManager();
				const url = `https://example.com/${type}`;
				const disabled = type === "managed";
				const expectedAuth =
					type === "managed"
						? {
								public: false,
								credentialProvider: "original-provider"
							}
						: { public: false, username: "original-user" };
				if (type === "managed") {
					getRemotes.mock.mockImplementation(async () => [
						{
							name: type,
							url: new URL(url),
							provider: "mock-provider",
							custom: false,
							disabled,
							auth: {
								public: false,
								credentialProvider: "original-provider"
							},
							getCredential: async () => {
								throw new Error(
									"Disabled remotes must not request credentials"
								);
							},
							refreshCredential: async () => {
								throw new Error(
									"Disabled remotes must not refresh credentials"
								);
							}
						}
					]);
				} else {
					await fs.writeFile(
						path.join(home, "customRemotes.json"),
						JSON.stringify({
							remotes: [{ name: type, url }]
						})
					);
				}
				execute.mock.mockImplementation(async (args: string[]) => {
					if (args[1] === "list") {
						return JSON.stringify([
							{
								name: type,
								url,
								verify_ssl: true,
								enabled: !disabled
							}
						]);
					}
					if (args[1] === "list-users") {
						return JSON.stringify([
							{
								name: type,
								user_name: "original-user",
								authenticated: true
							}
						]);
					}
					throw new Error(
						`Unexpected Conan command: ${args.join(" ")}`
					);
				});

				const listed = await manager.listRemotes();
				const result =
					source === "listRemotes"
						? listed
						: await manager.getCachedRemotes();
				expect(result).not.to.equal(undefined);
				if (!result) {
					throw new Error("Expected cached remotes");
				}
				result[0].name = "mutated";
				result[0].url.pathname = "/mutated";
				const auth = result[0].auth;
				if (!auth || auth.public) {
					throw new Error("Expected authenticated remote metadata");
				}
				if ("username" in auth) {
					auth.username = "mutated-user";
				} else {
					auth.credentialProvider = "mutated-provider";
				}
				result.push({ ...result[0] });

				const calls = execute.mock.callCount();
				const cached = await manager.getCachedRemotes();
				expect(cached).to.have.lengthOf(1);
				expect(cached?.[0].name).to.equal(type);
				expect(cached?.[0].url.href).to.equal(url);
				expect(cached?.[0].auth).to.deep.equal(expectedAuth);
				expect(cached?.[0].disabled).to.equal(disabled);
				expect(cached?.[0].url).not.to.equal(result[0].url);
				expect(cached?.[0].auth).not.to.equal(result[0].auth);
				expect(execute.mock.callCount()).to.equal(calls);
			});
		}
	}

	it("uses a 90-second default TTL and skips validation after it expires", async () => {
		const { manager, execute, getRemotes } = createManager();
		const result = await manager.listRemotes();
		const executions = execute.mock.callCount();
		now += 90_000;
		expect(await manager.getCachedRemotes()).to.deep.equal(result);
		expect(execute.mock.callCount()).to.equal(executions);

		const providerCalls = getRemotes.mock.callCount();
		const stat = mock.method(fs, "stat");
		now += 1;
		expect(await manager.getCachedRemotes()).to.equal(undefined);
		expect(getRemotes.mock.callCount()).to.equal(providerCalls);
		expect(stat.mock.callCount()).to.equal(0);
	});

	it("uses the configured TTL and refreshes an expired cache", async () => {
		const { manager, execute } = createManager(100);
		const result = await manager.listRemotes();
		now += 99;
		expect(await manager.getCachedRemotes()).to.deep.equal(result);
		now += 2;
		expect(await manager.getCachedRemotes()).to.equal(undefined);
		const executions = execute.mock.callCount();
		await manager.listRemotes();
		expect(execute.mock.callCount()).to.be.greaterThan(executions);
		expect(await manager.getCachedRemotes()).to.deep.equal(result);
	});

	it("rejects a cache that expires while validation is running", async () => {
		const { manager, getRemotes } = createManager(100);
		await manager.listRemotes();
		getRemotes.mock.mockImplementation(async () => {
			now += 101;
			return [];
		});
		expect(await manager.getCachedRemotes()).to.equal(undefined);
	});

	it("disables storage and validation when TTL is zero", async () => {
		const { manager, execute, getRemotes } = createManager(0);
		const stat = mock.method(fs, "stat");
		expect(await manager.getCachedRemotes()).to.equal(undefined);
		expect(getRemotes.mock.callCount()).to.equal(0);
		expect(stat.mock.callCount()).to.equal(0);
		await manager.listRemotes();
		// Applying the configuration still needs the provider, but fingerprinting does not.
		expect(getRemotes.mock.callCount()).to.equal(1);
		expect(stat.mock.callCount()).to.equal(0);
		expect(await manager.getCachedRemotes()).to.equal(undefined);
		expect(getRemotes.mock.callCount()).to.equal(1);
		expect(stat.mock.callCount()).to.equal(0);

		const executions = execute.mock.callCount();
		await manager.listRemotes();
		expect(execute.mock.callCount()).to.be.greaterThan(executions);
		expect(getRemotes.mock.callCount()).to.equal(2);
		expect(stat.mock.callCount()).to.equal(0);
		expect(await manager.getCachedRemotes()).to.equal(undefined);
	});

	it("fingerprints the provider response used to apply the configuration", async () => {
		const { manager, getRemotes } = createManager();
		let providerCalls = 0;
		getRemotes.mock.mockImplementation(async () =>
			++providerCalls === 1
				? []
				: [
						{
							name: "new-remote",
							url: new URL("https://example.com/new"),
							provider: "mock-provider",
							custom: false,
							disabled: false,
							auth: { public: true }
						}
					]
		);

		expect(await manager.listRemotes()).to.deep.equal([]);
		expect(getRemotes.mock.callCount()).to.equal(1);
		expect(await manager.getCachedRemotes()).to.equal(undefined);
	});

	it("caches an empty remote list without invoking Conan on cache hits", async () => {
		const { manager, execute } = createManager();
		expect(await manager.listRemotes()).to.deep.equal([]);
		const calls = execute.mock.callCount();
		expect(await manager.getCachedRemotes()).to.deep.equal([]);
		expect(await manager.getCachedRemotes()).to.deep.equal([]);
		expect(execute.mock.callCount()).to.equal(calls);
	});

	it("supports caching when no provider is registered", async () => {
		const { runner, execute } = createManager();
		const manager = new ConanRemoteManager(runner, home);
		await manager.listRemotes();
		const calls = execute.mock.callCount();
		expect(await manager.getCachedRemotes()).to.deep.equal([]);
		expect(execute.mock.callCount()).to.equal(calls);
	});

	it("keeps the cache when only the provider list order changes", async () => {
		const { manager, execute, getRemotes } = createManager();
		const remotes: Awaited<
			ReturnType<CfsPackageRemotesProvider["getRemotes"]>
		> = ["first", "second"].map((name) => ({
			name,
			url: new URL(`https://example.com/${name}`),
			provider: "mock-provider",
			custom: false,
			disabled: false,
			auth: { public: true }
		}));
		getRemotes.mock.mockImplementation(async () => remotes);
		execute.mock.mockImplementation(async (args: string[]) => {
			if (args[1] === "list") {
				return JSON.stringify(
					remotes.map((remote) => ({
						name: remote.name,
						url: remote.url.href,
						enabled: true,
						verify_ssl: true
					}))
				);
			}
			if (args[1] === "list-users") {
				return "[]";
			}
			if (args[1] === "logout") {
				return "";
			}
			throw new Error(`Unexpected Conan command: ${args.join(" ")}`);
		});
		const result = await manager.listRemotes();
		remotes.reverse();
		const calls = execute.mock.callCount();
		expect(await manager.getCachedRemotes()).to.deep.equal(result);
		expect(execute.mock.callCount()).to.equal(calls);
	});

	it("returns a cache miss if the provider fails during validation", async () => {
		const { manager, getRemotes, execute } = createManager();
		await manager.listRemotes();
		getRemotes.mock.mockImplementation(async () => {
			throw new Error("Provider unavailable");
		});
		const calls = execute.mock.callCount();
		expect(await manager.getCachedRemotes()).to.equal(undefined);
		expect(execute.mock.callCount()).to.equal(calls);
	});

	for (const filename of [
		"remotes.json",
		"customRemotes.json",
		"userRemotesCfg.json",
		".conan.db"
	]) {
		it(`invalidates the cache when ${filename} changes during the TTL`, async () => {
			const { manager, execute } = createManager();
			if (filename === "customRemotes.json") {
				await fs.writeFile(
					path.join(home, filename),
					'{"remotes":[]}'
				);
			} else if (filename === "userRemotesCfg.json") {
				await fs.writeFile(path.join(home, filename), "{}");
			} else if (filename === ".conan.db") {
				await fs.writeFile(path.join(home, filename), "");
			}
			await manager.listRemotes();
			const file = path.join(home, filename);
			const stat = await fs.stat(file);
			await fs.utimes(
				file,
				stat.atime,
				new Date(stat.mtimeMs + 10_000)
			);
			const calls = execute.mock.callCount();
			expect(await manager.getCachedRemotes()).to.equal(undefined);
			expect(execute.mock.callCount()).to.equal(calls);
		});
	}

	for (const action of ["created", "deleted"] as const) {
		it(`invalidates the cache when a tracked file is ${action}`, async () => {
			const { manager } = createManager();
			const file = path.join(home, ".conan.db");
			if (action === "deleted") {
				await fs.writeFile(file, "");
			}
			await manager.listRemotes();
			if (action === "created") {
				await fs.writeFile(file, "");
			} else {
				await fs.unlink(file);
			}
			expect(await manager.getCachedRemotes()).to.equal(undefined);
		});
	}

	it("ignores changes to files unrelated to remote configuration", async () => {
		const { manager } = createManager();
		const result = await manager.listRemotes();
		await fs.writeFile(path.join(home, "unrelated.txt"), "changed");
		expect(await manager.getCachedRemotes()).to.deep.equal(result);
	});

	it("does not cache a listing that reports a remote configuration error", async () => {
		const { manager, execute, getRemotes } = createManager();
		execute.mock.mockImplementation(async (args: string[]) => {
			if (args[1] === "list" || args[1] === "list-users") {
				return "[]";
			}
			if (args[1] === "add") {
				throw new Error("Failed to add remote");
			}
			throw new Error(`Unexpected Conan command: ${args.join(" ")}`);
		});
		getRemotes.mock.mockImplementation(async () => [
			{
				name: "cannot-add",
				url: new URL("https://example.com/failure"),
				provider: "mock-provider",
				custom: false,
				disabled: false,
				auth: { public: true }
			}
		]);
		const result = await manager.listRemotes();
		expect(result).to.have.lengthOf(1);
		expect(result[0].configError?.code).to.equal("REMOTE_ADD_FAILED");
		expect(await manager.getCachedRemotes()).to.equal(undefined);
	});

	it("clears a previous cache if a subsequent listing fails", async () => {
		const { manager, execute } = createManager();
		await manager.listRemotes();
		const failure = new Error("Conan unavailable");
		execute.mock.mockImplementation(async () => {
			throw failure;
		});
		let caught: unknown;
		try {
			await manager.listRemotes();
		} catch (error) {
			caught = error;
		}
		expect(caught).to.equal(failure);
		expect(await manager.getCachedRemotes()).to.equal(undefined);
	});

	it("rejects an older cache if a listing replaces it during validation", async () => {
		const { manager, getRemotes } = createManager();
		await manager.listRemotes();
		let replaceCache = true;
		getRemotes.mock.mockImplementation(async () => {
			if (replaceCache) {
				replaceCache = false;
				await manager.listRemotes();
			}
			return [];
		});
		expect(await manager.getCachedRemotes()).to.equal(undefined);
		expect(await manager.getCachedRemotes()).to.deep.equal([]);
	});
});
