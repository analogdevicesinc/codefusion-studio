/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import { DtParser } from "../../src/dt-parser/DtParser.js";
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
		"../../src/dt-parser/data",
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
});
