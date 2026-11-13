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

import type { JSONSchemaType } from "ajv";
import { compileJsonSchemaValidator } from "../../src/utils/json-schema-validator.js";

describe("json-schema-validator", function () {
	describe("compileJsonSchemaValidator", function () {
		const schema = {
			type: "object",
			properties: {
				name: { type: "string" }
			},
			required: ["name"],
			additionalProperties: false
		};

		it("GIVEN a matching document WHEN validating THEN narrows and returns true", function () {
			const typedSchema: JSONSchemaType<{ name: string }> = {
				type: "object",
				properties: { name: { type: "string" } },
				required: ["name"],
				additionalProperties: false
			};
			const validator = compileJsonSchemaValidator(typedSchema);
			const data: unknown = { name: "ok" };

			expect(validator.validate(data)).to.equal(true);

			if (validator.validate(data)) {
				const name: string = data.name;

				expect(name).to.equal("ok");
			}
		});

		it("GIVEN a non-matching document WHEN validating THEN returns false with a populated errorsText", function () {
			const validator = compileJsonSchemaValidator(schema);

			expect(validator.validate({})).to.equal(false);
			expect(validator.errorsText()).to.be.a("string").and.not.empty;
		});

		it("GIVEN a structurally invalid schema WHEN compiling THEN throws", function () {
			const invalidSchema = { type: "not-a-real-type" };

			expect(() =>
				compileJsonSchemaValidator(invalidSchema)
			).to.throw();
		});

		it("GIVEN an async schema WHEN compiling THEN throws before returning a validator", function () {
			expect(() =>
				compileJsonSchemaValidator({
					$async: true,
					type: "object"
				})
			).to.throw(/does not support async schemas/);
		});
	});
});
