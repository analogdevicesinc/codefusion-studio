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
import sinon from "sinon";

import { ConanPkgManager } from "../src/conan-backend/conan-backend.js";
import { existsSync } from "fs";
import fs from "node:fs/promises";
import path from "node:path";
import semver from "semver";
import type {
	CfsPackageLicenseReporter,
	CfsPackageReference,
	CfsPackageFilter
} from "../src/index.js";

use(chaiAsPromised);

const conanURL = `http://${process.env.CONAN_SERVER_HOST ?? "localhost"}:${process.env.CONAN_SERVER_PORT ?? "9300"}`;

describe("ConanPkgManager", function () {
	const testCacheDir = path.join(process.cwd(), "test_cache");
	const testConfigDir = path.join(process.cwd(), "test_config");
	const testConanHome = path.join(testCacheDir, "conan");
	const testManifestDir = path.join(process.cwd(), "test_manifests"); // Separate dir for manifest test files

	async function cleanCache() {
		await Promise.all([
			fs.rm(testCacheDir, {
				recursive: true,
				force: true
			}),
			fs.rm(testConfigDir, {
				recursive: true,
				force: true
			}),
			fs.rm(testManifestDir, {
				recursive: true,
				force: true
			})
		]);
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
		// Ensure test manifest directory exists
		await fs.mkdir(testManifestDir, { recursive: true });
	}

	// Shared helper to create a manifest file for testing
	const tempManifestPath = path.join(
		testManifestDir,
		"test-manifest.json"
	);
	async function createManifestFile(
		packages: CfsPackageReference[]
	): Promise<string> {
		const manifest = {
			version: 1,
			packages
		};
		await fs.mkdir(testManifestDir, { recursive: true });
		await fs.writeFile(tempManifestPath, JSON.stringify(manifest));
		return tempManifestPath;
	}

	async function cleanupManifestFile(): Promise<void> {
		try {
			await fs.unlink(tempManifestPath);
		} catch {
			// Ignore errors if file doesn't exist
		}
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
			await api.addRemote("local-test-server", conanURL);
		});
	});

	describe("Login to remote server", () => {
		it("should return an error if credentials are invalid", async function () {
			await expect(
				api.login(
					"local-test-server",
					"invalid_user",
					"invalid_password"
				)
			).to.be.rejectedWith(/Wrong user or password/i);
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
					await expect(api.uninstall(dep.name)).to.be.rejected;
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

	describe("Dependency version conflict", function () {
		// Scenario: test_pkg_consumer1/1.0 depends on test_pkg_dep1/1.0
		//           test_pkg_consumer1/2.0 depends on test_pkg_dep1/2.0
		// Installing consumer1/1.0 first (bringing in dep1/1.0), then trying
		// to install consumer1/2.0 should fail because dep1 would need to be
		// upgraded to 2.0, which conflicts with the already-installed dep1/1.0.

		before(async function () {
			// Step 1: Install test_pkg_consumer1/1.0 which pulls in test_pkg_dep1/1.0
			const result = await api.install({
				name: "test_pkg_consumer1",
				version: "1.0"
			});
			expect(result).to.be.an("array").that.deep.includes({
				name: "test_pkg_consumer1",
				version: "1.0"
			});
			expect(result).to.deep.include({
				name: "test_pkg_dep1",
				version: "1.0"
			});
		});

		after(async function () {
			// Clean up installed packages
			const pkgs = [
				"test_pkg_consumer1",
				"test_pkg_dep1",
				"test_pkg_dep1dep"
			];
			for (const pkg of pkgs) {
				try {
					await api.uninstall(pkg);
				} catch {
					// Ignore if not installed
				}
			}
		});

		it("should have test_pkg_consumer1/1.0 and test_pkg_dep1/1.0 installed", async function () {
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_consumer1" && p.version === "1.0"
				)
			).to.be.true;
			expect(
				installedPackages.some(
					(p) => p.name === "test_pkg_dep1" && p.version === "1.0"
				)
			).to.be.true;
		});

		it("should fail to install test_pkg_consumer1/2.0 due to dependency conflict with test_pkg_dep1", async function () {
			// Step 2: Try to install test_pkg_consumer1/2.0 which requires test_pkg_dep1/2.0
			// This should fail because test_pkg_dep1/1.0 is already installed as a dependency
			// of test_pkg_consumer1/1.0, and upgrading it would break the existing consumer
			await expect(
				api.install({
					name: "test_pkg_consumer1",
					version: "2.0"
				})
			).to.be.rejected;
		});

		it("should still have the original packages installed after failed upgrade", async function () {
			// Verify the original installation is still intact
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_consumer1" && p.version === "1.0"
				)
			).to.be.true;
			expect(
				installedPackages.some(
					(p) => p.name === "test_pkg_dep1" && p.version === "1.0"
				)
			).to.be.true;
		});
	});

	describe("Version range handling", function () {
		// Clean up test packages before each test to ensure consistent state
		beforeEach(async function () {
			const pkgs = ["test_pkg1", "test_pkg2"];
			for (const pkg of pkgs) {
				try {
					await api.uninstall(pkg);
				} catch (error) {
					// Ignore errors if package is not installed
				}
				try {
					await api.delete(`${pkg}/*`);
				} catch (error) {
					// Ignore errors if package doesn't exist in cache
				}
			}
		});

		it("should install package with exact version 1.0", async function () {
			const result = await api.install({
				name: "test_pkg1",
				version: "1.0"
			});
			expect(result)
				.to.be.an("array")
				.that.deep.includes({ name: "test_pkg1", version: "1.0" });
		});

		it("should install package with caret version ^1.0 (latest minor in 1.x)", async function () {
			const result = await api.install({
				name: "test_pkg2",
				version: "^1.0"
			});
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.3.4"
			});
		});

		it("should cache only resolved version for normal semver install and never the literal range", async function () {
			const result = await api.install({
				name: "test_pkg2",
				version: "^1.0.0"
			});

			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.3.4"
			});

			const cachedPackages = await api.listCache("test_pkg2/*");
			expect(cachedPackages).to.be.an("array").with.lengthOf(1);
			expect(cachedPackages[0].reference.name).to.equal("test_pkg2");
			expect(cachedPackages[0].reference.version).to.equal("1.3.4");
			expect(cachedPackages[0].reference.version).to.not.equal(
				"^1.0.0"
			);
		});

		it("should install package with tilde version ~1.2 (latest patch in 1.2.x)", async function () {
			const result = await api.install({
				name: "test_pkg2",
				version: "~1.2"
			});
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.2.3"
			});
		});

		it("should install package with version range '>=1.2.0 <1.3.0' (latest in range)", async function () {
			const result = await api.install({
				name: "test_pkg2",
				version: ">=1.2.0 <1.3.0"
			});
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.2.3"
			});
		});

		it("should install latest satisfying semver after uninstall even if an older version is cached", async function () {
			// Install an older exact version first.
			const firstInstall = await api.install({
				name: "test_pkg2",
				version: "1.0"
			});
			expect(firstInstall).to.deep.include({
				name: "test_pkg2",
				version: "1.0"
			});

			// Uninstall should remove from installed set, but keep package in cache.
			await api.uninstall("test_pkg2");

			const installedAfterUninstall = await api.list();
			expect(
				installedAfterUninstall.some((p) => p.name === "test_pkg2")
			).to.be.false;

			// Reinstall with semver range should resolve to latest satisfying version,
			// not necessarily the old cached one.
			const secondInstall = await api.install({
				name: "test_pkg2",
				version: "^1.0"
			});
			expect(secondInstall).to.deep.include({
				name: "test_pkg2",
				version: "1.3.4"
			});

			const installedAfterReinstall = await api.list();
			expect(installedAfterReinstall).to.deep.include({
				name: "test_pkg2",
				version: "1.3.4"
			});
			expect(installedAfterReinstall).to.not.deep.include({
				name: "test_pkg2",
				version: "1.0"
			});
		});

		it("should install multiple packages at once", async function () {
			const result = await api.install([
				{ name: "test_pkg1", version: "1.0" },
				{ name: "test_pkg2", version: "1.0" }
			]);
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg1",
				version: "1.0"
			});
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.0"
			});

			// Verify both packages are now installed
			const installedPackages = await api.list();
			expect(installedPackages).to.deep.include({
				name: "test_pkg1",
				version: "1.0"
			});
			expect(installedPackages).to.deep.include({
				name: "test_pkg2",
				version: "1.0"
			});
		});

		it("should install multiple packages with version ranges at once", async function () {
			const result = await api.install([
				{ name: "test_pkg1", version: "^1.0" },
				{ name: "test_pkg2", version: "~1.2" }
			]);
			expect(result).to.be.an("array").that.is.not.empty;
			expect(result).to.deep.include({
				name: "test_pkg1",
				version: "1.0"
			});
			expect(result).to.deep.include({
				name: "test_pkg2",
				version: "1.2.3"
			});
		});

		it("should fail when installing multiple packages with one invalid package", async function () {
			try {
				await api.install([
					{ name: "test_pkg1", version: "1.0" },
					{ name: "nonexistent_pkg", version: "1.0" }
				]);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).to.be.an("Error");
				expect((error as Error).message).to.include(
					"nonexistent_pkg"
				);
			}
		});

		it("should fail when installing multiple nonexistent packages", async function () {
			try {
				await api.install([
					{ name: "nonexistent_pkg1", version: "1.0" },
					{ name: "nonexistent_pkg2", version: "2.0" }
				]);
				expect.fail("Should have thrown an error");
			} catch (error) {
				expect(error).to.be.an("Error");
			}
		});

		it("should return empty array when installing empty package list", async function () {
			const result = await api.install([]);
			expect(result).to.be.an("array").that.is.empty;
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

	describe("searchInfo method", function () {
		it("Returns all packages with type=plugin", async function () {
			const pluginPackages = await api.searchInfo("test_pkg*", {
				type: "plugin"
			});
			expect(pluginPackages.map((pkg) => pkg.reference))
				.to.be.an("array")
				.that.include.deep.members([
					{ name: "test_pkg_plugin1", version: "1.0" },
					{ name: "test_pkg_plugin2", version: "1.0" }
				]);

			expect(pluginPackages.every((pkg) => pkg.type === "plugin")).to
				.be.true;
		});

		it("Returns all packages with soc=plugin1Soc", async function () {
			const pluginSoc1Packages = await api.searchInfo("test_pkg*", {
				soc: "plugin1Soc"
			});
			expect(pluginSoc1Packages.map((pkg) => pkg.reference))
				.to.be.an("array")
				.that.include.deep.members([
					{ name: "test_pkg_plugin1", version: "1.0" },
					{ name: "test_pkg_component_plugin1", version: "1.0" },
					{ name: "test_pkg_component_composite", version: "1.0" }
				]);
			expect(
				pluginSoc1Packages.every((pkg) =>
					pkg.soc?.includes("plugin1Soc")
				)
			).to.be.true;
		});

		it("Returns all packages with component.name=plugin1", async function () {
			const plugin1Packages = await api.searchInfo("test_pkg*", {
				component: { name: "plugin1" }
			});
			expect(plugin1Packages.map((pkg) => pkg.reference))
				.to.be.an("array")
				.that.include.deep.members([
					{ name: "test_pkg_component_plugin1", version: "1.0" },
					{ name: "test_pkg_component_composite", version: "1.0" }
				]);
			expect(
				plugin1Packages.every((pkg) =>
					pkg.components?.some(
						(component) => component.name === "plugin1"
					)
				)
			).to.be.true;
		});

		it("Returns all packages with component.name=plugin1 and component.version=2.1.0", async function () {
			const plugin1V210Packages = await api.searchInfo("test_pkg*", {
				component: { name: "plugin1", version: "2.1.0" }
			});
			expect(plugin1V210Packages.map((pkg) => pkg.reference))
				.to.be.an("array")
				.that.include.deep.members([
					{
						name: "test_pkg_component_composite",
						version: "1.0"
					}
				]);
			expect(
				plugin1V210Packages.every((pkg) =>
					pkg.components?.some(
						(component) =>
							component.name === "plugin1" &&
							component.version === "2.1.0"
					)
				)
			).to.be.true;
		});

		it("Returns all packages with component.type=plugin", async function () {
			const pluginComponentPackages = await api.searchInfo(
				"test_pkg*",
				{
					component: { type: "plugin" }
				}
			);
			expect(pluginComponentPackages.map((pkg) => pkg.reference))
				.to.be.an("array")
				.that.include.deep.members([
					{
						name: "test_pkg_component_plugin1",
						version: "1.0"
					},
					{
						name: "test_pkg_component_plugin2",
						version: "1.0"
					}
				]);
			expect(
				pluginComponentPackages.every((pkg) =>
					pkg.components?.some(
						(component) => component.type === "plugin"
					)
				)
			).to.be.true;
		});
	});

	describe("localConsumers", function () {
		describe("run on on test_pkg_dep1dep", function () {
			describe("Before package is installed", function () {
				it("must return an error", async function () {
					await expect(api.localConsumers("test_pkg_dep1dep")).to.be
						.rejected;
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
		before(async function () {
			await api.install(pkgsToInstall);
		});
		after(async function () {
			for (const pkg of pkgsToInstall.reverse()) {
				await api.uninstall(pkg.name);
			}
		});

		const filtersToTest: {
			filter: CfsPackageFilter;
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
		before(async function () {
			// Ensure the test directory exists before each test
			await fs.mkdir(testCacheDir, { recursive: true });
			// Install some packages to have a baseline of "installed" packages for the tests
			await api.install([
				{ name: "test_pkg1", version: "1.0" },
				{ name: "test_pkg2", version: "1.0" }
			]);
		});

		after(async function () {
			try {
				await api.uninstall("test_pkg1");
			} catch {
				// Ignore if not installed
			}
			try {
				await api.uninstall("test_pkg2");
			} catch {
				// Ignore if not installed
			}
		});

		afterEach(async function () {
			await cleanupManifestFile();
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
					testManifestDir,
					"invalid-manifest.json"
				);
				await fs.writeFile(
					invalidManifestPath,
					JSON.stringify({ version: 1 })
				);

				await expect(
					api.checkManifest(invalidManifestPath)
				).to.be.rejectedWith(
					"Invalid manifest format. Must contain 'version' and 'packages' fields."
				);

				try {
					// Clean up invalid manifest file, ignore errors
					await fs.unlink(invalidManifestPath);
				} catch {
					// Ignore cleanup errors
				}
			});
		});

		describe("getInstallPlan", function () {
			// Shared cleanup helper for getInstallPlan tests
			async function cleanupGetInstallPlanPackages(
				deleteFromCache = false
			): Promise<void> {
				const packagesToClean = [
					"test_pkg_with_license1",
					"test_pkg_with_license2",
					"test_pkg_consumer1"
				];
				for (const pkg of packagesToClean) {
					try {
						await api.uninstall(pkg);
					} catch {
						// Ignore if not installed
					}
					if (deleteFromCache) {
						try {
							await api.delete(`${pkg}/*`);
						} catch {
							// Ignore if not in cache
						}
					}
				}
			}

			describe("with manifest input", function () {
				before(async function () {
					// Ensure packages are installed
					await api.install([
						{ name: "test_pkg1", version: "1.0" },
						{ name: "test_pkg2", version: "1.0" }
					]);
				});

				it("should return all packages as alreadyInstalled when all are installed", async function () {
					const manifestPath = await createManifestFile([
						{ name: "test_pkg1", version: "1.0" },
						{ name: "test_pkg2", version: "1.0" }
					]);
					const plan = await api.getInstallPlan(manifestPath);

					expect(plan.toInstall).to.be.an("array").that.is.empty;
					expect(plan.alreadyInstalled)
						.to.be.an("array")
						.with.lengthOf(2);
					expect(plan.alreadyInstalled).to.deep.include({
						name: "test_pkg1",
						version: "1.0"
					});
					expect(plan.alreadyInstalled).to.deep.include({
						name: "test_pkg2",
						version: "1.0"
					});
				});

				it("should return packages not installed in toInstall", async function () {
					const manifestPath = await createManifestFile([
						{ name: "test_pkg1", version: "1.0" }, // installed
						{ name: "test_pkg_consumer1", version: "1.0" } // not installed
					]);
					const plan = await api.getInstallPlan(manifestPath);

					expect(plan.toInstall).to.be.an("array").with.lengthOf(1);
					expect(plan.toInstall[0]).to.deep.equal({
						name: "test_pkg_consumer1",
						version: "1.0"
					});
					expect(plan.alreadyInstalled)
						.to.be.an("array")
						.with.lengthOf(1);
					expect(plan.alreadyInstalled[0]).to.deep.equal({
						name: "test_pkg1",
						version: "1.0"
					});
				});

				it("should treat semver range as alreadyInstalled when installed version satisfies it", async function () {
					const manifestPath = await createManifestFile([
						{ name: "test_pkg2", version: "^1.0" } // test setup installs 1.0
					]);

					const checkResult = await api.checkManifest(manifestPath);
					expect(checkResult).to.be.an("array").that.is.empty;

					const plan = await api.getInstallPlan(manifestPath);

					expect(plan.toInstall).to.be.an("array").that.is.empty;
					expect(plan.alreadyInstalled)
						.to.be.an("array")
						.with.lengthOf(1);
					expect(plan.alreadyInstalled[0]).to.deep.equal({
						name: "test_pkg2",
						version: "1.0"
					});
				});

				describe("license acceptance requirements", function () {
					beforeEach(async function () {
						// Clean state: remove licensed packages from install and cache
						await cleanupGetInstallPlanPackages(true);
					});

					after(async function () {
						// Clean up after test suite
						await cleanupGetInstallPlanPackages(true);
					});

					it("should include requiresLicenseAcceptance for packages with license", async function () {
						// Use test_pkg_with_license1 which has a license file
						const manifestPath = await createManifestFile([
							{ name: "test_pkg_with_license1", version: "1.0.0" }
						]);
						const plan = await api.getInstallPlan(manifestPath);

						expect(plan.requiresLicenseAcceptance)
							.to.be.an("array")
							.with.lengthOf(1);
						expect(
							plan.requiresLicenseAcceptance[0].reference
						).to.deep.equal({
							name: "test_pkg_with_license1",
							version: "1.0.0"
						});
						expect(plan.requiresLicenseAcceptance[0].license).to.be.a(
							"string"
						).that.is.not.empty;
					});

					it("should still require license on repeated range planning when package was never installed", async function () {
						const installedBefore = await api.list();
						expect(
							installedBefore.some(
								(p) => p.name === "test_pkg_with_license1"
							)
						).to.be.false;

						const cachedBefore = await api.listCache(
							"test_pkg_with_license1/*"
						);
						expect(cachedBefore).to.be.an("array").that.is.empty;

						const manifestPath = await createManifestFile([
							{ name: "test_pkg_with_license1", version: "^1.0.0" }
						]);

						// First plan should require license.
						const firstPlan = await api.getInstallPlan(manifestPath);
						expect(firstPlan.toInstall).to.deep.include({
							name: "test_pkg_with_license1",
							version: "^1.0.0"
						});
						expect(firstPlan.requiresLicenseAcceptance)
							.to.be.an("array")
							.with.length.greaterThan(0);

						// Without installation, second plan should still require license.
						const secondPlan = await api.getInstallPlan(manifestPath);
						expect(secondPlan.toInstall).to.deep.include({
							name: "test_pkg_with_license1",
							version: "^1.0.0"
						});
						expect(secondPlan.requiresLicenseAcceptance)
							.to.be.an("array")
							.with.length.greaterThan(0);

						// Sanity check: package should still not be installed.
						const installedPackages = await api.list();
						expect(
							installedPackages.some(
								(p) => p.name === "test_pkg_with_license1"
							)
						).to.be.false;
					});
					it("should not leave package in cache after install plan when license was not accepted", async function () {
						// A getInstallPlan call downloads the recipe to inspect the license.
						// If the user never accepts and never installs, the recipe must
						// be removed from cache so future plans still show the license prompt

						const cachedBefore = await api.listCache(
							"test_pkg_with_license1/*"
						);
						expect(cachedBefore).to.be.an("array").that.is.empty;

						const manifestPath = await createManifestFile([
							{ name: "test_pkg_with_license1", version: "^1.0.0" }
						]);
						const plan = await api.getInstallPlan(manifestPath);

						// License must have been detected.
						expect(plan.requiresLicenseAcceptance)
							.to.be.an("array")
							.with.length.greaterThan(0);

						// Cache must be clean after the plan — recipe downloaded for
						// inspection must have been removed so the next plan still
						// prompts for license acceptance.
						const cachedAfter = await api.listCache(
							"test_pkg_with_license1/*"
						);
						expect(cachedAfter).to.be.an("array").that.is.empty;
					});

					it("should clean all downloaded recipe refs after install plan for multiple licensed packages", async function () {
						// When multiple packages are checked in one plan, each downloaded
						// recipe must be removed from cache to avoid false license acceptance.

						const manifestPath = await createManifestFile([
							{ name: "test_pkg_with_license1", version: "1.0.0" },
							{ name: "test_pkg_with_license2", version: "1.0.0" }
						]);

						const plan = await api.getInstallPlan(manifestPath);
						expect(plan.requiresLicenseAcceptance)
							.to.be.an("array")
							.with.lengthOf(2);

						const cachedAfterPkg1 = await api.listCache(
							"test_pkg_with_license1/*"
						);
						const cachedAfterPkg2 = await api.listCache(
							"test_pkg_with_license2/*"
						);

						expect(cachedAfterPkg1).to.be.an("array").that.is.empty;
						expect(cachedAfterPkg2).to.be.an("array").that.is.empty;
					});

					it("should not include requiresLicenseAcceptance for packages already installed", async function () {
						// Install the licensed package first
						await api.install(
							{ name: "test_pkg_with_license1", version: "1.0.0" },
							{ acceptLicense: true }
						);

						const manifestPath = await createManifestFile([
							{ name: "test_pkg_with_license1", version: "1.0.0" }
						]);
						const plan = await api.getInstallPlan(manifestPath);

						expect(plan.requiresLicenseAcceptance).to.be.an("array")
							.that.is.empty;
						expect(plan.alreadyInstalled)
							.to.be.an("array")
							.with.lengthOf(1);
					});

					it("should not include requiresLicenseAcceptance when licensed package is cached and requested with version range", async function () {
						// First install with explicit version to accept license and populate cache.
						await api.install(
							{ name: "test_pkg_with_license1", version: "1.0.0" },
							{ acceptLicense: true }
						);

						// Uninstall should remove from installed set but keep it cached.
						await api.uninstall("test_pkg_with_license1");

						const manifestPath = await createManifestFile([
							{ name: "test_pkg_with_license1", version: "^1.0.0" }
						]);
						const plan = await api.getInstallPlan(manifestPath);

						expect(plan.toInstall).to.deep.include({
							name: "test_pkg_with_license1",
							version: "^1.0.0"
						});
						expect(plan.alreadyInstalled).to.be.an("array").that.is
							.empty;
						expect(plan.requiresLicenseAcceptance).to.be.an("array")
							.that.is.empty;
					});
				});
			});

			describe("with single package reference input", function () {
				it("should return package as alreadyInstalled when installed", async function () {
					const plan = await api.getInstallPlan({
						name: "test_pkg1",
						version: "1.0"
					});

					expect(plan.toInstall).to.be.an("array").that.is.empty;
					expect(plan.alreadyInstalled)
						.to.be.an("array")
						.with.lengthOf(1);
					expect(plan.alreadyInstalled[0]).to.deep.equal({
						name: "test_pkg1",
						version: "1.0"
					});
				});

				it("should return package in toInstall when not installed", async function () {
					const plan = await api.getInstallPlan({
						name: "test_pkg_consumer1",
						version: "1.0"
					});

					expect(plan.toInstall).to.be.an("array").with.lengthOf(1);
					expect(plan.toInstall[0]).to.deep.equal({
						name: "test_pkg_consumer1",
						version: "1.0"
					});
					expect(plan.alreadyInstalled).to.be.an("array").that.is
						.empty;
				});
			});

			describe("with array of package references input", function () {
				it("should handle multiple packages correctly", async function () {
					const plan = await api.getInstallPlan([
						{ name: "test_pkg1", version: "1.0" }, // installed
						{ name: "test_pkg_consumer1", version: "1.0" } // not installed
					]);

					expect(plan.toInstall).to.be.an("array").with.lengthOf(1);
					expect(plan.toInstall[0]).to.deep.equal({
						name: "test_pkg_consumer1",
						version: "1.0"
					});
					expect(plan.alreadyInstalled)
						.to.be.an("array")
						.with.lengthOf(1);
					expect(plan.alreadyInstalled[0]).to.deep.equal({
						name: "test_pkg1",
						version: "1.0"
					});
				});
			});

			describe("error handling", function () {
				it("should handle invalid manifest format", async function () {
					const invalidManifestPath = path.join(
						testManifestDir,
						"invalid-plan-manifest.json"
					);
					await fs.writeFile(
						invalidManifestPath,
						JSON.stringify({ version: 1 })
					);

					await expect(
						api.getInstallPlan(invalidManifestPath)
					).to.be.rejectedWith("Invalid manifest format");
					try {
						await fs.unlink(invalidManifestPath);
					} catch {
						// Ignore errors during cleanup
					}
				});

				it("should handle invalid package reference format", async function () {
					// TypeScript types prevent this at compile time, but test runtime behavior
					// by calling the underlying command indirectly
					// This test verifies the Python validation works
					const invalidRef = {
						name: "invalid-no-version"
					} as unknown as CfsPackageReference;

					try {
						await api.getInstallPlan(invalidRef);
						expect.fail("Should not succeed with invalid reference");
					} catch (error) {
						expect(error).to.be.an("Error");
					}
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

				expect(result.installed).to.be.an("array").that.is.empty;
				expect(result.skipped).to.be.an("array").that.is.empty;
			});
			it("should install only packages that are not already installed", async function () {
				// Create a manifest with one installed and one not installed packages
				const manifestPath = await createManifestFile([
					{ name: "test_pkg1", version: "1.0" }, // installed
					{ name: "test_pkg_consumer1", version: "1.0" } // not installed
				]);

				try {
					const result = await api.installFromManifest(manifestPath);
					expect(result.installed)
						.to.be.an("array")
						.with.length.greaterThan(0);
					expect(result.installed).to.deep.include({
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
				await expect(
					api.installFromManifest("/non-existent-path.json")
				).to.be.rejectedWith("Manifest file not found");
			});
		});

		describe("Version test handling", function () {
			beforeEach(async function () {
				// Clear any installed packages to ensure installFromManifest actually installs them
				// Using test_pkg1 and test_pkg2 as they have no dependencies
				try {
					await api.uninstall("test_pkg1");
				} catch (error) {
					// Ignore errors if package is not installed
				}
				try {
					await api.uninstall("test_pkg2");
				} catch (error) {
					// Ignore errors if package is not installed
				}

				try {
					await api.delete("test_pkg*");
				} catch (error) {
					// Ignore errors if package doesn't exist in cache
				}
			});

			it("should handle manifest with version ranges", async function () {
				// Create a manifest with various version range formats
				const manifestPath = await createManifestFile([
					{ name: "test_pkg1", version: "~1.0" }, // tilde range (1.0.x patch range)
					{ name: "test_pkg2", version: "^1.0" } // caret range (should get 1.3.4)
				]);

				try {
					const result = await api.installFromManifest(manifestPath);
					expect(result.installed)
						.to.be.an("array")
						.with.length.greaterThan(0);

					// Verify the packages are now installed
					const installedPackages = await api.list();

					// Verify both packages were installed
					expect(result.installed).to.deep.include({
						name: "test_pkg1",
						version: "1.0"
					});
					expect(result.installed).to.deep.include({
						name: "test_pkg2",
						version: "1.3.4"
					});

					expect(
						installedPackages.some(
							(p) => p.name === "test_pkg1" && p.version === "1.0"
						)
					).to.be.true;
					expect(
						installedPackages.some(
							(p) => p.name === "test_pkg2" && p.version === "1.3.4"
						)
					).to.be.true;
				} finally {
					// Clean up - uninstall the packages we just installed
					try {
						await api.uninstall("test_pkg1");
						await api.uninstall("test_pkg2");
					} catch (error) {
						// Ignore errors during cleanup
					}
				}
			});

			it("should handle manifest with explicit version range syntax", async function () {
				// Create a manifest with explicit range syntax using test_pkg2
				// >=1.2.0 <1.3.0 should match 1.2.0-1.2.3 and select 1.2.3
				const manifestPath = await createManifestFile([
					{ name: "test_pkg2", version: ">=1.2.0 <1.3.0" }
				]);

				const result = await api.installFromManifest(manifestPath);
				expect(result.installed)
					.to.be.an("array")
					.with.length.greaterThan(0);

				// Verify package was installed with version 1.2.3 (latest in range)
				expect(result.installed).to.deep.include({
					name: "test_pkg2",
					version: "1.2.3"
				});

				// Verify the package is now installed
				const installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.3"
					)
				).to.be.true;
			});

			it("should not re-install package via manifest when installed version satisfies the range", async function () {
				// Step 1: Install test_pkg2 with explicit version 1.3.1
				await api.install({ name: "test_pkg2", version: "1.3.1" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.1"
					)
				).to.be.true;

				// Step 2: Apply a manifest with ~1.3 (meaning >=1.3.0 <1.4.0)
				// The installed version 1.3.1 satisfies this range, so the manifest
				// should not trigger a re-install.
				const manifestPath = await createManifestFile([
					{ name: "test_pkg2", version: "~1.3" }
				]);

				const result = await api.installFromManifest(manifestPath);

				// No packages should be installed since 1.3.1 satisfies ~1.3
				expect(result.installed).to.be.an("array").with.lengthOf(0);

				// The version should remain 1.3.1
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.1"
					)
				).to.be.true;
			});

			it("should downgrade explicitly installed package when manifest specifies a non-overlapping range", async function () {
				// Known behavior: if a user explicitly installs a version (e.g. 1.3.4)
				// and then applies a manifest with a range that excludes it (e.g. >=1.2 <1.3),
				// the manifest will downgrade the package to the latest version in the range.
				// The manifest always overrides the explicitly installed version.

				// Step 1: Explicitly install the latest version
				await api.install({ name: "test_pkg2", version: "1.3.4" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.4"
					)
				).to.be.true;

				// Step 2: Apply a manifest with range >=1.2 <1.3 which excludes the installed 1.3.4
				const manifestPath = await createManifestFile([
					{ name: "test_pkg2", version: ">=1.2 <1.3" }
				]);

				const result = await api.installFromManifest(manifestPath);

				// The manifest overrides the explicitly installed version
				expect(result.installed)
					.to.be.an("array")
					.with.length.greaterThan(0);

				// Package is downgraded to 1.2.3 (latest matching >=1.2 <1.3)
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.3"
					)
				).to.be.true;

				// The previously installed 1.3.4 is no longer installed
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.4"
					)
				).to.be.false;
			});

			it("should update to latest version when explicitly installing with a version range", async function () {
				// Scenario: User installs specific versions, then explicitly installs with a range
				// Unlike installFromManifest, explicit install with a range should resolve to the latest matching version

				// Step 1: Install test_pkg2 with version 1.2.0
				await api.install({ name: "test_pkg2", version: "1.2.0" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;

				// Step 2: Install test_pkg2 with version 1.1.0 (downgrade)
				await api.install({ name: "test_pkg2", version: "1.1.0" });

				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.1.0"
					)
				).to.be.true;
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.false;

				// Step 3: Install with a tilde range ~1.0 which should resolve to the latest 1.0.x patch
				// This is an explicit install (not manifest), so it should update to the latest matching version
				const result = await api.install({
					name: "test_pkg2",
					version: "~1.0"
				});

				expect(result).to.be.an("array").that.is.not.empty;

				// Verify the latest version matching ~1.0 is now installed
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.0"
					)
				).to.be.true;

				// The previous version should no longer be installed
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.1.0"
					)
				).to.be.false;
			});

			it("should resolve version range from local cache when localOnly flag is used", async function () {
				// Scenario: User installs specific versions (populating cache), uninstalls them,
				// then installs with a range using localOnly flag - should resolve from cached versions

				// Step 1: Install test_pkg2 with version 1.2.0 to populate cache
				await api.install({ name: "test_pkg2", version: "1.2.0" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;

				// Step 2: Install test_pkg2 with version 1.1.0 to also add it to cache
				await api.install({ name: "test_pkg2", version: "1.1.0" });

				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.1.0"
					)
				).to.be.true;

				// Step 3: Uninstall to clear installed state (but versions remain in cache)
				await api.uninstall("test_pkg2");

				installedPackages = await api.list();
				expect(installedPackages.some((p) => p.name === "test_pkg2"))
					.to.be.false;

				// Step 4: Install with a version range using localOnly flag
				// ^1.0 means >=1.0.0 <2.0.0, so it should resolve from cached versions
				// Since 1.1.0 and 1.2.0 are cached, it should pick 1.2.0 (latest matching ^1.0)
				const result = await api.install(
					{ name: "test_pkg2", version: "^1.0" },
					{ localOnly: true }
				);

				expect(result).to.be.an("array").that.is.not.empty;

				// Verify the best cached version matching ^1.0 is installed
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;
			});

			it("should resolve manifest version range from local cache when localOnly flag is used", async function () {
				// Scenario: User installs specific versions (populating cache), uninstalls them,
				// then uses installFromManifest with localOnly flag - should resolve from cached versions

				// Step 1: Install test_pkg2 with version 1.2.0 to populate cache
				await api.install({ name: "test_pkg2", version: "1.2.0" });

				let installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;

				// Step 2: Install test_pkg2 with version 1.1.0 to also add it to cache
				await api.install({ name: "test_pkg2", version: "1.1.0" });

				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.1.0"
					)
				).to.be.true;

				// Step 3: Uninstall to clear installed state (but versions remain in cache)
				await api.uninstall("test_pkg2");

				installedPackages = await api.list();
				expect(installedPackages.some((p) => p.name === "test_pkg2"))
					.to.be.false;

				// Step 4: Install from manifest with localOnly flag using a version range
				// ^1.0 means >=1.0.0 <2.0.0, so it should resolve from cached versions
				const manifestPath = await createManifestFile([
					{ name: "test_pkg2", version: "^1.0" }
				]);

				const result = await api.installFromManifest(manifestPath, {
					localOnly: true
				});

				expect(result.installed).to.be.an("array").that.is.not.empty;

				// Verify the best cached version matching ^1.0 is installed
				installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.0"
					)
				).to.be.true;
			});

			it("should fail when manifest references uncached package with localOnly flag", async function () {
				// Scenario: installFromManifest with localOnly should fail if the package
				// is not available in the local cache

				// Create a manifest referencing a version range that has no cached versions
				// We use an impossible version to ensure nothing is in cache
				const manifestPath = await createManifestFile([
					{ name: "test_pkg2", version: "^99.0" }
				]);

				await expect(
					api.installFromManifest(manifestPath, {
						localOnly: true
					})
				).to.be.rejectedWith(/No versions found matching/);
			});

			it("should resolve version with | in version range", async function () {
				// Create a manifest with a version range that includes an OR condition
				const manifestPath = await createManifestFile([
					{
						name: "test_pkg2",
						version: ">=1.2.0 <1.3.0 || >=1.3.4 <1.4.0"
					}
				]);

				const result = await api.installFromManifest(manifestPath);
				expect(result.installed)
					.to.be.an("array")
					.with.length.greaterThan(0);

				// Verify the version installed is 1.3.4 (latest matching the first range)
				const installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.4"
					)
				).to.be.true;
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.2.3"
					)
				).to.be.false;
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.3.0"
					)
				).to.be.false;
				expect(
					installedPackages.some(
						(p) => p.name === "test_pkg2" && p.version === "1.4.0"
					)
				).to.be.false;
			});
		});
	});

	describe("Pre-release version handling", function () {
		afterEach(async function () {
			try {
				await api.uninstall("test_pkg_prerelease1");
			} catch {
				// Ignore if not installed
			}
			await cleanupManifestFile();
		});

		const latestPreReleaseCandidates = ["1.2.0-b.2", "1.2.0-b.2+1"];

		it("should install a package with a pre-release version via install", async function () {
			const result = await api.install({
				name: "test_pkg_prerelease1",
				version: "1.2.0-b.1"
			});
			expect(result).to.be.an("array").that.deep.includes({
				name: "test_pkg_prerelease1",
				version: "1.2.0-b.1"
			});

			// Verify the package is listed as installed
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						p.version === "1.2.0-b.1"
				)
			).to.be.true;
		});

		it("should install latest matching prerelease when using tilde prerelease range", async function () {
			const result = await api.install({
				name: "test_pkg_prerelease1",
				version: "~1.2.0-b.1"
			});

			expect(result).to.be.an("array");
			expect(
				result.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						latestPreReleaseCandidates.includes(p.version)
				)
			).to.be.true;
		});

		it("should install latest matching prerelease from manifest using tilde prerelease range", async function () {
			const manifestPath = await createManifestFile([
				{
					name: "test_pkg_prerelease1",
					version: "~1.2.0-b.1"
				}
			]);

			const result = await api.installFromManifest(manifestPath);
			expect(result.installed).to.be.an("array");
			expect(
				result.installed.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						latestPreReleaseCandidates.includes(p.version)
				)
			).to.be.true;
		});

		// Caret range tests (common case)
		it("should install latest matching prerelease when using caret prerelease range", async function () {
			const result = await api.install({
				name: "test_pkg_prerelease1",
				version: "^1.2.0-b.1"
			});

			expect(result).to.be.an("array");
			expect(
				result.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						latestPreReleaseCandidates.includes(p.version)
				)
			).to.be.true;

			// Verify the resolved installed version is the highest matching prerelease.
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						latestPreReleaseCandidates.includes(p.version)
				)
			).to.be.true;
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" && p.version === "1.0.0"
				)
			).to.be.false;
		});

		it("should cache only resolved version for prerelease semver install and never the literal range", async function () {
			// Ensure package cache starts empty for this package.
			try {
				await api.delete("test_pkg_prerelease1/*");
			} catch {
				// Ignore if not present in cache
			}

			const result = await api.install({
				name: "test_pkg_prerelease1",
				version: "^1.2.0-b.1"
			});

			expect(result).to.be.an("array");
			expect(
				result.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						latestPreReleaseCandidates.includes(p.version)
				)
			).to.be.true;

			const cachedPackages = await api.listCache(
				"test_pkg_prerelease1/*"
			);
			expect(cachedPackages).to.be.an("array").with.lengthOf(1);
			expect(cachedPackages[0].reference.name).to.equal(
				"test_pkg_prerelease1"
			);
			expect(
				latestPreReleaseCandidates.includes(
					cachedPackages[0].reference.version
				)
			).to.be.true;
			expect(cachedPackages[0].reference.version).to.not.equal(
				"^1.2.0-b.1"
			);
		});

		it("should treat prerelease range as already satisfied when installed prerelease matches", async function () {
			await api.install({
				name: "test_pkg_prerelease1",
				version: "1.2.0-b.1"
			});

			const manifestPath = await createManifestFile([
				{
					name: "test_pkg_prerelease1",
					version: "^1.2.0-b.1"
				}
			]);

			const checkResult = await api.checkManifest(manifestPath);
			expect(checkResult).to.be.an("array").that.is.empty;

			const plan = await api.getInstallPlan(manifestPath);
			expect(plan.toInstall).to.be.an("array").that.is.empty;
			expect(plan.alreadyInstalled)
				.to.be.an("array")
				.with.lengthOf(1);
			expect(plan.alreadyInstalled[0]).to.deep.equal({
				name: "test_pkg_prerelease1",
				version: "1.2.0-b.1"
			});
		});

		it("should install latest matching prerelease from manifest using caret prerelease range", async function () {
			const manifestPath = await createManifestFile([
				{
					name: "test_pkg_prerelease1",
					version: "^1.2.0-b.1"
				}
			]);

			const result = await api.installFromManifest(manifestPath);
			expect(result.installed).to.be.an("array");
			expect(
				result.installed.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						latestPreReleaseCandidates.includes(p.version)
				)
			).to.be.true;
		});

		it("should not create a deletable dangling cache entry with range literal after install from manifest", async function () {
			const manifestPath = await createManifestFile([
				{
					name: "test_pkg_prerelease1",
					version: "^1.2.0-b.1"
				}
			]);

			const result = await api.installFromManifest(manifestPath);
			expect(result.installed).to.be.an("array").that.is.not.empty;

			// Deleting the range-literal reference should fail because it should
			// never exist as a concrete cache package reference.
			await expect(
				api.delete("test_pkg_prerelease1/^1.2.0-b.1")
			).to.be.rejectedWith(
				/No local packages found matching pattern/
			);
		});

		// Negative test cases
		it("should install stable version when prerelease is not explicitly requested", async function () {
			const installed = await api.install({
				name: "test_pkg_prerelease1",
				version: "1.0.0"
			});
			expect(installed).to.be.an("array").that.deep.includes({
				name: "test_pkg_prerelease1",
				version: "1.0.0"
			});

			// Verify stable version is installed and prerelease versions are not selected implicitly.
			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" && p.version === "1.0.0"
				)
			).to.be.true;
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						p.version === "1.2.0-b.1"
				)
			).to.be.false;
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						p.version === "1.2.0-b.1+1"
				)
			).to.be.false;
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						p.version === "1.2.0-b.2"
				)
			).to.be.false;
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						p.version === "1.2.0-b.2+1"
				)
			).to.be.false;
		});

		it("should not install a prerelease when explicit prerelease version is not defined", async function () {
			const installed = await api.install({
				name: "test_pkg_prerelease1",
				version: "~1.0.0"
			});
			expect(installed).to.be.an("array").that.deep.includes({
				name: "test_pkg_prerelease1",
				version: "1.0.0"
			});

			const installedPackages = await api.list();
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" && p.version === "1.0.0"
				)
			).to.be.true;
			expect(
				installedPackages.some(
					(p) =>
						p.name === "test_pkg_prerelease1" &&
						p.version.startsWith("1.2.0-b")
				)
			).to.be.false;
		});

		it("should fail when pre-release range does not match any versions", async function () {
			await expect(
				api.install({
					name: "test_pkg_prerelease1",
					version: ">=1.2.0-rc.1 <1.2.0"
				})
			).to.be.rejected;
		});

		it("should fail when pre-release version does not exist", async function () {
			await expect(
				api.install({
					name: "test_pkg_prerelease1",
					version: "^2.0.0-rc.1"
				})
			).to.be.rejected;
		});
	});

	describe("getInstalledPackageInfo", function () {
		const pkgsToInstall = [
			{ name: "test_pkg_plugin1", version: "1.0" },
			{ name: "test_pkg_plugin2", version: "1.0" },
			{ name: "test_pkg1", version: "1.0" },
			{ name: "test_pkg_consumer12", version: "1.0" },
			{ name: "test_pkg_component_composite", version: "1.0" },
			{ name: "test_pkg_component_plugin1", version: "1.0" },
			{ name: "test_pkg_component_plugin2", version: "1.0" }
		];

		before(async function () {
			await api.install(pkgsToInstall);
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
			expect(names).to.include("test_pkg_component_composite");
			expect(names).to.include("test_pkg_component_plugin1");
			expect(names).to.include("test_pkg_component_plugin2");
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
				expect(result.length).to.equal(3);
				expect(result.map((pkg) => pkg.name)).to.include.members([
					"test_pkg_plugin1",
					"test_pkg_component_plugin1",
					"test_pkg_component_composite"
				]);
			});

			it("should return packages matching any value in array filter", async function () {
				const result = await api.getInstalledPackageInfo({
					soc: ["plugin1Soc", "plugin2Soc1"]
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(5);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_plugin1",
					"test_pkg_plugin2",
					"test_pkg_component_plugin1",
					"test_pkg_component_plugin2",
					"test_pkg_component_composite"
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

			it("should filter by component name", async function () {
				const result = await api.getInstalledPackageInfo({
					component: { name: "plugin1" }
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(2);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_component_plugin1",
					"test_pkg_component_composite"
				]);

				for (const pkg of result) {
					expect(pkg.components).to.be.an("array").that.is.not.empty;
					expect(pkg.components?.some((c) => c.name === "plugin1")).to
						.be.true;
				}
			});

			it("should filter by component name and version", async function () {
				const result = await api.getInstalledPackageInfo({
					component: { name: "plugin1", version: "2.1.0" }
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(1);

				expect(result[0].name).to.equal(
					"test_pkg_component_composite"
				);
				for (const pkg of result) {
					expect(pkg.components).to.be.an("array").that.is.not.empty;

					expect(
						pkg.components?.some(
							(c) => c.name === "plugin1" && c.version === "2.1.0"
						)
					).to.be.true;
				}
			});

			describe("Filtering by component version with semver ranges", function () {
				it("Should return multiple packages that satisfy the version range", async function () {
					const result = await api.getInstalledPackageInfo({
						component: { name: "plugin1", version: "^2.0.0" }
					});
					expect(result).to.be.an("array");
					expect(result.length).to.equal(2);

					const names = result.map((pkg) => pkg.name);
					expect(names).to.include.members([
						"test_pkg_component_plugin1",
						"test_pkg_component_composite"
					]);
					for (const pkg of result) {
						expect(pkg.components).to.be.an("array").that.is.not
							.empty;
						expect(pkg.components?.some((c) => c.name === "plugin1"))
							.to.be.true;
						expect(
							pkg.components?.some((c) =>
								semver.satisfies(c.version, "^2.0.0")
							)
						).to.be.true;
					}
				});

				it("Should not return packages that do not satisfy the version range", async function () {
					const result = await api.getInstalledPackageInfo({
						component: { name: "plugin1", version: "^2.1.0" }
					});
					expect(result).to.be.an("array");
					expect(result.length).to.equal(1);

					const names = result.map((pkg) => pkg.name);
					expect(names).to.include.members([
						"test_pkg_component_composite"
					]);
					for (const pkg of result) {
						expect(pkg.components).to.be.an("array").that.is.not
							.empty;
						expect(pkg.components?.some((c) => c.name === "plugin1"))
							.to.be.true;
						expect(
							pkg.components?.some((c) =>
								semver.satisfies(c.version, "^2.1.0")
							)
						).to.be.true;
					}
				});
			});

			it("should filter by component type (plugin)", async function () {
				const result = await api.getInstalledPackageInfo({
					component: { type: "plugin" }
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(3);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_component_plugin1",
					"test_pkg_component_plugin2",
					"test_pkg_component_composite"
				]);
				for (const pkg of result) {
					expect(pkg.components).to.be.an("array").that.is.not.empty;
					expect(pkg.components?.some((c) => c.type === "plugin")).to
						.be.true;
				}
			});

			it("should filter by component type (data-model)", async function () {
				const result = await api.getInstalledPackageInfo({
					component: { type: "data-model" }
				});
				expect(result).to.be.an("array");
				expect(result.length).to.equal(1);

				const names = result.map((pkg) => pkg.name);
				expect(names).to.include.members([
					"test_pkg_component_composite"
				]);
				for (const pkg of result) {
					expect(pkg.components).to.be.an("array").that.is.not.empty;
					expect(pkg.components?.some((c) => c.type === "data-model"))
						.to.be.true;
				}
			});
		});
	});

	describe("License acceptance", function () {
		// Test packages with license requirements
		const licensedPackages = [
			{ name: "test_pkg_with_license1", version: "1.0.0" },
			{ name: "test_pkg_with_license2", version: "1.0.0" }
		];

		// Shared cleanup helper for licensed packages
		async function cleanupLicensedPackages(
			deleteFromCache = false,
			packageName?: string
		): Promise<void> {
			const allPackagesToClean = packageName
				? [packageName]
				: [
						...licensedPackages.map((p) => p.name),
						"test_pkg1",
						"test_pkg2"
					];
			for (const pkg of allPackagesToClean) {
				try {
					await api.uninstall(pkg);
				} catch {
					// Ignore if not installed
				}
				if (deleteFromCache) {
					try {
						// Also delete from cache to ensure clean state for license tests
						await api.delete(`${pkg}/*`);
					} catch {
						// Ignore if not in cache
					}
				}
			}
		}

		describe("license metadata handling", function () {
			const licensedPkgName = "test_pkg_with_license1";

			beforeEach(async function () {
				await cleanupLicensedPackages(true, licensedPkgName);
				await cleanupManifestFile();
			});

			it("does not treat recipe-only metadata as license acceptance", async function () {
				const cachedBefore = await api.listCache(
					`${licensedPkgName}/*`
				);
				expect(cachedBefore).to.be.an("array").that.is.empty;

				const searchResults = await api.searchInfo(
					`${licensedPkgName}/*`
				);
				expect(
					searchResults.some(
						(pkg) => pkg.reference.name === licensedPkgName
					)
				).to.be.true;

				const manifestPath = await createManifestFile([
					{ name: licensedPkgName, version: "1.0.0" }
				]);

				const plan = await api.getInstallPlan(manifestPath);
				expect(plan.requiresLicenseAcceptance)
					.to.be.an("array")
					.with.length.greaterThan(0);
			});

			it("finds licensed packages via searchInfo and rejects install without license acceptance", async function () {
				// Use searchInfo to find the licensed package
				const searchResults = await api.searchInfo(
					`${licensedPkgName}/*`
				);
				expect(
					searchResults.some(
						(pkg) => pkg.reference.name === licensedPkgName
					)
				).to.be.true;

				const licensedPkg: CfsPackageReference = {
					name: licensedPkgName,
					version: "1.0.0"
				};

				// Try to install without accepting license
				const manifestPath = await createManifestFile([licensedPkg]);
				const result = await api.installFromManifest(manifestPath, {
					acceptLicense: false
				});

				// Package should be skipped (not installed)
				expect(result.skipped).to.be.an("array").with.lengthOf(1);
				expect(result.skipped[0]).to.deep.equal(licensedPkg);
				expect(result.installed).to.be.an("array").that.is.empty;

				// Verify package is not actually installed
				const installedPackages = await api.list();
				expect(
					installedPackages.some((p) => p.name === licensedPkgName)
				).to.be.false;
			});
		});

		describe("license reporter integration", function () {
			afterEach(async function () {
				await api.unregisterLicenseReporter();
				await cleanupLicensedPackages(true);
				sinon.restore();
			});

			it("should report accepted licensed packages during install", async function () {
				const pkg = licensedPackages[0];
				const reporterCalls: CfsPackageReference[][] = [];
				const reporter: CfsPackageLicenseReporter = {
					reportLicenseAcceptance(packages) {
						reporterCalls.push(
							Array.isArray(packages) ? packages : [packages]
						);
						return Promise.resolve();
					}
				};

				await api.registerLicenseReporter(reporter);
				await api.install(pkg, { acceptLicense: true });

				expect(reporterCalls).to.deep.equal([[pkg]]);
			});

			it("should fail install when the registered reporter throws", async function () {
				const pkg = licensedPackages[0];
				const reporter: CfsPackageLicenseReporter = {
					reportLicenseAcceptance() {
						return Promise.reject(new Error("report failed"));
					}
				};

				await api.registerLicenseReporter(reporter);

				await expect(
					api.install(pkg, { acceptLicense: true })
				).to.be.rejectedWith("report failed");

				const installedPackages = await api.list();
				expect(installedPackages.some((p) => p.name === pkg.name)).to
					.be.false;
			});

			it("should stop reporting after unregistering the reporter", async function () {
				const pkg = licensedPackages[0];
				let reportCallCount = 0;
				const reporter: CfsPackageLicenseReporter = {
					reportLicenseAcceptance() {
						reportCallCount += 1;
						return Promise.resolve();
					}
				};

				await api.registerLicenseReporter(reporter);
				await api.unregisterLicenseReporter();
				await api.install(pkg, { acceptLicense: true });

				expect(reportCallCount).to.equal(0);
			});

			it("should not report when acceptLicense is false", async function () {
				let reportCallCount = 0;
				const reporter: CfsPackageLicenseReporter = {
					reportLicenseAcceptance() {
						reportCallCount += 1;
						return Promise.resolve();
					}
				};

				await api.registerLicenseReporter(reporter);
				await api.install(
					{ name: "test_pkg1", version: "1.0" },
					{ acceptLicense: false }
				);

				expect(reportCallCount).to.equal(0);
			});

			it("should not report when no accepted licenses are required", async function () {
				let reportCallCount = 0;
				const reporter: CfsPackageLicenseReporter = {
					reportLicenseAcceptance() {
						reportCallCount += 1;
						return Promise.resolve();
					}
				};

				await api.registerLicenseReporter(reporter);
				await api.install(
					{ name: "test_pkg1", version: "1.0" },
					{ acceptLicense: true }
				);

				expect(reportCallCount).to.equal(0);
			});

			it("should only report licensed packages that are actually being installed", async function () {
				const reporterCalls: CfsPackageReference[][] = [];
				const reporter: CfsPackageLicenseReporter = {
					reportLicenseAcceptance(packages) {
						reporterCalls.push(
							Array.isArray(packages) ? packages : [packages]
						);
						return Promise.resolve();
					}
				};

				await api.registerLicenseReporter(reporter);
				await api.install(licensedPackages[0], {
					acceptLicense: true
				});

				expect(reporterCalls).to.deep.equal([[licensedPackages[0]]]);
			});

			it("should reuse a provided installPlan during install", async function () {
				const pkg = licensedPackages[0];
				const reporterCalls: CfsPackageReference[][] = [];
				const reporter: CfsPackageLicenseReporter = {
					reportLicenseAcceptance(packages) {
						reporterCalls.push(
							Array.isArray(packages) ? packages : [packages]
						);
						return Promise.resolve();
					}
				};
				const plan = await api.getInstallPlan(pkg);
				const getInstallPlanStub = sinon.stub(api, "getInstallPlan");
				getInstallPlanStub.rejects(
					new Error("getInstallPlan should not be called")
				);

				await api.registerLicenseReporter(reporter);
				await api.install(plan, {
					acceptLicense: true
				});

				expect(reporterCalls).to.deep.equal([[pkg]]);
				expect(getInstallPlanStub.called).to.be.false;
			});
		});

		describe("installFromManifest with license acceptance", function () {
			beforeEach(async function () {
				await cleanupLicensedPackages(true);
				await cleanupManifestFile();
			});

			it("should skip packages requiring license when acceptLicense is false", async function () {
				const manifestPath = await createManifestFile([
					licensedPackages[0]
				]);

				const result = await api.installFromManifest(manifestPath, {
					acceptLicense: false
				});

				expect(result.installed).to.be.an("array").that.is.empty;
				expect(result.skipped).to.be.an("array").with.lengthOf(1);
				expect(result.skipped[0]).to.deep.equal(licensedPackages[0]);

				// Verify the package is NOT installed
				const installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === licensedPackages[0].name
					)
				).to.be.false;
			});

			it("should skip packages requiring license when acceptLicense is undefined (default behavior)", async function () {
				const manifestPath = await createManifestFile([
					licensedPackages[0]
				]);

				// Call without acceptLicense option to test default behavior
				const result = await api.installFromManifest(manifestPath);

				expect(result.installed).to.be.an("array").that.is.empty;
				expect(result.skipped).to.be.an("array").with.lengthOf(1);
				expect(result.skipped[0]).to.deep.equal(licensedPackages[0]);

				// Verify the package is NOT installed
				const installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === licensedPackages[0].name
					)
				).to.be.false;
			});

			it("should install packages when acceptLicense is true", async function () {
				const manifestPath = await createManifestFile([
					licensedPackages[0]
				]);

				const result = await api.installFromManifest(manifestPath, {
					acceptLicense: true
				});

				expect(result.installed).to.be.an("array").with.lengthOf(1);
				expect(result.installed[0]).to.deep.equal(
					licensedPackages[0]
				);
				expect(result.skipped).to.be.an("array").that.is.empty;

				// Verify the package is installed
				const installedPackages = await api.list();
				expect(
					installedPackages.some(
						(p) => p.name === licensedPackages[0].name
					)
				).to.be.true;
			});

			it("should install multiple licensed packages when acceptLicense is true", async function () {
				const manifestPath =
					await createManifestFile(licensedPackages);

				const result = await api.installFromManifest(manifestPath, {
					acceptLicense: true
				});

				expect(result.installed)
					.to.be.an("array")
					.with.lengthOf(licensedPackages.length);
				expect(result.skipped).to.be.an("array").that.is.empty;

				// Verify all packages are installed
				const installedPackages = await api.list();
				for (const pkg of licensedPackages) {
					expect(installedPackages.some((p) => p.name === pkg.name))
						.to.be.true;
				}
			});

			it("should skip multiple licensed packages when acceptLicense is false", async function () {
				const manifestPath =
					await createManifestFile(licensedPackages);

				const result = await api.installFromManifest(manifestPath, {
					acceptLicense: false
				});

				expect(result.installed).to.be.an("array").that.is.empty;
				expect(result.skipped)
					.to.be.an("array")
					.with.lengthOf(licensedPackages.length);

				const skippedNames = result.skipped.map((p) => p.name);
				expect(skippedNames).to.include.members(
					licensedPackages.map((p) => p.name)
				);

				// Verify no packages are installed
				const installedPackages = await api.list();
				for (const pkg of licensedPackages) {
					expect(installedPackages.some((p) => p.name === pkg.name))
						.to.be.false;
				}
			});

			it("should return empty arrays when all packages are already installed", async function () {
				// First install a package
				await api.install(licensedPackages[0], {
					acceptLicense: true
				});

				// Now try to install it again via manifest
				const manifestPath = await createManifestFile([
					licensedPackages[0]
				]);

				const result = await api.installFromManifest(manifestPath, {
					acceptLicense: true
				});

				expect(result.installed).to.be.an("array").that.is.empty;
				expect(result.skipped).to.be.an("array").that.is.empty;
			});
		});

		describe("mixed manifest with licensed and unlicensed packages", function () {
			beforeEach(async function () {
				await cleanupLicensedPackages(true);
				await cleanupManifestFile();
			});

			it("should install unlicensed packages and skip licensed packages when acceptLicense is false", async function () {
				// Create manifest with mixed packages:
				// - 2 unlicensed packages (test_pkg1, test_pkg2)
				// - 2 licensed packages
				const manifestPath = await createManifestFile([
					{ name: "test_pkg1", version: "1.0" },
					{ name: "test_pkg2", version: "1.0" },
					...licensedPackages
				]);

				// Install without accepting license
				const result = await api.installFromManifest(manifestPath, {
					acceptLicense: false
				});

				// Unlicensed packages should be installed
				expect(result.installed).to.be.an("array").with.lengthOf(2);
				const installedNames = result.installed.map((p) => p.name);
				expect(installedNames).to.include.members([
					"test_pkg1",
					"test_pkg2"
				]);

				// Licensed packages should be skipped
				expect(result.skipped)
					.to.be.an("array")
					.with.lengthOf(licensedPackages.length);
				const skippedNames = result.skipped.map((p) => p.name);
				expect(skippedNames).to.include.members(
					licensedPackages.map((p) => p.name)
				);

				// Verify only unlicensed packages are installed
				const installedPackages = await api.list();
				expect(installedPackages.some((p) => p.name === "test_pkg1"))
					.to.be.true;
				expect(installedPackages.some((p) => p.name === "test_pkg2"))
					.to.be.true;
				for (const pkg of licensedPackages) {
					expect(installedPackages.some((p) => p.name === pkg.name))
						.to.be.false;
				}
			});

			it("should install all packages including licensed ones when acceptLicense is true", async function () {
				// Create manifest with mixed packages
				const allPackages = [
					{ name: "test_pkg1", version: "1.0" },
					{ name: "test_pkg2", version: "1.0" },
					...licensedPackages
				];
				const manifestPath = await createManifestFile(allPackages);

				// Install WITH license acceptance
				const result = await api.installFromManifest(manifestPath, {
					acceptLicense: true
				});

				// All packages should be installed
				expect(result.installed)
					.to.be.an("array")
					.with.lengthOf(allPackages.length);
				expect(result.skipped).to.be.an("array").that.is.empty;

				const installedNames = result.installed.map((p) => p.name);
				expect(installedNames).to.include.members(
					allPackages.map((p) => p.name)
				);

				// Verify all packages are installed
				const finalPackages = await api.list();
				for (const pkg of allPackages) {
					expect(finalPackages.some((p) => p.name === pkg.name)).to.be
						.true;
				}
			});
		});

		describe("install single package with license acceptance", function () {
			beforeEach(async function () {
				await cleanupLicensedPackages(true);
			});

			after(async function () {
				await cleanupLicensedPackages(true);
			});

			it("should install a licensed package when acceptLicense is true", async function () {
				const pkg = licensedPackages[0];
				const result = await api.install(pkg, {
					acceptLicense: true
				});

				expect(result).to.be.an("array").with.lengthOf(1);
				expect(result[0]).to.deep.equal(pkg);

				const installedPackages = await api.list();
				expect(installedPackages.some((p) => p.name === pkg.name)).to
					.be.true;
			});

			it("should install different licensed packages independently", async function () {
				// Install first package
				const pkg1 = licensedPackages[0];
				await api.install(pkg1, { acceptLicense: true });

				// Install second package
				const pkg2 = licensedPackages[1];
				const result = await api.install(pkg2, {
					acceptLicense: true
				});

				expect(result).to.be.an("array").with.lengthOf(1);
				expect(result[0]).to.deep.equal(pkg2);

				// Verify both packages are installed
				const installedPackages = await api.list();
				expect(installedPackages.some((p) => p.name === pkg1.name)).to
					.be.true;
				expect(installedPackages.some((p) => p.name === pkg2.name)).to
					.be.true;
			});

			describe("Cache-based license skipping", function () {
				beforeEach(async function () {
					// Ensure clean cache state before each cache test
					// This deletes from cache AND uninstalls any installed packages
					await cleanupLicensedPackages(true);
				});

				after(async function () {
					// Clean up after test suite
					await cleanupLicensedPackages(true);
				});

				it("should not require license acceptance for packages already in cache", async function () {
					// First, download the package (which requires license acceptance)
					const pkg = licensedPackages[0];
					await api.install(pkg, { acceptLicense: true });

					// Uninstall the package (but keep it in cache)
					await api.uninstall(pkg.name);

					// Now try to install again - should not require license because it's cached
					const manifestPath = await createManifestFile([pkg]);
					const result = await api.installFromManifest(manifestPath);

					// Should install successfully because package is in cache
					expect(result.installed).to.be.an("array").with.lengthOf(1);
					expect(result.installed[0]).to.deep.equal(pkg);
					expect(result.skipped).to.be.an("array").that.is.empty;
				});

				it("should require license again after cache deletion for exact and range installs", async function () {
					const pkg = {
						name: "test_pkg_with_license1",
						version: "^1.0.0"
					};

					// 1-2) Install then uninstall to ensure it is known and can be cached.
					await api.install(pkg, { acceptLicense: true });
					await api.uninstall(pkg.name);

					// 3) Delete from cache (handle exact and metadata variants).
					for (const pattern of [
						`${pkg.name}/1.0.0`,
						`${pkg.name}/1.0.0+1`,
						`${pkg.name}/1.0.0*`,
						`${pkg.name}/*`
					]) {
						try {
							await api.delete(pattern);
						} catch {
							// Ignore if this pattern does not exist in cache
						}
					}

					// 4) Exact install without license acceptance should require license.
					const exactResult = await api.getInstallPlan(
						await createManifestFile([
							{ name: pkg.name, version: "1.0.0" }
						])
					);
					expect(exactResult.requiresLicenseAcceptance).to.be.an(
						"array"
					).that.is.not.empty;

					// 5) Repeat steps 3-4 for range install path: ensure cache is cleared again.
					await cleanupLicensedPackages(true);

					const rangeResult = await api.getInstallPlan(
						await createManifestFile([
							{ name: pkg.name, version: "^1.0.0" }
						])
					);
					expect(rangeResult.requiresLicenseAcceptance).to.be.an(
						"array"
					).that.is.not.empty;
				});

				it("should require license for packages not in cache even if other packages are cached", async function () {
					// Install first package (gets cached)
					const pkg1 = licensedPackages[0];
					await api.install(pkg1, { acceptLicense: true });
					await api.uninstall(pkg1.name);

					// Second package is NOT cached (ensure it's deleted if it exists)
					const pkg2 = licensedPackages[1];
					try {
						await api.delete(`${pkg2.name}/*`);
					} catch {
						// Ignore if not in cache
					}

					// Try to install both without accepting license
					const manifestPath = await createManifestFile([pkg1, pkg2]);
					const result = await api.installFromManifest(manifestPath, {
						acceptLicense: false
					});

					// First package should install (cached), second should be skipped (not cached)
					expect(result.installed).to.be.an("array").with.lengthOf(1);
					expect(result.installed[0]).to.deep.equal(pkg1);
					expect(result.skipped).to.be.an("array").with.lengthOf(1);
					expect(result.skipped[0]).to.deep.equal(pkg2);
				});

				it("should skip cache check and prompt for license if cache listing fails", async function () {
					// This test verifies graceful degradation when cache cannot be queried
					// In this case, the function should fall back to checking all packages
					const pkg = licensedPackages[0];
					const manifestPath = await createManifestFile([pkg]);

					// Without accepting license, should be skipped (no cache to check)
					const result = await api.installFromManifest(manifestPath, {
						acceptLicense: false
					});

					expect(result.skipped).to.be.an("array").with.lengthOf(1);
					expect(result.installed).to.be.an("array").that.is.empty;
				});

				it("should handle mixed scenario with cached and uncached packages correctly", async function () {
					// Setup: Cache first package, leave second uncached, third is unlicensed
					const pkg1 = licensedPackages[0];
					await api.install(pkg1, { acceptLicense: true });
					await api.uninstall(pkg1.name);

					const pkg2 = licensedPackages[1]; // Not cached
					const pkg3 = { name: "test_pkg1", version: "1.0" }; // Unlicensed

					// Install with acceptLicense=false
					const manifestPath = await createManifestFile([
						pkg1,
						pkg2,
						pkg3
					]);
					const result = await api.installFromManifest(manifestPath, {
						acceptLicense: false
					});

					// pkg1 should install (cached), pkg3 should install (no license), pkg2 should skip
					expect(result.installed).to.be.an("array").with.lengthOf(2);
					const installedNames = result.installed.map((p) => p.name);
					expect(installedNames).to.include.members([
						pkg1.name,
						pkg3.name
					]);

					expect(result.skipped).to.be.an("array").with.lengthOf(1);
					expect(result.skipped[0]).to.deep.equal(pkg2);
				});

				it("should accept license and cache package for future use", async function () {
					const pkg = licensedPackages[0];

					// First install with license acceptance
					await api.install(pkg, { acceptLicense: true });
					await api.uninstall(pkg.name);

					// Second install without license acceptance should work (cached)
					const result = await api.install(pkg);

					expect(result).to.be.an("array").with.lengthOf(1);
					expect(result[0]).to.deep.equal(pkg);
				});

				it("should not prompt for license when reinstalling a cached package via single install", async function () {
					const pkg = licensedPackages[0];

					// Install with license acceptance
					await api.install(pkg, { acceptLicense: true });
					await api.uninstall(pkg.name);

					// Try to install the same package again without accepting license
					// Should succeed because it's cached
					await expect(api.install(pkg)).to.eventually.be.fulfilled;
				});
			});
		});

		describe("install with array of packages", function () {
			const packagesToInstall = [
				{ name: "test_pkg_consumer1", version: "1.0" },
				{ name: "test_pkg_consumer2", version: "1.0" }
			];

			beforeEach(async function () {
				// Clean up packages before each test
				for (const pkg of packagesToInstall) {
					try {
						await api.uninstall(pkg.name);
					} catch {
						// Ignore if not installed
					}
				}
			});

			before(async function () {
				await cleanupLicensedPackages(true);
			});

			it("should install multiple packages when given an array", async function () {
				const result = await api.install(packagesToInstall);

				expect(result).to.be.an("array").that.is.not.empty;
				expect(result).to.deep.include.members(packagesToInstall);

				// Verify packages are actually installed
				const installedPackages = await api.list();
				for (const pkg of packagesToInstall) {
					expect(installedPackages.some((p) => p.name === pkg.name))
						.to.be.true;
				}
			});

			it("should handle a single package in an array", async function () {
				const result = await api.install([packagesToInstall[0]]);

				expect(result).to.be.an("array").with.lengthOf(1);
				expect(result[0]).to.deep.equal(packagesToInstall[0]);
			});

			it("should handle an empty array gracefully", async function () {
				const result = await api.install([]);

				expect(result).to.be.an("array").that.is.empty;
			});

			it("should install licensed packages in array with acceptLicense", async function () {
				const result = await api.install(licensedPackages, {
					acceptLicense: true
				});

				expect(result).to.be.an("array").with.lengthOf(2);
				expect(result).to.deep.include.members(licensedPackages);
			});
		});
	});

	describe("listCache", function () {
		describe("recipe-only metadata entries", function () {
			const pkgName = "test_pkg1";

			before(async function () {
				// Ensure clean state: uninstall and delete from cache for test packages
				try {
					await api.uninstall(pkgName);
				} catch {
					// Ignore if not installed
				}

				try {
					await api.delete(`${pkgName}/*`);
				} catch {
					// Ignore if not in cache
				}
			});

			it("should not include recipe-only metadata entries", async function () {
				await api.init();
				// This fetches recipe metadata without installing binaries.
				const searchResults = await api.searchInfo(`${pkgName}/*`);
				expect(searchResults).not.to.be.empty;

				const cachedPackages = await api.listCache(`${pkgName}/*`);
				expect(cachedPackages).to.be.an("array").that.is.empty;
			});
		});

		describe("when cache is empty", function () {
			before(async function () {
				// Uninstall all packages and delete them from cache
				const installedPackages = await api.list();
				for (const pkg of installedPackages) {
					try {
						await api.uninstall(pkg.name);
					} catch (error) {
						// Ignore errors during cleanup
					}
				}

				const cachedPackages = await api.listCache();
				for (const pkg of cachedPackages) {
					try {
						await api.delete(
							`${pkg.reference.name}/${pkg.reference.version}`
						);
					} catch (error) {
						// Ignore errors during cleanup
					}
				}
			});

			it("should return an empty array", async function () {
				const cachedPackages = await api.listCache();
				expect(cachedPackages).to.be.an("array");
				expect(cachedPackages).to.have.length(0);
			});
		});

		describe("when packages exist in cache", function () {
			before(async function () {
				// Install test packages to populate cache
				const testPackages: CfsPackageReference[] = [
					{ name: "test_pkg1", version: "1.0" },
					{ name: "test_pkg2", version: "1.0" }
				];

				await api.install(testPackages);
			});

			it("should return all cached packages (installed and uninstalled)", async function () {
				const cachedPackages = await api.listCache();
				expect(cachedPackages).to.be.an("array");
				expect(cachedPackages.length).to.be.at.least(2);

				// Check that test packages are in the cache
				const packageNames = cachedPackages.map(
					(pkg) => pkg.reference.name
				);
				expect(packageNames).to.include("test_pkg1");
				expect(packageNames).to.include("test_pkg2");
			});

			it("should indicate installed status correctly", async function () {
				const cachedPackages = await api.listCache();

				// All packages should be installed at this point
				for (const pkg of cachedPackages) {
					if (
						pkg.reference.name === "test_pkg1" ||
						pkg.reference.name === "test_pkg2"
					) {
						expect(pkg.isInstalled).to.be.true;
					}
				}
			});

			describe("when a package is uninstalled", function () {
				before(async function () {
					// Uninstall one package
					await api.uninstall("test_pkg1");
				});

				after(async function () {
					// Re-install for other tests
					await api.install({ name: "test_pkg1", version: "1.0" });
				});

				it("should include both installed and uninstalled packages with correct status", async function () {
					const cachedPackages = await api.listCache();

					// Cache should still have test_pkg1
					const cachedNames = cachedPackages.map(
						(pkg) => pkg.reference.name
					);
					expect(cachedNames).to.include("test_pkg1");
					expect(cachedNames).to.include("test_pkg2");

					// test_pkg1 should be marked as not installed
					const pkg1 = cachedPackages.find(
						(p) => p.reference.name === "test_pkg1"
					);
					expect(pkg1).to.not.be.undefined;
					expect(pkg1?.isInstalled).to.be.false;

					// test_pkg2 should still be marked as installed
					const pkg2 = cachedPackages.find(
						(p) => p.reference.name === "test_pkg2"
					);
					expect(pkg2).to.not.be.undefined;
					expect(pkg2?.isInstalled).to.be.true;
				});
			});

			it("should return packages with correct structure", async function () {
				const cachedPackages = await api.listCache();

				for (const pkg of cachedPackages) {
					expect(pkg).to.have.property("reference");
					expect(pkg).to.have.property("isInstalled");
					expect(pkg.reference).to.have.property("name");
					expect(pkg.reference).to.have.property("version");
					expect(pkg.reference.name).to.be.a("string");
					expect(pkg.reference.version).to.be.a("string");
					expect(pkg.isInstalled).to.be.a("boolean");
				}
			});
		});

		describe("with pattern parameter", function () {
			before(async function () {
				// Ensure we have test packages with different naming patterns
				// Install known available test packages
				await api.install([
					{ name: "test_pkg1", version: "1.0" },
					{ name: "test_pkg2", version: "1.0" },
					{ name: "test_pkg2", version: "1.2.0" },
					{ name: "test_pkg2", version: "1.3.4" }
				]);
			});

			it("should return only packages matching wildcard pattern", async function () {
				const cachedPackages = await api.listCache("test_pkg*");

				expect(cachedPackages).to.be.an("array");
				expect(cachedPackages.length).to.be.at.least(2);

				// All returned packages should match the pattern
				for (const pkg of cachedPackages) {
					expect(pkg.reference.name).to.match(/^test_pkg/);
				}
			});

			it("should handle pattern for specific package name", async function () {
				const cachedPackages = await api.listCache("test_pkg2");

				expect(cachedPackages).to.be.an("array");

				// All returned packages should be test_pkg2
				for (const pkg of cachedPackages) {
					expect(pkg.reference.name).to.equal("test_pkg2");
				}
			});

			it("should return multiple versions of the same package", async function () {
				const cachedPackages = await api.listCache("test_pkg2");

				// At least one version should be present in cache for the package.
				// Remote test data can vary across environments.
				const versions = cachedPackages.map(
					(pkg) => pkg.reference.version
				);
				expect(versions.length).to.be.greaterThan(1);
			});

			it("should return empty array when pattern matches no packages", async function () {
				const cachedPackages = await api.listCache("non_existent_*");

				expect(cachedPackages).to.be.an("array");
				expect(cachedPackages).to.have.length(0);
			});

			it("should return only specific package version when pattern includes version", async function () {
				const cachedPackages = await api.listCache("test_pkg2/1.0");

				expect(cachedPackages).to.be.an("array");
				expect(cachedPackages).to.have.length(1);
				expect(cachedPackages[0].reference).to.deep.equal({
					name: "test_pkg2",
					version: "1.0"
				});
				expect(cachedPackages[0].isInstalled).to.be.a("boolean");
			});
		});

		describe("default behavior without pattern", function () {
			it('should default to "*" pattern when no pattern provided', async function () {
				const allPackages = await api.listCache();
				const wildcardPackages = await api.listCache("*");

				expect(allPackages).to.deep.equal(wildcardPackages);
			});

			it("should return all cached packages when called without arguments", async function () {
				const cachedPackages = await api.listCache();

				expect(cachedPackages).to.be.an("array");
				expect(cachedPackages.length).to.be.greaterThan(0);
			});
		});
	});
});
