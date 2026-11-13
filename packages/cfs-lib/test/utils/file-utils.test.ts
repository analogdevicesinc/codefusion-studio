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
import {
	assertValidFileExtension,
	readJsonFile
} from "../../src/utils/file-utils.js";
import { describe, it, afterEach } from "mocha";
import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("file-utils", () => {
	describe("readJsonFile", () => {
		const tmpDir = os.tmpdir();
		const tmpFiles: string[] = [];

		function writeTmp(name: string, content: string): string {
			const filePath = path.join(tmpDir, name);
			fs.writeFileSync(filePath, content, "utf8");
			tmpFiles.push(filePath);

			return filePath;
		}

		afterEach(() => {
			for (const f of tmpFiles) {
				try {
					fs.unlinkSync(f);
				} catch {
					// already removed
				}
			}
			tmpFiles.length = 0;
		});

		it("GIVEN a valid JSON file WHEN readJsonFile THEN returns parsed object", () => {
			const filePath = writeTmp("valid.json", '{"key": "value"}');

			const result = readJsonFile(filePath);

			expect(result).to.deep.equal({ key: "value" });
		});

		it("GIVEN a non-existent file WHEN readJsonFile THEN throw file not found", () => {
			expect(() => readJsonFile("/no/such/file.json")).to.throw(
				"File not found: /no/such/file.json"
			);
		});

		it("GIVEN a file with invalid JSON WHEN readJsonFile THEN throw not valid JSON", () => {
			const filePath = writeTmp("invalid.json", "blah");

			expect(() => readJsonFile(filePath)).to.throw(
				`The file: ${filePath} is not a valid JSON file.`
			);
		});
	});

	describe("assertValidFileExtension", () => {
		it("GIVEN a file in extension list WHEN assertValidFileExtension THEN no error", () => {
			expect(() =>
				assertValidFileExtension("file.txt", [".txt", ".md"])
			).to.not.throw();
		});

		it("GIVEN a file not in extension list WHEN assertValidFileExtension THEN error", () => {
			expect(() =>
				assertValidFileExtension("file.png", [".txt", ".md"])
			).to.throw();
		});

		it("GIVEN a file with empty extension list WHEN assertValidFileExtension THEN error", () => {
			expect(() =>
				assertValidFileExtension("file.txt", [])
			).to.throw();
		});
	});
});
