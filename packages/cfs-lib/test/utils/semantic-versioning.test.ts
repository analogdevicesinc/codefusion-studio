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

import {
	findLatestVersion,
	findMatchingVersion
} from "../../src/utils/semantic-versioning.js";
import { expect } from "chai";

describe("Semantic Versioning utilities", () => {
	describe("findLatestVersion", () => {
		it("should return undefined for empty array", () => {
			expect(findLatestVersion([])).to.be.undefined;
		});

		it("should return undefined when no valid versions exist", () => {
			expect(findLatestVersion(["invalid", "not-a-version", "bad"]))
				.to.be.undefined;
		});

		it("should filter out invalid versions and return valid one", () => {
			expect(
				findLatestVersion(["invalid", "1.0.0", "not-a-version"])
			).to.equal("1.0.0");
		});
	});

	describe("findMatchingVersion", () => {
		const availableVersions = ["1.0.0", "1.1.0", "1.2.0", "2.0.0"];

		it("should return matching version for exact version match", () => {
			const result = findMatchingVersion("1.1.0", availableVersions);
			expect(result).to.equal("1.1.0");
		});

		it("should return highest matching version for range", () => {
			const result = findMatchingVersion("^1.0.0", availableVersions);
			expect(result).to.equal("1.2.0");
		});

		it("should return undefined when exact version not found", () => {
			const result = findMatchingVersion("3.0.0", availableVersions);
			expect(result).to.be.undefined;
		});

		it("should return undefined when no version satisfies range", () => {
			const result = findMatchingVersion("^3.0.0", availableVersions);
			expect(result).to.be.undefined;
		});

		it("should return undefined for empty available versions array", () => {
			const result = findMatchingVersion("1.0.0", []);
			expect(result).to.be.undefined;
		});

		it("should return undefined for invalid version string", () => {
			const result = findMatchingVersion(
				"not-valid",
				availableVersions
			);
			expect(result).to.be.undefined;
		});

		it("should return undefined for invalid range string", () => {
			const result = findMatchingVersion(
				"totally-invalid-range",
				availableVersions
			);
			expect(result).to.be.undefined;
		});

		it("should filter invalid versions and match against valid ones", () => {
			const result = findMatchingVersion("1.0.0", [
				"invalid",
				"1.0.0",
				"bad"
			]);
			expect(result).to.equal("1.0.0");
		});
	});
});
