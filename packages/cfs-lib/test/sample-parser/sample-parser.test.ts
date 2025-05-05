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
import { expect } from "chai";

import { test } from "mocha";
import { SampleParser } from "../../src/index.js";

describe("SampleParser", () => {
	const parser = new SampleParser();

	test("should parse a valid JSON string", () => {
		const jsonString = '{"name": "John", "age": 30}';
		const expected = { name: "John", age: 30 };
		const result = parser.parse(jsonString);
		expect(result).to.deep.equal(expected);
	});

	test("should throw an error when parsing an invalid JSON string", () => {
		const jsonString = '{name: "John", age: 30}';
		expect(() => parser.parse(jsonString)).to.throw();
	});
});
