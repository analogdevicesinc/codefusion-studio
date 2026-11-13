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

import { withLock } from "@ster5/global-mutex";
import { expect } from "chai";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import sinon from "sinon";
import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";
import { ConanRunner } from "../src/conan-backend/conan-runner.js";
import { ConanRemoteManager } from "../src/conan-backend/conan-remote.js";

describe("Lock-free reads", function () {
	const testDir = path.join(process.cwd(), "test_cache_lock_free");
	const conanHome = path.join(testDir, "conan");
	const indexPath = path.join(testDir, ".cfsPackages");
	const lockPath = path.join(conanHome, ".packman.lock");

	const validIndex = JSON.stringify({
		"pkg-a": { full_ref: "pkg-a/1.0.0#abc", path: "/tmp/pkg-a" }
	});
	const installedPackages = [{ name: "pkg-a", version: "1.0.0" }];

	let api: ConanPkgManager;
	let pending: Promise<unknown>[];

	beforeEach(async function () {
		await fs.promises.rm(testDir, { recursive: true, force: true });
		await fs.promises.mkdir(conanHome, { recursive: true });
		pending = [];
		api = new ConanPkgManager({
			conanHome,
			indexDir: testDir,
			cfsInstallDir: testDir,
			conanConfigPath: path.join(testDir, "config")
		});
	});

	afterEach(async function () {
		await Promise.allSettled(pending);
		sinon.restore();
	});

	after(async function () {
		await fs.promises.rm(testDir, { recursive: true, force: true });
	});

	// Holds the cross-process lock while `fn` runs, as a long conan operation would
	async function whileLockHeld<T>(fn: () => Promise<T>): Promise<T> {
		let release!: () => void;
		const released = new Promise<void>((resolve) => {
			release = resolve;
		});
		let acquired!: () => void;
		const acquiredPromise = new Promise<void>((resolve) => {
			acquired = resolve;
		});
		const holder = withLock({ fileToLock: lockPath }, async () => {
			acquired();
			await released;
		});
		try {
			await Promise.race([acquiredPromise, holder]);
			return await fn();
		} finally {
			release();
			await holder;
		}
	}

	// Fails fast if a call waits for the lock, instead of hanging until the mocha timeout
	async function withinTimeout<T>(
		promise: Promise<T>,
		ms = 1000
	): Promise<T> {
		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<never>((_resolve, reject) => {
			timer = setTimeout(() => {
				reject(new Error("Timed out, the call waited for the lock"));
			}, ms);
		});
		try {
			return await Promise.race([promise, timeout]);
		} finally {
			clearTimeout(timer);
		}
	}

	// _conanCommand is private, so stub it through a structural view of the prototype
	function stubConanCommand(output: string): void {
		sinon
			.stub(
				ConanPkgManager.prototype as unknown as {
					_conanCommand: () => Promise<string>;
				},
				"_conanCommand"
			)
			.resolves(output);
	}

	function indexReads(readFile: sinon.SinonSpy): number {
		return readFile
			.getCalls()
			.filter((call) => call.args[0] === indexPath).length;
	}

	describe("Index reads", function () {
		it("list and getInstalledPackageInfo do not wait for the lock", async function () {
			await fs.promises.writeFile(indexPath, validIndex);

			await whileLockHeld(async () => {
				expect(await withinTimeout(api.list())).to.deep.equal(
					installedPackages
				);
				expect(
					await withinTimeout(api.getInstalledPackageInfo())
				).to.have.length(1);
			});
		});

		it("listCache, which is locked, still reads the installed packages", async function () {
			stubConanCommand("pkg-a/1.0.0\npkg-b/2.0.0\n");
			await fs.promises.writeFile(indexPath, validIndex);

			expect(await withinTimeout(api.listCache())).to.deep.equal([
				{
					reference: { name: "pkg-a", version: "1.0.0" },
					isInstalled: true
				},
				{
					reference: { name: "pkg-b", version: "2.0.0" },
					isInstalled: false
				}
			]);
		});

		it("returns empty results without retrying when the index is missing", async function () {
			const readFile = sinon.spy(fs.promises, "readFile");

			await whileLockHeld(async () => {
				expect(await withinTimeout(api.list())).to.deep.equal([]);
				expect(
					await withinTimeout(api.getInstalledPackageInfo())
				).to.deep.equal([]);
			});

			expect(indexReads(readFile)).to.equal(2);
		});

		for (const [state, content] of [
			["empty", ""],
			["partially written", validIndex.slice(0, 20)]
		]) {
			it(`retries a read that sees the index ${state} and recovers without taking the lock`, async function () {
				await fs.promises.writeFile(indexPath, content);

				await whileLockHeld(async () => {
					// The writer finishes shortly after, while still holding the lock
					const writer = delay(10).then(async () =>
						fs.promises.writeFile(indexPath, validIndex)
					);

					try {
						expect(await withinTimeout(api.list())).to.deep.equal(
							installedPackages
						);
					} finally {
						await writer;
					}
				});
			});
		}

		for (const [state, setUp] of [
			["empty", () => fs.promises.writeFile(indexPath, "")],
			[
				"partially written",
				() =>
					fs.promises.writeFile(indexPath, validIndex.slice(0, 20))
			],
			// readFile fails with EISDIR, an error other than ENOENT
			["unreadable", () => fs.promises.mkdir(indexPath)]
		] as Array<[string, () => Promise<unknown>]>) {
			it(`gives up after retrying and rejects instead of reporting no packages when the index stays ${state}`, async function () {
				await setUp();
				const readFile = sinon.spy(fs.promises, "readFile");

				await whileLockHeld(async () => {
					let error: unknown;
					try {
						await withinTimeout(api.list());
					} catch (err) {
						error = err;
					}

					expect(error).to.be.instanceOf(Error);
					expect((error as Error).message).to.contain(
						"Failed to read the package index"
					);
					expect((error as Error).cause).to.be.instanceOf(Error);
				});

				expect(
					indexReads(readFile),
					"should retry before giving up"
				).to.be.greaterThan(1);
			});
		}
	});

	describe("License reporter", function () {
		it("registers and unregisters without waiting for the lock", async function () {
			await whileLockHeld(async () => {
				await withinTimeout(
					api.registerLicenseReporter({
						reportLicenseAcceptance: () => Promise.resolve()
					})
				);
				await withinTimeout(api.unregisterLicenseReporter());
			});
		});

		it("reports license acceptance to the reporter registered at install start, even if unregistered mid-install", async function () {
			let resolvePlan!: (plan: unknown) => void;
			sinon.stub(ConanPkgManager.prototype, "getInstallPlan").returns(
				new Promise((resolve) => {
					resolvePlan = resolve;
				}) as never
			);
			stubConanCommand("");
			const reported: unknown[] = [];

			await api.registerLicenseReporter({
				reportLicenseAcceptance: (packages) => {
					reported.push(packages);
					return Promise.resolve();
				}
			});

			const install = api.installFromManifest("manifest.json", {
				localOnly: true,
				acceptLicense: true
			});
			// Wait until the install is suspended on plan resolution
			await delay(50);
			await api.unregisterLicenseReporter();
			resolvePlan({
				toInstall: [{ name: "pkg-a", version: "1.0.0" }],
				requiresLicenseAcceptance: [
					{ reference: { name: "pkg-a", version: "1.0.0" } }
				]
			});
			await install;

			expect(reported).to.deep.equal([
				[{ name: "pkg-a", version: "1.0.0" }]
			]);
		});
	});

	describe("listRemotes", function () {
		function stubConan() {
			return sinon
				.stub(ConanRunner.prototype, "execute")
				.callsFake(async (args: string[]) => {
					if (
						args[0] === "remote" &&
						(args[1] === "list" || args[1] === "list-users")
					) {
						return "[]";
					}
					throw new Error(
						`Unexpected Conan command: ${args.join(" ")}`
					);
				});
		}

		it("returns a valid cache hit without Conan while another caller holds the lock", async function () {
			const execute = stubConan();
			const expected = await api.listRemotes();
			const calls = execute.callCount;
			await whileLockHeld(async () => {
				const listing = api.listRemotes();
				pending.push(listing);
				expect(await withinTimeout(listing)).to.deep.equal(expected);
				expect(execute.callCount).to.equal(calls);
			});
		});

		it("waits for the lock before invoking Conan on a cache miss", async function () {
			const execute = stubConan();
			const cacheChecks = sinon.spy(
				ConanRemoteManager.prototype,
				"getCachedRemotes"
			);
			let settled = false;
			let listing!: ReturnType<ConanPkgManager["listRemotes"]>;
			await whileLockHeld(async () => {
				listing = api.listRemotes();
				pending.push(listing);
				void listing.then(
					() => {
						settled = true;
					},
					() => {
						settled = true;
					}
				);
				await delay(100);
				expect(cacheChecks.callCount).to.equal(1);
				expect(settled).to.equal(false);
				expect(execute.callCount).to.equal(0);
			});
			expect(await withinTimeout(listing)).to.deep.equal([]);
			expect(execute.callCount).to.be.greaterThan(0);
		});

		it("reuses the first caller's refreshed cache for queued misses", async function () {
			const execute = stubConan();
			const expected = await api.listRemotes();
			const refreshCalls = execute.callCount;
			await fs.promises.writeFile(
				path.join(conanHome, ".conan.db"),
				"changed"
			);
			const cacheChecks = sinon.spy(
				ConanRemoteManager.prototype,
				"getCachedRemotes"
			);
			const refreshes = sinon.spy(
				ConanRemoteManager.prototype,
				"listRemotes"
			);
			const listings: ReturnType<ConanPkgManager["listRemotes"]>[] =
				[];
			await whileLockHeld(async () => {
				listings.push(
					api.listRemotes(),
					api.listRemotes(),
					api.listRemotes()
				);
				pending.push(...listings);
				await delay(100);
				expect(cacheChecks.callCount).to.equal(3);
				expect(refreshes.callCount).to.equal(0);
				expect(execute.callCount).to.equal(refreshCalls);
			});
			expect(
				await withinTimeout(Promise.all(listings))
			).to.deep.equal([expected, expected, expected]);
			expect(refreshes.callCount).to.equal(1);
			expect(execute.callCount).to.equal(refreshCalls * 2);
			expect(cacheChecks.callCount).to.equal(6);
		});
	});
});
