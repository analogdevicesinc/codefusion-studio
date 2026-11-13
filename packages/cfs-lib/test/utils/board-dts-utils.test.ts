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

import { expect } from "chai";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
	resolveBoardDtsPath,
	parseBoardDts
} from "../../src/utils/board-dts-utils.js";

const zephyrBaseFixture = path.resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../fixtures/board-dts/zephyr-base"
);

describe("board-dts-utils", () => {
	describe("resolveBoardDtsPath", () => {
		it("builds the boards/adi/<dir> path and converts '/' to '_'", () => {
			const result = resolveBoardDtsPath(
				"/zephyr",
				"max32655evkit/max32655/m4"
			);

			expect(result).to.equal(
				path.join(
					"/zephyr",
					"boards",
					"adi",
					"max32655evkit",
					"max32655evkit_max32655_m4.dts"
				)
			);
		});

		it("handles a single-segment board name", () => {
			const result = resolveBoardDtsPath("/zephyr", "myboard");

			expect(result).to.equal(
				path.join(
					"/zephyr",
					"boards",
					"adi",
					"myboard",
					"myboard.dts"
				)
			);
		});
	});

	describe("parseBoardDts", () => {
		it("returns undefined when the board DTS path does not exist", async () => {
			const result = await parseBoardDts(
				"/nonexistent-zephyr-base",
				"missingboard/missingsoc/m4"
			);

			expect(result).to.equal(undefined);
		});

		it("parses a mapped-partition board DTS into a tree", async () => {
			const result = await parseBoardDts(
				zephyrBaseFixture,
				"mappedboard/testsoc/m4"
			);

			expect(result).to.be.an("object");
			expect(JSON.stringify(result)).to.include(
				"zephyr,mapped-partition"
			);
		});

		it("parses a fixed-partition board DTS distinctly from a mapped one", async () => {
			const result = await parseBoardDts(
				zephyrBaseFixture,
				"fixedboard/testsoc/m4"
			);

			expect(result).to.be.an("object");

			const serialized = JSON.stringify(result);

			expect(serialized).to.not.include("zephyr,mapped-partition");
			expect(serialized).to.include("image-0");
		});
	});
});
