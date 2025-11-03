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
	compareVersions,
	findLatestVersion
} from "../../src/utils/semantic-versioning.js";
import { expect } from "chai";

describe("compareVersions", () => {
	it("returns 0 for equal versions", () => {
		expect(compareVersions("1.2.3", "1.2.3")).to.equal(0);
		expect(compareVersions("0.0.0", "0.0.0")).to.equal(0);
	});

	it("returns positive if first is greater", () => {
		expect(compareVersions("1.2.4", "1.2.3")).to.be.greaterThan(0);
		expect(compareVersions("2.0.0", "1.9.9")).to.be.greaterThan(0);
		expect(compareVersions("1.10.0", "1.2.99")).to.be.greaterThan(0);
		expect(compareVersions("1.2.0", "1.1.99")).to.be.greaterThan(0);
	});

	it("returns negative if first is less", () => {
		expect(compareVersions("1.2.3", "1.2.4")).to.be.lessThan(0);
		expect(compareVersions("1.9.9", "2.0.0")).to.be.lessThan(0);
		expect(compareVersions("1.2.99", "1.10.0")).to.be.lessThan(0);
		expect(compareVersions("1.1.99", "1.2.0")).to.be.lessThan(0);
	});

	it("handles missing patch/minor/major as zero", () => {
		expect(compareVersions("1.2", "1.2.0")).to.equal(0);
		expect(compareVersions("1", "1.0.0")).to.equal(0);
		expect(compareVersions("1.0.1", "1")).to.be.greaterThan(0);
		expect(compareVersions("1.0", "1.0.1")).to.be.lessThan(0);
	});
});

describe("findLatestVersion", () => {
	it("returns the highest version", () => {
		expect(findLatestVersion(["1.2.3", "1.2.4", "1.2.2"])).to.equal(
			"1.2.4"
		);
		expect(findLatestVersion(["0.1.0", "0.0.9", "0.1.1"])).to.equal(
			"0.1.1"
		);
		expect(findLatestVersion(["2.0.0", "1.9.9", "2.0.1"])).to.equal(
			"2.0.1"
		);
		expect(findLatestVersion(["1.2.0", "1.2", "1.2.1"])).to.equal(
			"1.2.1"
		);
	});

	it("returns the only version if array has one element", () => {
		expect(findLatestVersion(["1.2.3"])).to.equal("1.2.3");
	});

	it("works with unordered input", () => {
		expect(findLatestVersion(["1.2.3", "1.2.1", "1.2.2"])).to.equal(
			"1.2.3"
		);
		expect(findLatestVersion(["1.2.1", "1.2.3", "1.2.2"])).to.equal(
			"1.2.3"
		);
	});
});
