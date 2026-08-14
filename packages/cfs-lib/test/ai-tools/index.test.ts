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

import AIToolsPlugin from "../../src/ai-tools/index.js";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { type CfsSocDataModel } from "cfs-types";
import fs from "node:fs/promises";
import { expect } from "chai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("AIToolsPlugin", () => {
	let plugin: AIToolsPlugin;
	let dataModel: CfsSocDataModel;

	before(async () => {
		const dataModelFile = await fs.readFile(
			path.resolve(
				__dirname,
				"../fixtures/data-models/max32690-tqfn.json"
			),
			"utf-8"
		);
		dataModel = JSON.parse(dataModelFile) as CfsSocDataModel;
	});

	beforeEach(() => {
		plugin = new AIToolsPlugin("/dummy/path", "2.3.0");
	});

	describe("getAIDataFromSOCModel", () => {
		it("GIVEN uppercase coreId WHEN the canonical core uses mixed case THEN preserve canonical casing", () => {
			const mixedCaseDataModel = structuredClone(dataModel);
			mixedCaseDataModel.Cores[0].Id = "mIxEd";

			const result = plugin.getAIDataFromSOCModel(
				mixedCaseDataModel,
				"MAX32690",
				"TQFN",
				"MIXED"
			);

			expect(result.Target.Core).to.equal("mIxEd");
		});

		it("GIVEN invalid coreId WHEN getAIDataFromSOCModel THEN error", () => {
			expect(() =>
				plugin.getAIDataFromSOCModel(
					dataModel,
					"MAX32690",
					"TQFN",
					"CM7"
				)
			).to.throw("Core 'CM7' is not found for 'MAX32690'");
		});
	});
});
