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

import * as fs from "node:fs";
import * as path from "node:path";
import type { CfsToolManager } from "../managers/cfs-tool-manager.js";
import type { TaskDiscoveryStrategy } from "../types/task-discovery-strategy.js";
import {
	PLATFORM_IDS,
	ZEPHYR_ARM_TOOLCHAIN_TOOL_ID
} from "../providers/platform-constants.js";
import type { PlatformId } from "../providers/platform-constants.js";
import { readJsonFile } from "./file-utils.js";

/**
 * Resolves the Zephyr SDK root directory from a Zephyr toolchain tool path.
 * Handles two layouts:
 * - Package layout: cmake/ exists at tool path (tool path IS the SDK root)
 * - Installer layout: tool.json inside arm-zephyr-eabi subfolder (parent is SDK root)
 *
 * @param toolPath - Absolute path to the Zephyr toolchain as reported by the tool manager
 * @returns The resolved Zephyr SDK root directory
 */
export function resolveZephyrSdkRoot(toolPath: string): string {
	if (fs.existsSync(path.join(toolPath, "cmake"))) {
		return toolPath;
	}

	const parentPath = path.dirname(toolPath);

	return fs.existsSync(path.join(parentPath, "cmake"))
		? parentPath
		: toolPath;
}

/**
 * Resolves the tool id of the package that provides the Zephyr SDK host-tools
 * for a project's configured toolchain.
 *
 * The Zephyr SDK host-tools (cmake/Zephyr-sdkConfig.cmake) always ship in the
 * arm.zephyr.eabi.toolchain package: for ARM Zephyr projects that package is
 * the SDK, while for Xtensa projects the compiler (xt-clang) ships separately
 * but the host-tools still come from that package. Any Zephyr-related toolchain
 * id (containing "zephyr" or "xtensa", case-insensitive) therefore maps to that
 * package. Non-Zephyr toolchains return an empty string, indicating that no
 * host-tools package applies.
 *
 * @param toolchainId - The project's configured toolchain id
 * @returns The host-tools package tool id, or an empty string when the
 *   toolchain is not Zephyr-related
 */
export function resolveZephyrHostToolsId(
	toolchainId: string
): string {
	const normalizedId = toolchainId.trim().toLowerCase();
	return normalizedId.includes("xtensa") ||
		normalizedId.includes("zephyr")
		? ZEPHYR_ARM_TOOLCHAIN_TOOL_ID
		: "";
}

/**
 * Resolves the Zephyr SDK root used for `ZEPHYR_SDK_INSTALL_DIR`.
 *
 * @param sdkPath - CFS SDK install path, used to derive the installer's bundled
 *   Zephyr SDK (`<sdkPath>/Tools/zephyr-sdk`) as the default/fallback.
 * @param toolchainPathOverride - Per-project compiler path override
 *   (e.g. `cfs.project.toolchain.path`). Honoured only when it looks like a
 *   Zephyr SDK path (contains "zephyr", case-insensitive); otherwise ignored so
 *   it does not override the SDK with a compiler package path.
 * @param toolchainId - The project's configured toolchain id
 *   (e.g. `cfs.project.toolchain.id`), used to resolve the host-tools package
 *   (see {@link resolveZephyrHostToolsId}). When it is missing or not
 *   Zephyr-related the host-tools lookup is skipped and the installer SDK is
 *   used.
 * @param toolManager - Tool manager used to resolve the host-tools package
 *   path (its `getToolPath` returns an empty string when not found).
 * @returns The resolved Zephyr SDK root, or undefined when none is available.
 */
export async function getZephyrSdkPath(
	sdkPath: string | undefined,
	toolchainPathOverride: string | undefined,
	toolchainId: string | undefined,
	toolManager: CfsToolManager
): Promise<string | undefined> {
	// The override is a compiler path, not a Zephyr SDK path. Only honour it
	// when it looks like a Zephyr SDK path (contains "zephyr"); otherwise fall
	// through to the host-tools lookup so ZEPHYR_SDK_INSTALL_DIR is not set to
	// the compiler package (e.g. xt-clang on Xtensa projects).
	if (toolchainPathOverride?.toLowerCase().includes("zephyr")) {
		return toolchainPathOverride;
	}

	// Zephyr SDK bundled with the installer, used as the default/fallback.
	const installerZephyrSdkPath =
		sdkPath &&
		fs.existsSync(path.join(sdkPath, "Tools", "zephyr-sdk"))
			? path.join(sdkPath, "Tools", "zephyr-sdk")
			: undefined;

	// For Xtensa the configured toolchain is the compiler; the Zephyr SDK
	// host-tools live in a separate package, so resolve the SDK tool id from it.
	const zephyrHostToolsId = resolveZephyrHostToolsId(
		toolchainId ?? ""
	);
	const zephyrToolPath = zephyrHostToolsId
		? await toolManager.getToolPath(zephyrHostToolsId)
		: "";

	return zephyrToolPath
		? resolveZephyrSdkRoot(zephyrToolPath)
		: installerZephyrSdkPath;
}

/**
 * Detects the active toolchain/firmware platform for a workspace.
 *
 * Detection proceeds in order:
 * 1. Asks each registered strategy if it detects its platform in the workspace
 * 2. Legacy fallback: checks .vscode/settings.json for cfs.firmwarePlatform setting
 * 3. Returns 'none' if no platform detected
 *
 * @param workspacePath - Absolute path to the workspace folder
 * @param strategies - Array of TaskDiscoveryStrategy implementations to check
 * @returns Detected platform ID: 'msdk' | 'zephyr' | 'none'
 */
export function detectToolchain(
	workspacePath: string,
	strategies: TaskDiscoveryStrategy[]
): PlatformId {
	// Ask each registered strategy if it detects its platform
	for (const strategy of strategies) {
		// Check if strategy has detectsWorkspace method (platform-specific strategies)
		if (
			"detectsWorkspace" in strategy &&
			typeof strategy.detectsWorkspace === "function"
		) {
			if (strategy.detectsWorkspace(workspacePath)) {
				return strategy.id as PlatformId;
			}
		}
	}

	// Legacy fallback - check .vscode/settings.json
	// This handles cases where workspace hasn't been migrated yet
	// or explicit platform selection is stored in settings
	const settingsPath = path.join(
		workspacePath,
		".vscode",
		"settings.json"
	);

	if (fs.existsSync(settingsPath)) {
		try {
			const settings = readJsonFile(settingsPath);

			const firmwarePlatform = (
				settings["cfs.firmwarePlatform"] as string | undefined
			)?.toLowerCase();

			if (firmwarePlatform === PLATFORM_IDS.ZEPHYR)
				return PLATFORM_IDS.ZEPHYR;

			if (firmwarePlatform === PLATFORM_IDS.MSDK)
				return PLATFORM_IDS.MSDK;
		} catch (error) {
			// Settings file not found or invalid JSON - continue
		}
	}

	return PLATFORM_IDS.NONE;
}
