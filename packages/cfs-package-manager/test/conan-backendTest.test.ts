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

import { expect } from "chai";

import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";
import { existsSync } from "fs";
import fs from "node:fs/promises";
import path from "node:path";
import type { CfsPackageReference } from "../src/index.js";

describe("ConanPkgManager", function () {
	const testCacheDir = path.join(process.cwd(), "test_cache");
	const testConfigDir = path.join(process.cwd(), "test_config");
	const testConanHome = path.join(testCacheDir, "conan");

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
		// These tests only use custom remotes
		await fs.rename(
			path.join(testConfigDir, "managedRemotes.json"),
			path.join(testConfigDir, "customRemotes.json")
		);
		// Make sure our custom remotes file is copied
		await fs.rm(path.join(testConfigDir, ".conanignore"), {
			force: true
		});
	}

	const api = new ConanPkgManager({
		conanHome: testConanHome,
		indexDir: testCacheDir,
		conanConfigPath: testConfigDir
	});

	before(cleanCache);
	after(cleanCache);

	before(setupTest);

	describe("init method", () => {
		it("should complete without errors", async function () {
			await api.init();
		});
	});

	// Note that this tests not only serve the purpose of testing the APIs but they also
	// allow test to run offline
	describe("Retrieve and delete all remote servers", () => {
		it("must leave an empty list of remote servers", async () => {
			const remotes = await api.listRemotes();
			expect(remotes).to.be.an("array").that.is.not.empty;
			for (const { name } of remotes) {
				await api.deleteRemote(name);
			}
			expect(await api.listRemotes()).to.be.an("array").that.is.empty;
		});
	});

	describe("Add a new server", () => {
		it("should complete without errors", async function () {
			await api.addRemote(
				"local-test-server",
				"http://localhost:9300"
			);
		});
	});

	describe("Login to remote server", () => {
		it("should return an error if credentials are invalid", async function () {
			return api
				.login(
					"local-test-server",
					"invalid_user",
					"invalid_password"
				)
				.then(
					() => {
						expect.fail("Should not succeed");
					},
					(error) => {
						expect(error).to.be.an("Error");
						expect((error as Error).message).to.include(
							"Wrong user or password."
						);
					}
				);
		});

		it("should complete without errors with valid credentials", async function () {
			await api.login(
				"local-test-server",
				"test_user",
				"test_password"
			);
		});
	});

	describe("Logout from remote server", () => {
		it("should complete without errors", async function () {
			await api.logout("local-test-server");
		});
	});

	describe("Before package installation", () => {
		describe("list method", () => {
			describe("without arguments", () => {
				it("should return an empty list", async function () {
					expect(await api.list()).to.be.empty;
				});
			});
			describe("with pattern argument", () => {
				it("should return an empty list", async function () {
					expect(await api.list("any_pattern")).to.be.empty;
				});
			});
		});
	});

	const pkgDepInfo = [
		{ ref: { name: "test_pkg1", version: "1.0" }, deps: [] },
		{ ref: { name: "test_pkg2", version: "1.0" }, deps: [] },
		{
			ref: { name: "test_pkg_consumer1", version: "1.0" },
			deps: [
				{ name: "test_pkg_dep1", version: "1.0" },
				{ name: "test_pkg_dep1dep", version: "1.0" }
			]
		},
		{
			ref: { name: "test_pkg_consumer12", version: "1.0" },
			deps: [
				{ name: "test_pkg_dep1", version: "1.0" },
				{ name: "test_pkg_dep2", version: "1.0" },
				{ name: "test_pkg_dep1dep", version: "1.0" }
			]
		}
	];

	pkgDepInfo.forEach(function (pkg) {
		describe(`dependencies(${pkg.ref.name}/${pkg.ref.version})`, function () {
			it("must return all package dependencies", async function () {
				expect(await api.dependencies(pkg.ref))
					.to.be.an("array")
					.that.include.deep.members(pkg.deps);
			});
		});

		describe(`When ${pkg.ref.name} is installed`, () => {
			const expectedInstalledPackages = [pkg.ref, ...pkg.deps];
			it("must return all newly installed packages", async function () {
				expect(await api.install(pkg.ref))
					.to.be.an("array")
					.that.include.deep.members(expectedInstalledPackages);
			});
			it("must be listed by list method", async function () {
				expect(await api.list())
					.to.be.an("array")
					.that.deep.includes(pkg.ref);
			});
			pkg.deps.forEach(function (dep) {
				it(`also installs the dependency ${dep.name}/${dep.version}`, async function () {
					expect(await api.list()).to.deep.include(dep);
				});
				it(`dependency ${dep.name} cannot be uninstalled`, async function () {
					return api.uninstall(dep.name).then(
						() => {
							expect.fail("Should not succeed");
						},
						() => {
							// Expected error
						}
					);
				});
			});

			expectedInstalledPackages.forEach(function (ref) {
				describe(`When ${ref.name} path is requested`, function () {
					it("Returned path exist", async function () {
						expect(existsSync(await api.getPath(ref.name))).to.be
							.true;
					});
				});
			});

			describe("When uninstalled", function () {
				it("succeed to be uninstalled", async function () {
					await api.uninstall(pkg.ref.name);
				});
				it("no longer is listed", async function () {
					expect(await api.list())
						.to.be.an("array")
						.that.not.deep.includes(pkg.ref);
				});
				pkg.deps.forEach(function (dep) {
					describe(`Dependency ${dep.name}/${dep.version}`, function () {
						it("can be uninstalled", async function () {
							await api.uninstall(dep.name);
						});
						it("is no longer listed", async function () {
							expect(await api.list())
								.to.be.an("array")
								.that.not.deep.includes(dep);
						});
					});
				});
			});
		});
	});

	describe("Search command", function () {
		it("Returns all packages starting by 'test_pkg'", async function () {
			expect(await api.search("test_pkg*"))
				.to.be.an("array")
				.that.include.deep.members([
					{ name: "test_pkg1", version: "1.0" },
					{ name: "test_pkg2", version: "1.0" },
					{ name: "test_pkg_dep1dep", version: "1.0" },
					{ name: "test_pkg_dep1", version: "1.0" },
					{ name: "test_pkg_dep2", version: "1.0" },
					{ name: "test_pkg_consumer1", version: "1.0" },
					{ name: "test_pkg_consumer2", version: "1.0" },
					{ name: "test_pkg_consumer12", version: "1.0" }
				]);
		});
		it("Returns all packages starting by 'test_pkg_dep'", async function () {
			expect(await api.search("test_pkg_dep*"))
				.to.be.an("array")
				.that.include.deep.members([
					{ name: "test_pkg_dep1dep", version: "1.0" },
					{ name: "test_pkg_dep1", version: "1.0" },
					{ name: "test_pkg_dep2", version: "1.0" }
				]);
		});
	});

	describe("localConsumers", function () {
		describe("run on on test_pkg_dep1dep", function () {
			describe("Before package is installed", function () {
				it("must return an error", async function () {
					return api.localConsumers("test_pkg_dep1dep").then(
						() => {
							expect.fail("Should not succeed");
						},
						() => {
							// Expected failure
						}
					);
				});
			});
			describe("After package is installed", function () {
				before(async function () {
					await api.install({
						name: "test_pkg_dep1dep",
						version: "1.0"
					});
				});
				after(async function () {
					await api.uninstall("test_pkg_dep1dep");
				});

				it("must return an empty list", async function () {
					expect(
						await api.localConsumers("test_pkg_dep1dep")
					).to.be.an("array").that.is.empty;
				});

				describe("After test_pkg_dep1 is installed", function () {
					before(async function () {
						await api.install({
							name: "test_pkg_dep1",
							version: "1.0"
						});
					});
					after(async function () {
						await api.uninstall("test_pkg_dep1");
					});

					it("must include test_pkg_dep1 as a consumer", async function () {
						expect(await api.localConsumers("test_pkg_dep1dep"))
							.to.be.an("array")
							.that.include.deep.members([
								{ name: "test_pkg_dep1", version: "1.0" }
							]);
					});
					describe("After test_pkg_consumer1 is installed", function () {
						before(async function () {
							await api.install({
								name: "test_pkg_consumer1",
								version: "1.0"
							});
						});
						after(async function () {
							await api.uninstall("test_pkg_consumer1");
						});

						it("must include test_pkg_consumer1 as a consumer", async function () {
							expect(await api.localConsumers("test_pkg_dep1dep"))
								.to.be.an("array")
								.that.include.deep.members([
									{ name: "test_pkg_dep1", version: "1.0" },
									{ name: "test_pkg_consumer1", version: "1.0" }
								]);
						});
					});
				});
			});
		});
	});

	const packageInfo = [
		{
			reference: { name: "test_pkg_plugin1", version: "1.0" },
			description: "A test package setting pkg type to plugin",
			license: "The license of the plugin",
			cfsVersion: "1.1.0",
			soc: ["plugin1Soc"],
			type: "plugin"
		},
		{
			reference: { name: "test_pkg_plugin2", version: "1.0" },
			description: "Another test package setting pkg type to plugin",
			license: "The license of the plugin",
			cfsVersion: "2.0.0",
			soc: ["plugin2Soc1", "plugin2Soc2"],
			type: "plugin"
		},
		{
			reference: { name: "test_pkg1", version: "1.0" },
			description: "A basic recipe",
			license: "<Your project license goes here>",
			cfsVersion: ""
		}
	];

	packageInfo.forEach((pkg) => {
		const referenceString = `${pkg.reference.name}/${pkg.reference.version}`;
		describe(`getPackageInfo(${referenceString})`, () => {
			it("Must return expected fields", async () => {
				const info = await api.getPackageInfo(pkg.reference);
				expect(info).to.deep.equal(pkg);
			});
		});
	});

	describe("list filtering", function () {
		const pkgsToInstall = [
			{ name: "test_pkg_plugin1", version: "1.0" },
			{ name: "test_pkg_plugin2", version: "1.0" },
			{ name: "test_pkg1", version: "1.0" },
			{ name: "test_pkg_consumer12", version: "1.0" }
		];
		before(async () => {
			for (const pkg of pkgsToInstall) {
				await api.install(pkg);
			}
		});
		after(async () => {
			for (const pkg of pkgsToInstall.reverse()) {
				await api.uninstall(pkg.name);
			}
		});

		const filtersToTest: {
			filter: Record<string, string | string[]>;
			expectedOutput: { name: string; version: string }[];
		}[] = [
			{
				filter: { soc: "plugin2Soc1" },
				expectedOutput: [{ name: "test_pkg_plugin2", version: "1.0" }]
			},
			{
				filter: { soc: "plugin1Soc" },
				expectedOutput: [{ name: "test_pkg_plugin1", version: "1.0" }]
			},
			{
				filter: { soc: ["plugin1Soc", "plugin2Soc1"] },
				expectedOutput: [
					{ name: "test_pkg_plugin1", version: "1.0" },
					{ name: "test_pkg_plugin2", version: "1.0" }
				]
			},
			{
				filter: { soc: "plugin1Soc", cfsVersion: "2.0.0" },
				expectedOutput: []
			},
			{
				filter: { soc: "plugin1Soc", type: "plugin" },
				expectedOutput: [{ name: "test_pkg_plugin1", version: "1.0" }]
			},
			{
				filter: { soc: "non-existing-soc", type: "not-plugin" },
				expectedOutput: []
			},
			{
				filter: { soc: "non-existing-soc" },
				expectedOutput: []
			},
			{
				filter: { type: "plugin" },
				expectedOutput: [
					{ name: "test_pkg_plugin1", version: "1.0" },
					{ name: "test_pkg_plugin2", version: "1.0" }
				]
			},
			{
				filter: { type: ["plugin", "not-plugin"] },
				expectedOutput: [
					{ name: "test_pkg_plugin1", version: "1.0" },
					{ name: "test_pkg_plugin2", version: "1.0" }
				]
			}
		] as const;
		for (const { filter, expectedOutput } of filtersToTest) {
			describe(`list("*",${JSON.stringify(filter)})`, () => {
				const expectedReturnString =
					expectedOutput.length > 0
						? expectedOutput
								.map(({ name, version }) => {
									return `${name}/${version}`;
								})
								.join(", ")
						: "an empty array";
				it(`must return ${expectedReturnString}`, async function () {
					expect(await api.list("*", filter)).to.deep.equal(
						expectedOutput
					);
				});
			});
		}
	});

	describe("Manifest handling", function () {
		const testCacheDir = path.join(process.cwd(), "test_cache");
		const tempManifestPath = path.join(
			testCacheDir,
			"test-manifest.json"
		);

		before(async function () {
			this.timeout(20000); // Increase timeout for installation
			// Ensure the test directory exists before each test
			await fs.mkdir(testCacheDir, { recursive: true });
			// Install some packages to have a baseline of "installed" packages for the tests
			await api.install({ name: "test_pkg1", version: "1.0" });
			await api.install({ name: "test_pkg2", version: "1.0" });
		});

		after(async function () {
			await api.uninstall("test_pkg1");
			await api.uninstall("test_pkg2");
		});

		// Helper to create a manifest file for testing with proper typing
		async function createManifestFile(
			packages: CfsPackageReference[]
		): Promise<string> {
			const manifest = {
				version: 1,
				packages
			};
			await fs.writeFile(tempManifestPath, JSON.stringify(manifest));
			return tempManifestPath;
		}

		afterEach(function (done) {
			// Clean up the manifest file after each test
			fs.unlink(tempManifestPath)
				.then(() => {
					done();
				})
				.catch(() => {
					done();
				}); // Ignore errors if file doesn't exist
		});

		describe("checkManifest", function () {
			it("should return empty array when all packages are installed", async function () {
				// Create a manifest with packages that are already installed
				const manifestPath = await createManifestFile([
					{ name: "test_pkg1", version: "1.0" },
					{ name: "test_pkg2", version: "1.0" }
				]);
				const result = await api.checkManifest(manifestPath);
				expect(result).to.be.an("array").that.is.empty;
			});
			it("should return missing packages when some packages are not installed", async function () {
				// Create a manifest with one installed and one not installed package
				const manifestPath = await createManifestFile([
					{ name: "test_pkg1", version: "1.0" }, // installed
					{ name: "test_pkg_consumer1", version: "1.0" } // not installed
				]);
				const result = await api.checkManifest(manifestPath);
				expect(result).to.be.an("array").with.lengthOf(1);
				expect(result[0]).to.deep.equal({
					name: "test_pkg_consumer1",
					version: "1.0"
				});
			});

			it("should handle manifest files with invalid format", async function () {
				// Create an invalid manifest file
				const invalidManifestPath = path.join(
					testCacheDir,
					"invalid-manifest.json"
				);

				await fs.writeFile(
					invalidManifestPath,
					JSON.stringify({ version: 1 })
				);

				return api
					.checkManifest(invalidManifestPath)
					.then(
						() => {
							expect.fail("Should not succeed with invalid format");
						},
						(error: Error) => {
							expect(error).to.be.an("Error");
							expect(error.message).to.include(
								"Invalid manifest format. Must contain 'version' and 'packages' fields."
							);
						}
					)
					.finally(() => {
						// Clean up invalid manifest file, ignore errors
						fs.unlink(invalidManifestPath).catch(() => {
							// Ignore errors during cleanup
						});
					});
			});
		});

		describe("installFromManifest", function () {
			it("should not install anything when all packages are already installed", async function () {
				// Create a manifest with packages that are already installed
				const manifestPath = await createManifestFile([
					{ name: "test_pkg1", version: "1.0" },
					{ name: "test_pkg2", version: "1.0" }
				]);
				const result = await api.installFromManifest(manifestPath);
				expect(result).to.be.an("array").that.is.empty;
			});
			it("should install only packages that are not already installed", async function () {
				// Create a manifest with one installed and one not installed packages
				const manifestPath = await createManifestFile([
					{ name: "test_pkg1", version: "1.0" }, // installed
					{ name: "test_pkg_consumer1", version: "1.0" } // not installed
				]);

				try {
					const result = await api.installFromManifest(manifestPath);
					expect(result).to.be.an("array").with.length.greaterThan(0);
					expect(result).to.deep.include({
						name: "test_pkg_consumer1",
						version: "1.0"
					});

					// Verify the package is now installed
					const installedPackages = await api.list();
					expect(
						installedPackages.some(
							(p) =>
								p.name === "test_pkg_consumer1" && p.version === "1.0"
						)
					).to.be.true;
				} finally {
					// Clean up - uninstall the package we just installed
					try {
						await api.uninstall("test_pkg_consumer1");
						await api.uninstall("test_pkg_dep1");
						await api.uninstall("test_pkg_dep1dep");
					} catch (error) {
						// Ignore errors during cleanup
					}
				}
			});
			it("should handle invalid manifest file paths", async function () {
				return api
					.installFromManifest("/non-existent-path.json")
					.then(
						() => {
							expect.fail("Should not succeed with invalid path");
						},
						(error: Error) => {
							expect(error).to.be.an("Error");
							expect(error.message).to.include(
								"Manifest file not found"
							);
						}
					);
			});
		});
	});

	describe("getInstalledPackageInfo", function () {
		const pkgsToInstall = [
			{ name: "test_pkg_plugin1", version: "1.0" },
			{ name: "test_pkg_plugin2", version: "1.0" },
			{ name: "test_pkg1", version: "1.0" },
			{ name: "test_pkg_consumer12", version: "1.0" }
		];

		before(async function () {
			this.timeout(20000); // Increase timeout for installation
			for (const pkg of pkgsToInstall) {
				await api.install(pkg);
			}
		});

		after(async function () {
			for (const pkg of pkgsToInstall.reverse()) {
				await api.uninstall(pkg.name);
			}
		});

		it("should return all installed packages with name, version, path", async function () {
			const result = await api.getInstalledPackageInfo();
			expect(result).to.be.an("array");
			expect(result.length).to.be.greaterThan(0);

			// Verify each package has the required properties
			for (const pkg of result) {
				expect(pkg).to.have.property("name");
				expect(pkg).to.have.property("version");
				expect(pkg).to.have.property("path");

				// Verify path exists
				expect(existsSync(pkg.path)).to.be.true;
			}

			// Verify all installed packages are included
			const names = result.map((pkg) => pkg.name);
			expect(names).to.include("test_pkg_plugin1");
			expect(names).to.include("test_pkg_plugin2");
			expect(names).to.include("test_pkg1");
			expect(names).to.include("test_pkg_consumer12");
		});

		describe("with filter", function () {
			it("should return only packages with type 'plugin'", async function () {
				const result = await api.getInstalledPackageInfo({
					type: "plugin"
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(2);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_plugin1",
					"test_pkg_plugin2"
				]);

				// Verify all returned packages have type 'plugin'
				for (const pkg of result) {
					expect(pkg.type).to.equal("plugin");
				}
			});

			it("should return packages matching single value", async function () {
				const result = await api.getInstalledPackageInfo({
					soc: "plugin1Soc"
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(1);
				expect(result[0].name).to.equal("test_pkg_plugin1");
			});

			it("should return packages matching any value in array filter", async function () {
				const result = await api.getInstalledPackageInfo({
					soc: ["plugin1Soc", "plugin2Soc1"]
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(2);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_plugin1",
					"test_pkg_plugin2"
				]);
			});

			it("should return packages matching two filter properties", async function () {
				const result = await api.getInstalledPackageInfo({
					type: "plugin",
					soc: "plugin1Soc"
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(1);
				expect(result[0].name).to.equal("test_pkg_plugin1");
				expect(result[0].type).to.equal("plugin");
			});

			it("should return empty array when filters don't match any package", async function () {
				const result = await api.getInstalledPackageInfo({
					type: "plugin",
					soc: "non-existent-soc"
				});
				expect(result).to.be.an("array").that.is.empty;
			});

			it("should handle array filter values with multiple properties", async function () {
				const result = await api.getInstalledPackageInfo({
					type: ["plugin", "tool"],
					soc: ["plugin1Soc", "plugin2Soc2"]
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(2);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_plugin1",
					"test_pkg_plugin2"
				]);
			});
		});
	});
});
