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
import fs from "node:fs";
import path from "node:path";
import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";

use(chaiAsPromised);

describe("ConanPkgManager.init", function () {
	const testCacheDir = path.join(
		process.cwd(),
		"test_cache_packman_init"
	);

	async function cleanCache() {
		await fs.promises.rm(testCacheDir, {
			recursive: true,
			force: true
		});
	}

	const testConanHome = path.join(testCacheDir, "conan");

	beforeEach(cleanCache);
	after(cleanCache);

	it("should copy the conan custom files to the conan home directory", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init();

		// Check that conan home directory exists
		expect(await fs.promises.stat(testConanHome)).to.exist;

		// Check that conan custom files were copied
		const conanHomeContents =
			await fs.promises.readdir(testConanHome);
		expect(conanHomeContents.length).to.be.greaterThan(0);
	});

	it("should generate a default conan profile in the conan home directory with OS and arch settings", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init();

		// Check that profile exists in conan home
		const profilePath = path.join(
			testConanHome,
			"profiles",
			"default"
		);
		const profileStats = await fs.promises.stat(profilePath);
		expect(profileStats.isFile()).to.be.true;

		// Check profile content has OS and arch settings
		const profileContent = await fs.promises.readFile(
			profilePath,
			"utf-8"
		);
		expect(profileContent).to.include("[settings]");
		expect(profileContent).to.match(/os=/i);
		expect(profileContent).to.match(/arch=/i);
	});

	it("should only generate a remotes.json file when the initRemotes option is passed", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init();

		// Check that remotes.json is NOT created
		const remotesPath = path.join(testConanHome, "remotes.json");
		try {
			await fs.promises.stat(remotesPath);
			expect.fail(
				"remotes.json should not exist without initRemotes option"
			);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
				throw error;
			}
		}

		// Now initialize with initRemotes option
		const testConanHome2 = path.join(testCacheDir, "conan2");
		const pkgManager2 = new ConanPkgManager({
			conanHome: testConanHome2,
			indexDir: testCacheDir
		});
		await pkgManager2.init({ initRemotes: true });

		// Check that remotes.json IS created
		const remotesPath2 = path.join(testConanHome2, "remotes.json");
		expect(await fs.promises.stat(remotesPath2)).to.exist;
	});

	it("should generate an empty remotes.json file (no remotes provider active)", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init({ initRemotes: true });

		const remotesPath = path.join(testConanHome, "remotes.json");
		const remotesContent = await fs.promises.readFile(
			remotesPath,
			"utf-8"
		);
		const remotes = JSON.parse(remotesContent) as {
			remotes: unknown[];
		};

		// Should be empty
		expect(remotes).to.be.an("object").that.has.property("remotes");
		expect(remotes.remotes).to.be.an("array").that.is.empty;
	});
});
