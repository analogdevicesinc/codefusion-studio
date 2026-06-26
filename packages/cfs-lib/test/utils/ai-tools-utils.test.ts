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
import { SocControl } from "cfs-types";
import { expect } from "chai";
import { getValidExtensions } from "../../src/ai-tools/ai-tools-utils.js";

describe("ai-tools-utils", function () {
	describe("getValidExtensions", function () {
		const exampleBackendProperties: SocControl[] = [
			{
				Id: "SomeString",
				Type: "string",
				Description: "SomeString"
			},
			{
				Id: "SomeBoolean",
				Type: "boolean",
				Description: "SomeBoolean",
				Default: true
			},
			{
				Id: "SomeEnum",
				Type: "enum",
				Description: "SomeEnum",
				Default: "A",
				EnumValues: [
					{
						Id: "A",
						Value: "A",
						Description: "A"
					},
					{
						Id: "B",
						Value: "B",
						Description: "B"
					}
				]
			},
			{
				Id: "SomeArray",
				Type: "array",
				Description: "SomeArray",
				Default: "[]"
			}
		];

		it("GIVEN no extensions WHEN getValidExtensions THEN return defaults", function () {
			try {
				const result = getValidExtensions(
					[],
					exampleBackendProperties
				);
				expect(result).to.deep.equal({
					SomeBoolean: true,
					SomeEnum: "A",
					SomeArray: "[]"
				});
			} finally {
				/* empty */
			}
		});

		it("GIVEN extensions WHEN getValidExtensions THEN return defaults + extensions overwrite", function () {
			try {
				const result = getValidExtensions(
					["SomeString=xyz", "SomeBoolean=false"],
					exampleBackendProperties
				);
				expect(result).to.deep.equal({
					SomeString: "xyz",
					SomeBoolean: false,
					SomeEnum: "A",
					SomeArray: "[]"
				});
			} finally {
				/* empty */
			}
		});

		it("GIVEN valid array extension WHEN getValidExtensions THEN return comma-separated string", function () {
			try {
				const result = getValidExtensions(
					["SomeArray=1,2,3"],
					exampleBackendProperties
				);
				expect(result).to.deep.equal({
					SomeBoolean: true,
					SomeEnum: "A",
					SomeArray: "1,2,3"
				});
			} finally {
				/* empty */
			}
		});

		it("GIVEN invalid array extension WHEN getValidExtensions THEN error", function () {
			try {
				getValidExtensions(["SomeArray=,"], exampleBackendProperties);
				expect.fail();
			} catch (error) {
				expect((error as Error).message).to.equal(
					"Invalid value for 'somearray', expected format: key=value,value,..."
				);
			}
		});

		it("GIVEN invalid extension WHEN getValidExtensions THEN error", function () {
			const extensions: string[] = ["x=y"];

			try {
				getValidExtensions(extensions, exampleBackendProperties);
				expect.fail();
			} catch (error) {
				expect((error as Error).message).to.equal(
					`Invalid extension "x", valid options: ${exampleBackendProperties.map((property) => property.Id).join(", ")}`
				);
			}
		});

		it("GIVEN invalid extension format WHEN getValidExtensions THEN error", function () {
			const extensions: string[] = ["x:y"];

			try {
				getValidExtensions(extensions, exampleBackendProperties);
				expect.fail();
			} catch (error) {
				expect((error as Error).message).to.equal(
					`Invalid extension format: ${extensions[0]}. Expected format is key=value.`
				);
			}
		});

		it("GIVEN invalid boolean extension value WHEN getValidExtensions THEN error", function () {
			const extensions: string[] = ["someboolean=123"];

			try {
				getValidExtensions(extensions, exampleBackendProperties);
				expect.fail();
			} catch (error) {
				expect((error as Error).message).to.equal(
					"Invalid value for 'someboolean', expected one of: true, false"
				);
			}
		});

		it("GIVEN invalid enum extension value WHEN getValidExtensions THEN error", function () {
			const extensions: string[] = ["someenum=C"];

			try {
				getValidExtensions(extensions, exampleBackendProperties);
				expect.fail();
			} catch (error) {
				expect((error as Error).message).to.equal(
					"Invalid value for 'someenum', expected one of: A, B (default: A)"
				);
			}
		});
	});
});
