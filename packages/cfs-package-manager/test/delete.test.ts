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

describe("Delete Method Tests", function () {
	describe("ConanPkgManager Delete Integration Tests", function () {
		// Increase timeout for integration tests that involve package installation
		this.timeout(300000); // 5 minutes
		const testConfigDir = path.join(process.cwd(), "test_config");
		const testCacheDir = path.join(
			process.cwd(),
			"test_cache_delete"
		);
		const testConanHome = path.join(testCacheDir, "conan");

		async function cleanCache() {
			await fs.promises.rm(testCacheDir, {
				recursive: true,
				force: true
			});
			await fs.promises.rm(testConfigDir, {
				recursive: true,
				force: true
			});
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
			await api.init();
			const remotes = await api.listRemotes();
			for (const { name } of remotes) {
				await api.deleteRemote(name);
			}
			await api.addRemote(
				"local-test-server",
				"http://localhost:9300"
			);
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

		describe("Individual package deletion", function () {
			describe("When package is not installed", function () {
				it("should delete the package successfully", async function () {
					// First install a package to ensure it exists in cache
					const testPkg = { name: "test_pkg1", version: "1.0" };
					await api.install(testPkg);

					// Uninstall it to make it cached but not installed
					await api.uninstall(testPkg.name);

					// Now delete it from cache
					const deletedPackages = await api.delete("test_pkg1/1.0");
					expect(deletedPackages).to.be.an("array");
					expect(deletedPackages).to.deep.include.members([testPkg]);
				});
			});

			describe("When package is installed", function () {
				it("should throw an error and not delete the package", async function () {
					// Install a package
					const testPkg = { name: "test_pkg1", version: "1.0" };
					await api.install(testPkg);

					try {
						// Try to delete it while it's still installed - should fail
						await expect(
							api.delete("test_pkg1/1.0")
						).to.be.rejectedWith(/cannot delete.*still installed/i);
					} finally {
						// Clean up - uninstall the package
						await api.uninstall(testPkg.name);
					}
				});
			});

			describe("When package doesn't exist", function () {
				it("should throw an error", async function () {
					await expect(
						api.delete("non_existent_pkg/1.0")
					).to.be.rejectedWith(/no local packages found.*to delete/i);
				});
			});
		});

		describe("Wildcard pattern deletion", function () {
			describe("When no packages match pattern", function () {
				it("should throw an error", async function () {
					await expect(
						api.delete("non_existent_pattern*")
					).to.be.rejectedWith(/no local packages found.*to delete/i);
				});
			});

			describe("When matching packages exist", function () {
				beforeEach(async function () {
					// Install multiple test packages to populate cache
					const testPackages = [
						{ name: "test_pkg1", version: "1.0" },
						{ name: "test_pkg2", version: "1.0" },
						{ name: "test_pkg_dep1", version: "1.0" }
					];

					for (const pkg of testPackages) {
						await api.install(pkg);
					}
				});

				afterEach(async function () {
					// Clean up any remaining installed packages
					const installedPackages = await api.list();

					for (const pkg of installedPackages) {
						try {
							await api.uninstall(pkg.name);
						} catch (error) {
							// Ignore errors during cleanup
						}
					}
				});

				it("should delete only non-installed packages matching pattern", async function () {
					// Uninstall some packages to make them cached but not installed
					await api.uninstall("test_pkg1");
					await api.uninstall("test_pkg2");
					// Keep test_pkg_dep1 installed

					// Delete all test_pkg* packages (wildcard pattern)
					const deletedPackages = await api.delete("test_pkg*");

					expect(deletedPackages).to.be.an("array");
					expect(deletedPackages).to.have.length(2);
					expect(deletedPackages).to.deep.include.members([
						{ name: "test_pkg1", version: "1.0" },
						{ name: "test_pkg2", version: "1.0" }
					]);
					// test_pkg_dep1 should NOT be in the deleted list as it was still installed
					expect(deletedPackages).to.not.deep.include({
						name: "test_pkg_dep1",
						version: "1.0"
					});
				});

				it("should skip installed packages and inform user", async function () {
					// Uninstall only one package
					await api.uninstall("test_pkg1");
					// Keep test_pkg2 and test_pkg_dep1 installed

					// Try to delete all test_pkg* packages (wildcard pattern)
					const deletedPackages = await api.delete("test_pkg*");

					expect(deletedPackages).to.be.an("array");
					expect(deletedPackages).to.have.length(1);
					expect(deletedPackages).to.deep.include({
						name: "test_pkg1",
						version: "1.0"
					});
					// The other packages should have been skipped (not deleted)
				});

				it("should return an error when all matching packages are installed", async function () {
					// All packages are installed from beforeEach
					// Try to delete with wildcard - should skip all installed packages
					await expect(api.delete("test_pkg*")).to.be.rejectedWith(
						/cannot delete.*still installed/i
					);
				});
			});

			describe("Complex wildcard patterns", function () {
				beforeEach(async function () {
					// Install packages with different patterns
					const testPackages = [
						{ name: "test_pkg_consumer1", version: "1.0" },
						{ name: "test_pkg_consumer12", version: "1.0" },
						{ name: "test_pkg1", version: "1.0" }
					];

					for (const pkg of testPackages) {
						await api.install(pkg);
					}
				});

				afterEach(async function () {
					// Clean up
					const installedPackages = await api.list();
					for (const pkg of installedPackages) {
						try {
							await api.uninstall(pkg.name);
						} catch (error) {
							// Ignore cleanup errors
						}
					}
				});

				it("should handle specific wildcard patterns correctly", async function () {
					// Uninstall consumer packages to make them deletable
					await api.uninstall("test_pkg_consumer1");
					await api.uninstall("test_pkg_consumer12");
					// Keep test_pkg1 installed

					// Delete only consumer packages
					const deletedPackages = await api.delete(
						"test_pkg_consumer*"
					);

					expect(deletedPackages).to.be.an("array");
					expect(deletedPackages).to.have.length(2);
					expect(deletedPackages).to.deep.include.members([
						{ name: "test_pkg_consumer1", version: "1.0" },
						{ name: "test_pkg_consumer12", version: "1.0" }
					]);
					expect(deletedPackages).to.not.deep.include({
						name: "test_pkg1",
						version: "1.0"
					});
				});
			});
		});

		describe("Edge cases", function () {
			it("should handle patterns with special characters", async function () {
				await expect(
					api.delete("test-pkg-with-dashes*")
				).to.be.rejectedWith(/no local packages found.*to delete/i);
			});

			it("should handle version-specific patterns", async function () {
				// Install and then uninstall a package to cache it
				const testPkg = { name: "test_pkg1", version: "1.0" };
				await api.install(testPkg);
				await api.uninstall(testPkg.name);

				// Delete with version wildcard
				const deletedPackages = await api.delete("test_pkg1/*");
				expect(deletedPackages).to.be.an("array");
				expect(deletedPackages).to.deep.include(testPkg);
			});
		});

		describe("Error handling scenarios", function () {
			it("should throw an error when deleting a non-existent package", async function () {
				await expect(
					api.delete("non_existent_pkg/1.0")
				).to.be.rejectedWith(/no local packages found.*to delete/i);
			});

			it("should throw an error when deleting an installed package (individual)", async function () {
				const testPkg = { name: "test_pkg1", version: "1.0" };
				await api.install(testPkg);

				try {
					await expect(
						api.delete("test_pkg1/1.0")
					).to.be.rejectedWith(/cannot delete.*still installed/i);
				} finally {
					// Clean up
					await api.uninstall(testPkg.name);
				}
			});

			it("should throw an error when no packages match wildcard pattern", async function () {
				await expect(
					api.delete("non_matching_pattern*")
				).to.be.rejectedWith(/no local packages found.*to delete/i);
			});

			it("should succeed when deleting cached but not installed packages", async function () {
				const testPkg = { name: "test_pkg1", version: "1.0" };
				// Install then uninstall to create cached package
				await api.install(testPkg);
				await api.uninstall(testPkg.name);

				// Should succeed in deleting cached package
				await expect(api.delete("test_pkg1/1.0")).to.be.fulfilled;
			});
		});
	});
});
