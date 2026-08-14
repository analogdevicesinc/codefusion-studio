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

import { caseInsensitiveCompare } from "../../src/utils/string-utils.js";

describe("string-utils", function () {
	describe("caseInsensitiveCompare", function () {
		it("GIVEN same letters with different case WHEN comparing THEN return true", function () {
			expect(caseInsensitiveCompare("TEST", "test")).to.equal(true);
			expect(caseInsensitiveCompare("test", "TEST")).to.equal(true);
		});

		it("GIVEN different strings WHEN comparing THEN return false", function () {
			expect(caseInsensitiveCompare("TEST", "TEST2")).to.equal(false);
		});

		it("GIVEN one undefined WHEN comparing THEN return false", function () {
			expect(caseInsensitiveCompare("test", undefined)).to.equal(
				false
			);
			expect(caseInsensitiveCompare(undefined, "test")).to.equal(
				false
			);
		});

		it("GIVEN both undefined WHEN comparing THEN return true", function () {
			expect(caseInsensitiveCompare(undefined, undefined)).to.equal(
				true
			);
		});

		it("GIVEN one null WHEN comparing THEN return false", function () {
			expect(caseInsensitiveCompare("test", null)).to.equal(false);
			expect(caseInsensitiveCompare(null, "test")).to.equal(false);
		});

		it("GIVEN both null WHEN comparing THEN return true", function () {
			expect(caseInsensitiveCompare(null, null)).to.equal(true);
		});

		it("GIVEN null and undefined WHEN comparing THEN return false", function () {
			expect(caseInsensitiveCompare(null, undefined)).to.equal(false);
			expect(caseInsensitiveCompare(undefined, null)).to.equal(false);
		});
	});
});
