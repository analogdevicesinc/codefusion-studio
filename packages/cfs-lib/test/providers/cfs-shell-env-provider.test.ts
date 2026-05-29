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
import * as path from "node:path";

import { CfsShellEnvProvider } from "../../src/providers/cfs-shell-env-provider.js";
import type { ToolInfo } from "../../src/managers/cfs-tool-manager.js";

describe("CfsShellEnvProvider", function () {
	let provider: CfsShellEnvProvider;

	beforeEach(function () {
		provider = new CfsShellEnvProvider();
	});

	describe("getToolEnvVars", function () {
		it("should compose env vars from tools with isPath=true", function () {
			const tools: ToolInfo[] = [
				{
					name: "arm-gcc",
					description: "ARM GCC Toolchain",
					id: "arm-gcc",
					vendor: "ARM",
					version: "1.0.0",
					schemaVersion: "1.0.0",
					rootPath: "/opt/tools/arm-gcc",
					resolvedPaths: [],
					binaryPath: "/opt/tools/arm-gcc/bin",
					envVars: [
						{
							name: "ARM_GCC_HOME",
							value: "lib/gcc",
							isPath: true
						}
					]
				}
			];

			const result = provider.getToolEnvVars(tools);

			expect(result).to.have.property("ARM_GCC_HOME");
			expect(result.ARM_GCC_HOME).to.equal(
				path.join("/opt/tools/arm-gcc", "lib/gcc")
			);
		});

		it("should use raw value for non-path env vars", function () {
			const tools: ToolInfo[] = [
				{
					name: "cmake",
					description: "CMake Build System",
					id: "cmake",
					vendor: "Kitware",
					version: "3.28.0",
					schemaVersion: "1.0.0",
					rootPath: "/opt/tools/cmake",
					resolvedPaths: [],
					binaryPath: "/opt/tools/cmake/bin",
					envVars: [
						{
							name: "CMAKE_VERSION",
							value: "3.28.0",
							isPath: false
						}
					]
				}
			];

			const result = provider.getToolEnvVars(tools);

			expect(result).to.have.property("CMAKE_VERSION", "3.28.0");
		});

		it("should handle tools with no envVars", function () {
			const tools: ToolInfo[] = [
				{
					name: "ninja",
					description: "Ninja Build System",
					id: "ninja",
					vendor: "Ninja",
					version: "1.0.0",
					schemaVersion: "1.0.0",
					rootPath: "/opt/tools/ninja",
					resolvedPaths: [],
					binaryPath: "/opt/tools/ninja/bin"
				}
			];

			const result = provider.getToolEnvVars(tools);

			expect(result).to.deep.equal({});
		});

		it("should handle empty tools array", function () {
			const result = provider.getToolEnvVars([]);

			expect(result).to.deep.equal({});
		});
	});

	describe("getShellPath", function () {
		const normalizePathSeparators = (value: string): string =>
			value.replace(/\\/g, "/");

		it("should compose PATH from tool binary paths", function () {
			const tools: ToolInfo[] = [
				{
					name: "arm-gcc",
					description: "ARM GCC Toolchain",
					id: "arm-gcc",
					vendor: "ARM",
					version: "1.0.0",
					schemaVersion: "1.0.0",
					rootPath: "/opt/tools/arm-gcc",
					resolvedPaths: [],
					binaryPath: "/opt/tools/arm-gcc/bin"
				}
			];

			const result = provider.getShellPath(tools);
			const normalizedResult = normalizePathSeparators(result);

			expect(normalizedResult).to.include("/opt/tools/arm-gcc/bin");
		});

		it("should include JLink path when provided", function () {
			const result = provider.getShellPath([], {
				jlinkPath: "/opt/jlink"
			});

			expect(result).to.match(/^\/opt\/jlink/);
		});

		it("should include SDK path", function () {
			const result = provider.getShellPath([], {
				sdkPath: "/opt/cfs-sdk"
			});

			expect(result).to.include("/opt/cfs-sdk");
		});

		it("should append system PATH", function () {
			const systemPath = process.env.PATH ?? "";
			const result = provider.getShellPath([]);

			expect(result).to.include(systemPath);
		});

		it("should use additionalPaths when defined", function () {
			const tools: ToolInfo[] = [
				{
					name: "openocd",
					description: "OpenOCD Debugger",
					id: "openocd",
					vendor: "OpenOCD",
					version: "1.0.0",
					schemaVersion: "1.0.0",
					rootPath: "/opt/tools/openocd",
					resolvedPaths: [],
					binaryPath: "/opt/tools/openocd/bin",
					paths: ["bin", "scripts"]
				}
			];

			const result = provider.getShellPath(tools);
			const normalizedResult = normalizePathSeparators(result);

			expect(normalizedResult).to.include("/opt/tools/openocd/bin");
			expect(normalizedResult).to.include(
				"/opt/tools/openocd/scripts"
			);
			// When additionalPaths is present, binaryPath alone is NOT added
			const segments = result
				.split(path.delimiter)
				.map(normalizePathSeparators);
			const openocdBinCount = segments.filter(
				(s) => s === "/opt/tools/openocd/bin"
			).length;

			expect(openocdBinCount).to.equal(1);
		});
	});

	describe("getBaseShellEnvironment", function () {
		it("should include tool env vars in output", function () {
			const tools: ToolInfo[] = [
				{
					name: "arm-gcc",
					description: "ARM GCC Toolchain",
					id: "arm-gcc",
					vendor: "ARM",
					version: "1.0.0",
					schemaVersion: "1.0.0",
					rootPath: "/opt/tools/arm-gcc",
					resolvedPaths: [],
					binaryPath: "/opt/tools/arm-gcc/bin",
					envVars: [
						{
							name: "ARM_HOME",
							value: ".",
							isPath: true
						}
					]
				}
			];

			const env = provider.getBaseShellEnvironment(tools);

			expect(env).to.have.property("ARM_HOME");
		});

		it("should include ZEPHYR_BASE when provided", function () {
			const env = provider.getBaseShellEnvironment([], {
				zephyrBase: "/opt/zephyr/zephyr"
			});

			expect(env).to.have.property(
				"ZEPHYR_BASE",
				"/opt/zephyr/zephyr"
			);
		});

		it("should include CMAKE_PREFIX_PATH with existing env appended", function () {
			const originalCmakePrefixPath = process.env.CMAKE_PREFIX_PATH;

			try {
				process.env.CMAKE_PREFIX_PATH = "/existing/cmake/path";

				const env = provider.getBaseShellEnvironment([], {
					cmakePrefixPath: "/new/cmake/path"
				});

				expect(env).to.have.property("CMAKE_PREFIX_PATH");
				expect(env.CMAKE_PREFIX_PATH).to.include("/new/cmake/path");
				expect(env.CMAKE_PREFIX_PATH).to.include(
					"/existing/cmake/path"
				);
			} finally {
				if (originalCmakePrefixPath === undefined) {
					delete process.env.CMAKE_PREFIX_PATH;
				} else {
					process.env.CMAKE_PREFIX_PATH = originalCmakePrefixPath;
				}
			}
		});

		it("should include ZEPHYR_SDK_INSTALL_DIR when sdkPath provided", function () {
			const env = provider.getBaseShellEnvironment([], {
				sdkPath: "/opt/cfs-sdk"
			});

			expect(env).to.have.property(
				"ZEPHYR_SDK_INSTALL_DIR",
				path.join("/opt/cfs-sdk", "Tools/zephyr-sdk")
			);
		});

		it("should include GIT_EXEC_PATH when provided", function () {
			const env = provider.getBaseShellEnvironment([], {
				gitExecPath: "/usr/lib/git-core"
			});

			expect(env).to.have.property(
				"GIT_EXEC_PATH",
				"/usr/lib/git-core"
			);
		});

		it("should include CFSAI_PATH with normalized slashes", function () {
			const env = provider.getBaseShellEnvironment([], {
				cfsaiPath: "C:\\Users\\dev\\cfsai"
			});

			expect(env).to.have.property(
				"CFSAI_PATH",
				"C:/Users/dev/cfsai"
			);
		});

		it("should merge additionalEnv", function () {
			const env = provider.getBaseShellEnvironment([], {
				additionalEnv: {
					CUSTOM_VAR: "custom_value"
				}
			});

			expect(env).to.have.property("CUSTOM_VAR", "custom_value");
		});

		it("should prepend additionalEnv PATH without discarding composed PATH", function () {
			const originalPath = process.env.PATH;

			try {
				process.env.PATH = "/system/path";

				const tools: ToolInfo[] = [
					{
						name: "arm-gcc",
						description: "ARM GCC Toolchain",
						id: "arm-gcc",
						vendor: "ARM",
						version: "1.0.0",
						schemaVersion: "1.0.0",
						rootPath: "/opt/tools/arm-gcc",
						resolvedPaths: [],
						binaryPath: "/opt/tools/arm-gcc/bin"
					}
				];

				const env = provider.getBaseShellEnvironment(tools, {
					additionalEnv: {
						PATH: "/caller/path"
					}
				});

				const segments = env.PATH.split(path.delimiter);
				expect(segments[0]).to.equal("/caller/path");
				expect(env.PATH).to.include("/opt/tools/arm-gcc/bin");
				expect(env.PATH).to.include("/system/path");
			} finally {
				if (originalPath === undefined) {
					delete process.env.PATH;
				} else {
					process.env.PATH = originalPath;
				}
			}
		});

		it("should treat Path key as PATH when merging additionalEnv", function () {
			const env = provider.getBaseShellEnvironment([], {
				additionalEnv: {
					Path: "/caller/path"
				}
			});

			expect(env.PATH.split(path.delimiter)[0]).to.equal(
				"/caller/path"
			);
			expect(env).to.not.have.property("Path");
		});

		it("should always set PYTHON_CMD to none", function () {
			const env = provider.getBaseShellEnvironment([]);

			expect(env).to.have.property("PYTHON_CMD", "none");
		});
	});
});
