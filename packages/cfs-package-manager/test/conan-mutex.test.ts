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

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "node:fs";
import path from "node:path";
import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";

use(chaiAsPromised);

const conanURL = `http://${process.env.CONAN_SERVER_HOST ?? "localhost"}:${process.env.CONAN_SERVER_PORT ?? "9300"}`;

describe("Lockfile Tests", function () {
	const testConfigDir = path.join(process.cwd(), "test_config");
	const testCacheDir = path.join(process.cwd(), "test_cache_mutex");
	const testConanHome = path.join(testCacheDir, "conan");

	async function cleanCache() {
		await Promise.all([
			fs.promises.rm(testCacheDir, {
				recursive: true,
				force: true
			}),
			fs.promises.rm(testConfigDir, {
				recursive: true,
				force: true
			})
		]);
	}

	const api = new ConanPkgManager({
		conanHome: testConanHome,
		indexDir: testCacheDir,
		conanConfigPath: testConfigDir
	});

	async function setupTest() {
		// Copy config files to test config dir
		await fs.promises.cp(
			path.resolve("./src/conan-backend/config"),
			testConfigDir,
			{
				recursive: true,
				force: true
			}
		);
		// Remove managed remotes
		await fs.promises.rm(
			path.join(testConfigDir, "managedRemotes.json"),
			{ force: true }
		);

		expect(fs.existsSync(path.join(testConanHome, ".packman.lock")))
			.to.be.false; // Lockfile should not be present before initialization

		await api.init();

		expect(fs.existsSync(path.join(testConanHome, ".packman.lock")))
			.to.be.true; // Lockfile should now be present
		const remotes = await api.listRemotes();
		for (const { name } of remotes) {
			await api.deleteRemote(name);
		}
		await api.addRemote("local-test-server", conanURL);
		await api.login(
			"local-test-server",
			"test_user",
			"test_password"
		);
	}

	async function teardownTest() {
		try {
			await api.logout("local-test-server");
		} catch (error) {
			// Ignore logout errors during cleanup
		}
	}

	before(cleanCache);
	after(teardownTest);
	before(setupTest);
	after(cleanCache);
	it("ConanPkgManager operations run sequentially", async function () {
		const sinon = (await import("sinon")).default;
		let releaseInstall!: () => void;
		const releaseInstallPromise = new Promise<void>((resolve) => {
			releaseInstall = resolve;
		});
		let installEntered!: () => void;
		const installEnteredPromise = new Promise<void>((resolve) => {
			installEntered = resolve;
		});
		let listEntered!: () => void;
		const listEnteredPromise = new Promise<void>((resolve) => {
			listEntered = resolve;
		});
		const installStub = sinon
			.stub(ConanPkgManager.prototype, "install")
			.callsFake(async function () {
				installEntered();
				await releaseInstallPromise;
				return [];
			});
		const listStub = sinon
			.stub(ConanPkgManager.prototype, "list")
			.callsFake(async function () {
				listEntered();
				return Promise.resolve([]);
			});

		try {
			const installPromise = api.install([
				{ name: "test_pkg1", version: "1.0" }
			]);
			await installEnteredPromise;
			const listPromise = api.list();
			const listRanEarly = await Promise.race([
				listEnteredPromise.then(() => true),
				new Promise<boolean>((resolve) =>
					setTimeout(() => {
						resolve(false);
					}, 200)
				)
			]);
			expect(
				listRanEarly,
				"list() should not start until install() releases the lock"
			).to.be.false;
			releaseInstall();
			await installPromise;
			await listPromise;
		} finally {
			installStub.restore();
			listStub.restore();
		}
	});
});
