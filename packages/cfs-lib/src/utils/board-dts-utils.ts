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

import path from "node:path";
import { DtParser } from "../parsers/dt-parser/DtParser.js";

/**
 * Resolves the path to the board's `.dts` file from the
 * Zephyr base directory and the Zephyr board name.
 *
 * @param zephyrBase - The Zephyr base directory
 *   (e.g. `C:/analog/cfs/2.3.0/SDK/zephyr/zephyr`)
 * @param zephyrBoardName - The board name from
 *   PlatformConfig (e.g. `max32655evkit/max32655/m4`)
 * @returns The resolved path to the board `.dts` file
 */
export function resolveBoardDtsPath(
	zephyrBase: string,
	zephyrBoardName: string
): string {
	const boardDir = zephyrBoardName.split("/")[0];
	const dtsName = zephyrBoardName.replace(/\//g, "_") + ".dts";
	return path.join(zephyrBase, "boards", "adi", boardDir, dtsName);
}

/**
 * Builds the standard include directories needed by
 * the DtParser when parsing Zephyr board DTS files.
 */
function buildIncludeDirs(zephyrBase: string): string[] {
	return [
		path.join(zephyrBase, "dts"),
		path.join(zephyrBase, "dts", "arm"),
		path.join(zephyrBase, "dts", "common"),
		path.join(zephyrBase, "dts", "vendor")
	];
}

/**
 * Parses a board's `.dts` file with `DtParser` (which
 * resolves all `#include` directives) and returns the
 * raw parsed JSON tree.
 *
 * @param zephyrBase - The Zephyr base directory
 * @param zephyrBoardName - The board name from
 *   PlatformConfig (e.g. `max32655evkit/max32655/m4`)
 * @returns The parsed devicetree as a plain object,
 *   or `undefined` if parsing fails
 */
export async function parseBoardDts(
	zephyrBase: string,
	zephyrBoardName: string
): Promise<Record<string, unknown> | undefined> {
	const dtsPath = resolveBoardDtsPath(zephyrBase, zephyrBoardName);

	try {
		const parser = new DtParser({
			includeDirs: buildIncludeDirs(zephyrBase)
		});

		return (await parser.jsonFromFile(dtsPath)) as Record<
			string,
			unknown
		>;
	} catch {
		return undefined;
	}
}
