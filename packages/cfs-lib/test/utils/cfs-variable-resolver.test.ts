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

import { CfsVariableResolver } from "../../src/utils/cfs-variable-resolver.js";
import { CfsToolManager } from "../../src/managers/cfs-tool-manager.js";
import { expect } from "chai";

// Manual mock implementation for CfsToolManager
class MockToolManager {
	public resolveTemplatePathsCalls: string[] = [];

	resolveTemplatePaths(input: string): Promise<string> {
		this.resolveTemplatePathsCalls.push(input);

		const toolPaths: Record<string, string> = {
			"mock-tool-1": "/path/to/mock-tool-1",
			"mock-tool-2": "/path/to/mock-tool-2",
			"mock-tool-3": "/path/to/mock-tool-3",
			"mock-tool-4": "/path/to/mock-tool-4"
		};

		return Promise.resolve(toolPaths[input] || input);
	}
}

describe("CfsVariableResolver", function () {
	let toolManager: MockToolManager;
	let resolver: CfsVariableResolver;

	beforeEach(function () {
		toolManager = new MockToolManager();
		resolver = new CfsVariableResolver(
			toolManager as unknown as CfsToolManager
		);
	});

	it("should resolve a single template variable", async function () {
		const input =
			"Use ${cfs:tool.path.mock-tool-1} for version control";
		const expected = "Use /path/to/mock-tool-1 for version control";

		const result = await resolver.resolveStringVariables(input);

		expect(result).to.equal(
			expected,
			"Failed to resolve single template variable"
		);
		expect(toolManager.resolveTemplatePathsCalls.length).to.equal(
			1,
			"Expected 1 call to resolveTemplatePaths"
		);
		expect(toolManager.resolveTemplatePathsCalls[0]).to.equal(
			"mock-tool-1",
			"Expected call with mock-tool-1"
		);
	});

	it("should resolve multiple template variables in the same string", async function () {
		const input =
			"${cfs:tool.path.mock-tool-1}/usr/bin;${cfs:tool.path.mock-tool-2};${cfs:tool.path.mock-tool-3};${env:PATH}";
		const expected =
			"/path/to/mock-tool-1/usr/bin;/path/to/mock-tool-2;/path/to/mock-tool-3;${env:PATH}";

		const result = await resolver.resolveStringVariables(input);

		expect(result).to.equal(
			expected,
			"Failed to resolve multiple template variables"
		);
		expect(toolManager.resolveTemplatePathsCalls.length).to.equal(
			3,
			"Expected 3 calls to resolveTemplatePaths"
		);
		expect(toolManager.resolveTemplatePathsCalls).to.include(
			"mock-tool-1",
			"Expected call with mock-tool-1"
		);
		expect(toolManager.resolveTemplatePathsCalls).to.include(
			"mock-tool-2",
			"Expected call with mock-tool-2"
		);
		expect(toolManager.resolveTemplatePathsCalls).to.include(
			"mock-tool-3",
			"Expected call with mock-tool-3"
		);
	});

	it("should leave non-cfs variables untouched", async function () {
		const input =
			"${config:cfs.sdk.path}/MockDir/bin;${cfs:tool.path.mock-tool-3};${env:PATH}";
		const expected =
			"${config:cfs.sdk.path}/MockDir/bin;/path/to/mock-tool-3;${env:PATH}";

		const result = await resolver.resolveStringVariables(input);

		expect(result).to.equal(
			expected,
			"Failed to handle non-cfs variables correctly"
		);
		expect(toolManager.resolveTemplatePathsCalls.length).to.equal(
			1,
			"Expected 1 call to resolveTemplatePaths"
		);
		expect(toolManager.resolveTemplatePathsCalls[0]).to.equal(
			"mock-tool-3",
			"Expected call with mock-tool-3"
		);
	});

	it("should handle nested object resolution with template variables", async function () {
		const input = {
			name: "test-config",
			paths: [
				"${cfs:tool.path.mock-tool-1}/bin",
				"${cfs:tool.path.mock-tool-2}/bin"
			],
			environment: {
				PATH: "${cfs:tool.path.mock-tool-1}/usr/bin;${cfs:tool.path.mock-tool-3};${env:PATH}",
				HOME: "${cfs:tool.path.mock-tool-2}/home"
			}
		};

		const expected = {
			name: "test-config",
			paths: ["/path/to/mock-tool-1/bin", "/path/to/mock-tool-2/bin"],
			environment: {
				PATH: "/path/to/mock-tool-1/usr/bin;/path/to/mock-tool-3;${env:PATH}",
				HOME: "/path/to/mock-tool-2/home"
			}
		};

		await resolver.resolveObjectVariables(input);

		expect(input).to.deep.equal(
			expected,
			"Failed to resolve nested object variables"
		);
		expect(toolManager.resolveTemplatePathsCalls.length).to.equal(
			5,
			"Expected 5 calls to resolveTemplatePaths"
		);
	});

	it("should handle mixed strings with multiple variable types", async function () {
		const input =
			"Use ${cfs:tool.path.mock-tool-4} with ${config:cfs.sdk.path} and ${cfs:tool.path.mock-tool-3}";
		const expected =
			"Use /path/to/mock-tool-4 with ${config:cfs.sdk.path} and /path/to/mock-tool-3";

		const result = await resolver.resolveStringVariables(input);

		expect(result).to.equal(
			expected,
			"Failed to handle mixed strings with multiple variable types"
		);
		expect(toolManager.resolveTemplatePathsCalls.length).to.equal(
			2,
			"Expected 2 calls to resolveTemplatePaths"
		);
		expect(toolManager.resolveTemplatePathsCalls).to.include(
			"mock-tool-4",
			"Expected call with mock-tool-4"
		);
		expect(toolManager.resolveTemplatePathsCalls).to.include(
			"mock-tool-3",
			"Expected call with mock-tool-3"
		);
	});
});
