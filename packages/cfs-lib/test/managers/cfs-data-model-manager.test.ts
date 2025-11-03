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
					"1.1.0"
				);

				expect(result).to.not.be.undefined;
				expect(result?.Name).to.equal("TEST_SOC_A");
				expect(result?.Version).to.equal("1.1.44");
				expect(result?.Schema).to.equal("1.1.0");
				expect(result?.Parts).to.have.lengthOf(1);
				expect(result?.Parts[0].Name).to.equal("TEST_SOC_A");
				expect(result?.Parts[0].Package).to.equal("WLP");
			});

			it("should return data model for mock TEST_SOC_B TQFN SoC", async () => {
				const result = await dataModelManager.getDataModel(
					"TEST_SOC_B",
					"TQFN",
					"1.1.0"
				);

				expect(result).to.not.be.undefined;
				expect(result?.Name).to.equal("TEST_SOC_B");
				expect(result?.Version).to.equal("1.1.44");
				expect(result?.Schema).to.equal("1.1.0");
				expect(result?.Parts).to.have.lengthOf(1);
				expect(result?.Parts[0].Name).to.equal("TEST_SOC_B");
				expect(result?.Parts[0].Package).to.equal("TQFN");
				expect(result?.Cores).to.have.lengthOf(2);
			});

			it("should return undefined for non-existent SoC", async () => {
				const result = await dataModelManager.getDataModel(
					"NONEXISTENT",
					"WLP",
					"1.1.0"
				);

				expect(result).to.be.undefined;
			});

			it("should return undefined for non-existent package", async () => {
				const result = await dataModelManager.getDataModel(
					"TEST_SOC_A",
					"NONEXISTENT",
					"1.1.0"
				);

				expect(result).to.be.undefined;
			});

			it("should return undefined for non-existent schema version", async () => {
				const result = await dataModelManager.getDataModel(
					"MAX32657",
					"WLP",
					"999.0.0"
				);

				expect(result).to.be.undefined;
			});
		});

		describe("listDataModels from custom search paths only.", () => {
			it("should return all available data models from custom search paths", async () => {
				const result = await dataModelManager.listDataModels();

				expect(result).to.have.lengthOf(2);

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
					"1.1.0"
				);
				expect(result).to.not.be.undefined;
				expect(result?.Name).to.equal("TEST_SOC_A");
			});
		});

		describe("error handling", () => {
			it("should handle empty search paths gracefully", async () => {
				const emptyManager = new CfsDataModelManager(undefined, []);

				const result = await emptyManager.getDataModel(
					"TEST_SOC_A",
					"WLP",
					"1.1.0"
				);
				expect(result).to.be.undefined;

				const listResult = await emptyManager.listDataModels();
				expect(listResult).to.have.lengthOf(0);
			});

			it("should handle non-existent search paths gracefully", async () => {
				const invalidManager = new CfsDataModelManager(undefined, [
					"/nonexistent/path"
				]);

				const result = await invalidManager.getDataModel(
					"TEST_SOC_A",
					"WLP",
					"1.1.0"
				);

				expect(result).to.be.undefined;

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
});
