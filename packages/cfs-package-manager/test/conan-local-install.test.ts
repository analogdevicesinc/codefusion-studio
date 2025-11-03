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

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "node:fs";
import path from "node:path";
import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";

use(chaiAsPromised);

describe("Local install", function () {
	const testConfigDir = path.join(process.cwd(), "test_config");
	const testCacheDir = path.join(process.cwd(), "test_cache");
	const testConanHome = path.join(testCacheDir, "conan");
	const testPkgRef = { name: "test_pkg1", version: "1.0" };

	const api = new ConanPkgManager({
		conanHome: testConanHome,
		indexDir: testCacheDir,
		conanConfigPath: testConfigDir
	});

	async function setupConfig() {
		// Remove managedRemotes.json to avoid interference with tests
		// Since these tests only interact with local server.
		await fs.promises.cp(
			path.resolve("./src/conan-backend/config"),
			testConfigDir,
			{
				recursive: true,
				force: true,
				filter: (src) => !src.endsWith("managedRemotes.json")
			}
		);
		await fs.promises.writeFile(
			path.join(testConfigDir, "remotes.json"),
			JSON.stringify(
				{
					remotes: []
				},
				null,
				2
			)
		);
	}

	async function clean() {
		await fs.promises.rm(testCacheDir, {
			recursive: true,
			force: true
		});
		await fs.promises.rm(testConfigDir, {
			recursive: true,
			force: true
		});
	}

	async function setupTest() {
		await fs.promises.rm(testCacheDir, {
			recursive: true,
			force: true
		});

		await api.init();
		await api.addRemote("local-test-server", "http://localhost:9300");
	}

	before(setupConfig);
	beforeEach(setupTest);
	after(clean);

	it("Should fail to install package that has not been installed before", async () => {
		await expect(
			api.install(testPkgRef, { localOnly: true })
		).to.be.rejectedWith(
			/Package (.*) not resolved: No remote defined/
		);
	});

	it("Should succeed if package has been installed before from remote using {localOnly: false}", async () => {
		await api.install(testPkgRef, { localOnly: false });
		await expect(api.install(testPkgRef, { localOnly: true })).to.be
			.fulfilled;
	});

	it("Should succeed if package has been installed before from remote with default options", async () => {
		await api.install(testPkgRef);
		await expect(api.install(testPkgRef, { localOnly: true })).to.be
			.fulfilled;
	});
	it("Should fail if package is installed from remote and later on deleted from cache", async () => {
		await api.install(testPkgRef);
		await api.uninstall(testPkgRef.name);
		await api.delete(testPkgRef.name + "/" + testPkgRef.version);
		await expect(
			api.install(testPkgRef, { localOnly: true })
		).to.be.rejectedWith(
			/Package (.*) not resolved: No remote defined/
		);
	});
});
