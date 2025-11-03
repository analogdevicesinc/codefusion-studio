import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import fs from "node:fs";
import path from "node:path";
import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";
import { CfsPackageRemote } from "../src/api/api.js";

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

	const userRemote: CfsPackageRemote = {
		name: "user-remote",
		url: new URL("https://example.com/conan"),
		custom: true
	};

	beforeEach(cleanCache);
	after(cleanCache);

	it("should create a default remotes.json file", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init();

		const remotes = await pkgManager.listRemotes();

		// Check that remotes file is created and has content
		expect(remotes).to.be.an("array");

		// Look for CFS public remote specifically
		expect(remotes).to.deep.include({
			auth: undefined,
			name: "cfs-public",
			url: new URL(
				"https://conan.cloudsmith.io/adi/codefusion-public"
			),
			custom: false
		});
	});

	it("should persist user added remotes", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init();

		await pkgManager.addRemote(
			userRemote.name,
			userRemote.url.toString()
		);

		// Read remotes after adding user remote
		expect(await pkgManager.listRemotes()).to.deep.include({
			...userRemote,
			custom: true,
			auth: undefined
		});

		// Re-initialize to test persistence
		await pkgManager.init();

		// User remote should still exist
		expect(await pkgManager.listRemotes()).to.deep.include({
			...userRemote,
			custom: true,
			auth: undefined
		});
	});

	it("should not duplicate existing remotes on re-initialization", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init();

		await pkgManager.addRemote(
			userRemote.name,
			userRemote.url.toString()
		);

		const remotesBefore = await pkgManager.listRemotes();

		// Re-initialize
		await pkgManager.init();

		const remotesAfter = await pkgManager.listRemotes();

		// User remote should still exist and be unchanged
		expect(remotesAfter).to.have.deep.members(remotesBefore);
	});

	it("should prevent user from modifying system-provided remotes", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init();

		// Check initial remotes is not empty
		const remotes = await pkgManager.listRemotes();
		expect(remotes).to.not.be.empty;

		//Modify the first remote URL
		const firstRemote = remotes[0];
		await expect(
			pkgManager.deleteRemote(firstRemote.name)
		).to.be.rejectedWith(Error, /Cannot delete default remote/i);
	});

	it("should not allow adding an existing remote", async function () {
		const pkgManager = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir
		});
		await pkgManager.init();

		await expect(
			pkgManager.addRemote(
				"cfs-public",
				"https://malicious.example.com"
			)
		).to.be.rejectedWith(
			Error,
			/cfs-public.*already exists|cannot add/i
		);
	});
});
