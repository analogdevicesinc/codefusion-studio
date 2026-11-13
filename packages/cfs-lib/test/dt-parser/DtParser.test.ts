/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import { DtParser } from "../../src/parsers/dt-parser/DtParser.js";
import { expect } from "chai";
import { dirname } from "node:path";
import path from "path";
import { fileURLToPath } from "node:url";
import { promises as fs } from "node:fs";

async function readContent(fname: string) {
	// Calculate the directory name for the current module
	const __dirname = dirname(fileURLToPath(import.meta.url));
	// Construct the full path to the input file

	const inputFilePath = path.join(
		__dirname,
		"../../src/parsers/dt-parser/data",
		fname
	);

	const content = await fs.readFile(inputFilePath, "utf8");
	return content;
}

describe("DT Parser", () => {
	it("export to json", async () => {
		const content = await readContent("zephyr.dts");
		const parser = new DtParser({});
		try {
			const json: unknown = await parser.jsonFromString(content);
			/* eslint-disable @typescript-eslint/no-unused-vars */
			const str = JSON.stringify(json, null, 2); // spacing level = 2
			// console.log(str);
		} catch (error) {
			console.error(error);
			throw error;
		}
	});

	it("preserves multiple labels when nodes are merged", async () => {
		// SoC file defines sram0 / sram2 labels
		const socDts = `/dts-v1/;
/ {
	soc {
		sram0: memory@20000000 {
			compatible = "mmio-sram";
			reg = < 0x20000000 0x10000 >;
		};
		sram2: memory@20010000 {
			compatible = "mmio-sram";
			reg = < 0x20010000 0x8000 >;
		};
	};
};
`;
		// Board file adds a second label to the same nodes
		const boardDts = `/dts-v1/;
/ {
	soc {
		m4_sram: memory@20000000 {
			reg = < 0x20000000 0x10000 >;
		};
		rv32_sram: memory@20010000 {
			reg = < 0x20010000 0x8000 >;
		};
	};
	chosen {
		zephyr,sram = &m4_sram;
	};
};
`;
		const parser = new DtParser({});
		const combinedDts = socDts + "\n" + boardDts;
		const combinedJson = await parser.jsonFromString(
			combinedDts,
			"<board.dts>"
		);

		const soc = (combinedJson as Record<string, unknown>)
			.soc as Record<string, Record<string, unknown>>;
		const mem1 = soc["memory@20000000"];
		const mem2 = soc["memory@20010000"];

		expect(mem1.nodeLabels).to.deep.equal(["sram0", "m4_sram"]);
		expect(mem2.nodeLabels).to.deep.equal(["sram2", "rv32_sram"]);
	});
});
