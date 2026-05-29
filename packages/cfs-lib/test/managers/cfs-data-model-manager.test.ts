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

import { describe, it, beforeEach } from "mocha";
import { expect } from "chai";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CfsDataModelManager } from "../../src/managers/cfs-data-model-manager.js";
import { MissingDependencyError } from "../../src/utils/missing-dependency-error.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("CfsDataModelManager", () => {
	const testFixturesPath = path.resolve(
		__dirname,
		"../fixtures/data-models"
	);

	describe("With undefined package manager", () => {
		let dataModelManager: CfsDataModelManager;

		beforeEach(() => {
			// Initialize with undefined package manager and test fixtures path
			dataModelManager = new CfsDataModelManager(undefined, [
				testFixturesPath
			]);
		});

		describe("getDataModel from custom search paths only.", () => {
			it("should return data model for mock TEST_SOC_A WLP SoC", async () => {
				const result = await dataModelManager.getDataModel(
					"TEST_SOC_A",
					"WLP",
					"1.1.44"
				);

				expect(result).to.not.be.undefined;
				expect(result.Name).to.equal("TEST_SOC_A");
				expect(result.Version).to.equal("1.1.44");
				expect(result.Schema).to.equal("1.1.0");
				expect(result.Parts).to.have.lengthOf(1);
				expect(result.Parts[0].Name).to.equal("TEST_SOC_A");
				expect(result.Parts[0].Package).to.equal("WLP");
			});

			it("should return data model for mock TEST_SOC_B TQFN SoC", async () => {
				const result = await dataModelManager.getDataModel(
					"TEST_SOC_B",
					"TQFN",
					"1.1.44"
				);

				expect(result).to.not.be.undefined;
				expect(result.Name).to.equal("TEST_SOC_B");
				expect(result.Version).to.equal("1.1.44");
				expect(result.Schema).to.equal("1.1.0");
				expect(result.Parts).to.have.lengthOf(1);
				expect(result.Parts[0].Name).to.equal("TEST_SOC_B");
				expect(result.Parts[0].Package).to.equal("TQFN");
				expect(result.Cores).to.have.lengthOf(2);
			});

			it("should throw MissingDependencyError for non-existent SoC", async () => {
				try {
					await dataModelManager.getDataModel(
						"NONEXISTENT",
						"WLP",
						"1.1.44"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.socName).to.equal("NONEXISTENT");
					expect(pkgError.details.packageId).to.equal("WLP");
				}
			});

			it("should throw MissingDependencyError for non-existent package", async () => {
				try {
					await dataModelManager.getDataModel(
						"TEST_SOC_A",
						"NONEXISTENT",
						"1.1.44"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.socName).to.equal("TEST_SOC_A");
					expect(pkgError.details.packageId).to.equal("NONEXISTENT");
				}
			});

			it("should throw MissingDependencyError for non-existent schema version", async () => {
				try {
					await dataModelManager.getDataModel(
						"MAX32657",
						"WLP",
						"999.0.0"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.requestedVersion).to.equal(
						"999.0.0"
					);
				}
			});
		});

		describe("listDataModels from custom search paths only.", () => {
			it("should return all available data models from custom search paths", async () => {
				const result = await dataModelManager.listDataModels();

				expect(result).to.have.lengthOf(3);

				const testSocAModel = result.find(
					(model) => model.name === "TEST_SOC_A"
				);
				expect(testSocAModel).to.not.be.undefined;
				expect(testSocAModel?.package).to.equal("WLP");
				expect(testSocAModel?.version).to.equal("1.1.44");
				expect(testSocAModel?.schema).to.equal("1.1.0");
				expect(testSocAModel?.description).to.equal(
					"Test fixture for TEST_SOC_A"
				);

				const testSocBModel = result.find(
					(model) => model.name === "TEST_SOC_B"
				);
				expect(testSocBModel).to.not.be.undefined;
				expect(testSocBModel?.package).to.equal("TQFN");
				expect(testSocBModel?.version).to.equal("1.1.44");
				expect(testSocBModel?.schema).to.equal("1.1.0");
				expect(testSocBModel?.description).to.equal(
					"Test fixture for TEST_SOC_B"
				);
			});

			it("should include package path information", async () => {
				const result = await dataModelManager.listDataModels();

				result.forEach((model) => {
					expect(model.pkgPath).to.equal(testFixturesPath);
					expect(model.path).to.be.a("string");
				});
			});
		});

		describe("getCustomSearchPaths", () => {
			it("should return configured search paths", () => {
				const searchPaths = dataModelManager.getCustomSearchPaths();

				expect(searchPaths).to.have.lengthOf(1);
				expect(searchPaths[0]).to.equal(testFixturesPath);
			});
		});

		describe("with function-based search paths", () => {
			it("should support dynamic search paths", async () => {
				const dynamicManager = new CfsDataModelManager(
					undefined,
					() => [testFixturesPath]
				);

				const result = await dynamicManager.getDataModel(
					"TEST_SOC_A",
					"WLP",
					"1.1.44"
				);
				expect(result).to.not.be.undefined;
				expect(result.Name).to.equal("TEST_SOC_A");
			});
		});

		describe("error handling", () => {
			it("should throw MissingDependencyError for empty search paths", async () => {
				const emptyManager = new CfsDataModelManager(undefined, []);

				try {
					await emptyManager.getDataModel(
						"TEST_SOC_A",
						"WLP",
						"1.1.0"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.availableVersions).to.have.lengthOf(
						0
					);
				}

				const listResult = await emptyManager.listDataModels();
				expect(listResult).to.have.lengthOf(0);
			});

			it("should throw MissingDependencyError for non-existent search paths", async () => {
				const invalidManager = new CfsDataModelManager(undefined, [
					"/nonexistent/path"
				]);

				try {
					await invalidManager.getDataModel(
						"TEST_SOC_A",
						"WLP",
						"1.1.0"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
				}

				const listResult = await invalidManager.listDataModels();
				expect(listResult).to.have.lengthOf(0);
			});
		});
	});

	describe("with package manager", () => {
		// TODO: Add tests for scenarios where package manager is provided
		// These tests would need to mock the package manager behavior
		it("should be implemented when package manager mocking is available", () => {
			// Placeholder for future tests that will test scenarios where
			// the CfsDataModelManager is initialized with an actual package manager instance
			expect(true).to.be.true;
		});
	});

	describe("Semver range resolution", () => {
		const versionedFixturesPaths = [
			path.resolve(__dirname, "../fixtures/data-models-v1.0.0"),
			path.resolve(__dirname, "../fixtures/data-models-v1.1.0"),
			path.resolve(__dirname, "../fixtures/data-models-v1.2.0"),
			path.resolve(__dirname, "../fixtures/data-models-v2.0.0")
		];

		let dataModelManager: CfsDataModelManager;

		beforeEach(() => {
			dataModelManager = new CfsDataModelManager(
				undefined,
				versionedFixturesPaths
			);
		});

		describe("exact version matching", () => {
			it("should return exact version when specified", async () => {
				const result = await dataModelManager.getDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"1.1.0"
				);

				expect(result).to.not.be.undefined;
				expect(result.Version).to.equal("1.1.0");
			});

			it("should throw MissingDependencyError for exact version not installed", async () => {
				try {
					await dataModelManager.getDataModel(
						"VERSIONED_SOC",
						"TEST_PKG",
						"1.5.0"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.requestedVersion).to.equal("1.5.0");
					expect(pkgError.details.availableVersions).to.include(
						"1.0.0"
					);
					expect(pkgError.details.availableVersions).to.include(
						"1.1.0"
					);
				}
			});
		});

		describe("caret range (^) - compatible versions", () => {
			it("should return highest compatible version for ^1.0.0", async () => {
				const result = await dataModelManager.getDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"^1.0.0"
				);

				expect(result).to.not.be.undefined;
				expect(result.Version).to.equal("1.2.0");
			});

			it("should throw MissingDependencyError for caret range with no compatible versions", async () => {
				try {
					await dataModelManager.getDataModel(
						"VERSIONED_SOC",
						"TEST_PKG",
						"^3.0.0"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.requestedVersion).to.equal(
						"^3.0.0"
					);
				}
			});
		});

		describe("tilde range (~) - patch-level compatible", () => {
			it("should return highest patch version for ~1.1.0", async () => {
				const result = await dataModelManager.getDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"~1.1.0"
				);

				expect(result).to.not.be.undefined;
				expect(result.Version).to.equal("1.1.0");
			});
		});

		describe("x-range versions", () => {
			it("should return highest 1.x version for 1.x range", async () => {
				const result = await dataModelManager.getDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"1.x"
				);

				expect(result).to.not.be.undefined;
				expect(result.Version).to.equal("1.2.0");
			});
		});

		describe("comparator ranges", () => {
			it("should return highest version satisfying >=1.1.0 <2.0.0", async () => {
				const result = await dataModelManager.getDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					">=1.1.0 <2.0.0"
				);

				expect(result).to.not.be.undefined;
				expect(result.Version).to.equal("1.2.0");
			});

			it("should return latest version for >=1.0.0", async () => {
				const result = await dataModelManager.getDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					">=1.0.0"
				);

				expect(result).to.not.be.undefined;
				expect(result.Version).to.equal("2.0.0");
			});
		});

		describe("latest version (no version specified)", () => {
			it("should return the latest version when no version specified", async () => {
				const result = await dataModelManager.getDataModel(
					"VERSIONED_SOC",
					"TEST_PKG"
				);

				expect(result).to.not.be.undefined;
				expect(result.Version).to.equal("2.0.0");
			});
		});

		describe("validateDataModel()", () => {
			it("should validate successfully when data model exists", async () => {
				// Should not throw
				await dataModelManager.validateDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"1.1.0"
				);
			});

			it("should validate successfully without loading the full data model", async () => {
				// First, ensure data model is NOT in cache
				const freshManager = new CfsDataModelManager(undefined, [
					testFixturesPath
				]);

				// Validate should succeed without loading the file
				await freshManager.validateDataModel(
					"TEST_SOC_A",
					"WLP",
					"1.1.44"
				);

				// Now getDataModel should still work (loads from index)
				const result = await freshManager.getDataModel(
					"TEST_SOC_A",
					"WLP",
					"1.1.44"
				);

				expect(result).to.not.be.undefined;
				expect(result.Name).to.equal("TEST_SOC_A");
			});

			// Legacy MissingDataModelError tests removed as part of migration to MissingDependencyError

			it("should throw MissingDependencyError for non-existent version", async () => {
				try {
					await dataModelManager.validateDataModel(
						"TEST_SOC_A",
						"WLP",
						"9.9.9"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.requestedVersion).to.equal("9.9.9");
				}
			});

			it("should validate successfully with cached data model", async () => {
				// First load it to populate cache
				await dataModelManager.getDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"1.2.0"
				);

				// Then validate should use cache
				await dataModelManager.validateDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"1.2.0"
				);
			});

			it("should validate with semver range", async () => {
				await dataModelManager.validateDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"^1.0.0"
				);
			});

			it("should validate with tilde range", async () => {
				await dataModelManager.validateDataModel(
					"VERSIONED_SOC",
					"TEST_PKG",
					"~1.0.0"
				);
			});

			it("should include available versions in validation error", async () => {
				try {
					await dataModelManager.validateDataModel(
						"VERSIONED_SOC",
						"TEST_PKG",
						"^3.0.0"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.availableVersions).to.include(
						"1.0.0"
					);
					expect(pkgError.details.availableVersions).to.include(
						"1.1.0"
					);
					expect(pkgError.details.availableVersions).to.include(
						"2.0.0"
					);
				}
			});
		});

		describe("MissingDependencyError properties", () => {
			it("should include available versions in error", async () => {
				try {
					await dataModelManager.getDataModel(
						"VERSIONED_SOC",
						"TEST_PKG",
						"^3.0.0"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					expect(pkgError.details.requestedVersion).to.equal(
						"^3.0.0"
					);
					const availVersions = pkgError.details
						.availableVersions as string[];
					expect(availVersions).to.include("1.0.0");
					expect(availVersions).to.include("1.1.0");
					expect(availVersions).to.include("2.0.0");
				}
			});

			it("should indicate no versions when none are installed", async () => {
				try {
					await dataModelManager.getDataModel(
						"NONEXISTENT_SOC",
						"TEST_PKG",
						"1.0.0"
					);
					expect.fail("Expected MissingPackageError to be thrown");
				} catch (error) {
					const pkgError = error as MissingDependencyError;
					expect(pkgError).to.be.instanceOf(MissingDependencyError);
					expect(pkgError.dependencyType).to.equal("data-model");
					const availVersions = pkgError.details
						.availableVersions as string[];
					expect(availVersions).to.have.lengthOf(0);
				}
			});
		});
	});
});
