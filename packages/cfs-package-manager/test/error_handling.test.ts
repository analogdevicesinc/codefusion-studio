/**
 * Error handling tests for ConanPkgManager API
 */
import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";

import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";
import path from "path";
import fs from "fs/promises";

chai.use(chaiAsPromised);
const expect = chai.expect;

describe("ErrorHandling", () => {
	const testCacheDir = path.join(process.cwd(), "test_cache");
	const testConfigDir = path.join(process.cwd(), "test_config");
	const testConanHome = path.join(testCacheDir, "conan");

	// API instance that gets recreated for each test run
	let api: ConanPkgManager;

	async function cleanCache() {
		await fs.rm(testCacheDir, {
			recursive: true,
			force: true
		});
		await fs.rm(testConfigDir, {
			recursive: true,
			force: true
		});
	}

	async function setupTest() {
		// Run any setup logic before the test suite executes

		// Copy config files to test config dir
		await fs.cp(
			path.resolve("./src/conan-backend/config"),
			testConfigDir,
			{
				recursive: true,
				force: true
			}
		);
		// Remove managed remotes
		await fs.rm(path.join(testConfigDir, "managedRemotes.json"));

		// Create a new ConanPkgManager instance for this test run
		api = new ConanPkgManager({
			conanHome: testConanHome,
			indexDir: testCacheDir,
			conanConfigPath: testConfigDir
		});

		// Initialize package manager
		await api.init();
		const remotes = await api.listRemotes();
		for (const { name } of remotes) {
			await api.deleteRemote(name);
		}
		await api.addRemote("local-test-server", "http://localhost:9300");
	}

	async function login() {
		await api.login(
			"local-test-server",
			"test_user",
			"test_password"
		);
	}

	async function logout() {
		await api.logout("local-test-server");
	}

	before(cleanCache);
	after(cleanCache);

	before(setupTest);

	describe("Install", () => {
		describe("Not authenticated", () => {
			it("should throw an error when requesting a private package", async () => {
				await expect(
					api.install({ name: "private_pkg", version: "1.0" })
				).to.be.rejectedWith(
					/Authentication error on remote 'local-test-server'/i
				);
			});
		});

		describe("Authenticated", () => {
			before(login);
			after(logout);
			// Clean cache so recipe cache is clean for other tests
			after(cleanCache);
			after(setupTest);

			it("should succeed when requesting a private package", async () => {
				await expect(
					api.install({ name: "private_pkg", version: "1.0" })
				).to.be.fulfilled;
			});
		});

		it("should throw an error when installing a non-existent package", async () => {
			await expect(
				api.install({ name: "non_existent_pkg", version: "1.0" })
			).to.be.rejectedWith(/(Couldn't find the following packages)/i);
		});

		it("should succeed when installing an existent package", async () => {
			const existing_pkg = { name: "test_pkg1", version: "1.0" };
			await expect(api.install(existing_pkg)).to.be.fulfilled;
			await api.uninstall(existing_pkg.name);
		});
	});

	describe("Uninstall", () => {
		it("should throw an error when uninstalling a package that is not installed", async () => {
			await expect(
				api.uninstall("non_installed_pkg")
			).to.be.rejectedWith(/not installed/i);
		});
	});

	describe("GetPath", () => {
		it("should throw an error when getting path for a package that is not installed", async () => {
			await expect(
				api.getPath("non_installed_pkg")
			).to.be.rejectedWith(/not installed|does not exist/i);
		});
	});

	describe("DeleteRemote", () => {
		it("should throw an error when deleting a remote that does not exist", async () => {
			await expect(
				api.deleteRemote("non_existent_remote")
			).to.be.rejectedWith(/Remote (.*) does not exist/i);
		});
	});

	describe("getPackageInfo", () => {
		it("should throw an error when calling getPackageInfo on a non-existent package", async () => {
			await expect(
				api.getPackageInfo({
					name: "non_existent_pkg",
					version: "1.0"
				})
			).to.be.rejectedWith(/not found|does not exist/i);
		});
	});

	describe("localConsumers", () => {
		it("should throw an error when localConsumers is called with a package that is not installed", async () => {
			await expect(
				api.localConsumers("non_installed_pkg")
			).to.be.rejectedWith(/not installed/i);
		});
	});

	describe("Dependencies", () => {
		describe("Not authenticated", () => {
			it("should throw an error when requesting a private package", async () => {
				await expect(
					api.dependencies({ name: "private_pkg", version: "1.0" })
				).to.be.rejectedWith(
					/Authentication error on remote 'local-test-server'/i
				);
			});
		});

		describe("Authenticated", () => {
			before(login);
			after(logout);

			it("should succeed when requesting a private package", async () => {
				await expect(
					api.dependencies({ name: "private_pkg", version: "1.0" })
				).to.be.fulfilled;
			});
		});

		it("should throw an error when requesting dependencies of a non-existent package", async () => {
			await expect(
				api.dependencies({ name: "non_existent_pkg", version: "1.0" })
			).to.be.rejectedWith(/(Couldn't find the following packages)/i);
		});

		it("should succeed when installing an existent package", async () => {
			await expect(
				api.dependencies({ name: "test_pkg1", version: "1.0" })
			).to.be.fulfilled;
		});
	});
});
