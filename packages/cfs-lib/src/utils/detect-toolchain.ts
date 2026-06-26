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
import type { TaskDiscoveryStrategy } from "../types/task-discovery-strategy.js";
import { PLATFORM_IDS } from "../providers/platform-constants.js";
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
