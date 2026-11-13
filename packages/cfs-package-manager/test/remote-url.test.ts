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
import { validateRemoteUrl } from "../src/utils/remote-url.js";

describe("validateRemoteUrl", () => {
	it("should accept http and https URLs and normalize them", () => {
		expect(validateRemoteUrl("https://example.com")).to.deep.equal({
			valid: true,
			url: "https://example.com/"
		});
		expect(
			validateRemoteUrl("  http://localhost:9300/artifactory  ")
		).to.deep.equal({
			valid: true,
			url: "http://localhost:9300/artifactory"
		});
	});

	it("should reject empty URLs as required", () => {
		for (const url of ["", "   "]) {
			expect(validateRemoteUrl(url)).to.deep.equal({
				valid: false,
				error: "required"
			});
		}
	});

	it("should reject strings that do not parse as URLs", () => {
		for (const url of ["notaurl", "//example.com", "https://"]) {
			expect(validateRemoteUrl(url)).to.deep.equal({
				valid: false,
				error: "invalid"
			});
		}
	});

	it("should reject URLs that do not use http or https", () => {
		for (const url of [
			"localhost:9300",
			"ftp://example.com/repo",
			"file:///tmp/repo",
			"c:\\conan\\repo",
			"mailto:someone@example.com"
		]) {
			expect(validateRemoteUrl(url)).to.deep.equal({
				valid: false,
				error: "unsupportedProtocol"
			});
		}
	});
});
