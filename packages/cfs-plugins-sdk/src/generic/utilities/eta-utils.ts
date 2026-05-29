/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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

import type { CfsFileMap } from "cfs-types";
import { Eta, type EtaError } from "eta";
import { promises as fsp } from "fs";
import fg from "fast-glob";
import path from "path";
import {
	evalNestedTemplateLiterals,
	isDir
} from "./cfs-utilities.js";

// ETA partials
import copyrightHeader from "./eta/copyright-header.js";
import copyrightHeaderHash from "./eta/copyright-header-hash.js";
import normalizeSoc from "./eta/normalize-soc.js";
import configureEnvVariables from "./eta/configure-env-variables.js";
import coreDump from "./eta/core-dump.js";
// @TODO: The following partials are temporarily included here but they should be provided
// by their corresponding plugin or by firmware specific reusable library.
// Probably board names can be parsed from an expression defined in the cfsplugin file.
import msdkBoardName from "./eta/msdk-board-name.js";
import msdkComponents from "./eta/msdk-components.js";
import zephyrBoardName from "./eta/zephyr-board-name.js";
import sharcfxBoardName from "./eta/sharcfx-board-name.js";
import sharcfxUtils from "./eta/sharcfx-utils.js";
import ozoneProject from "./eta/ozone-debug.js";

// Utilities provided globally to ETA templates through function header.
import * as codegenUtils from "./eta/codegen-utils.js";

/**
 * Renders eta templates defined in the .cfsplugin info file and writes the contents to the specified output directory.
 * @param templates - The template files to copy.
 * @param data - The data needed for rendering eta templates.
 * @param pluginPath - The path to the current plugin directory.
 * @returns A promise that resolves to an array of created file paths.
 */
export async function renderTemplates(
	templates: CfsFileMap[],
	data: Record<string, unknown>,
	templatesSearchPath: string
): Promise<string[]> {
	const filesCreated: string[] = [];
	const stringifiedUtils = stringifyUtilityModules(codegenUtils);

	const eta = new Eta({
		views: templatesSearchPath,
		// By default ETA uses XMLEscape, which maps special HTML characters
		// (&, <, >, ", ') to their XML-escaped equivalents. We do not want
		// that for code generation.
		escapeFunction: String,
		// To keep compatibility with the current template implementation, the utilities that
		// were being loaded using `eval` inside the template are now provided globally through
		// the function header.
		functionHeader: stringifiedUtils
	});
	// Load common templates
	eta.loadTemplate("@copyrightHeader", copyrightHeader);
	eta.loadTemplate("@copyrightHeaderHash", copyrightHeaderHash);
	eta.loadTemplate("@normalizeSoc", normalizeSoc);
	eta.loadTemplate("@codegenUtils", stringifiedUtils);
	eta.loadTemplate("@msdkBoardName", msdkBoardName);
	eta.loadTemplate("@msdkComponents", msdkComponents);
	eta.loadTemplate("@zephyrBoardName", zephyrBoardName);
	eta.loadTemplate("@configureEnvVariables", configureEnvVariables);
	eta.loadTemplate("@coreDump", coreDump);
	eta.loadTemplate("@sharcfxBoardName", sharcfxBoardName);
	eta.loadTemplate("@sharcfxUtils", sharcfxUtils);
	eta.loadTemplate("@ozoneProject", ozoneProject);

	for (const template of templates) {
		try {
			const condition = template.condition
				? evalNestedTemplateLiterals(template.condition, data) ===
					"true"
				: true;

			if (!condition)
				// When condition is false, we skip the template.
				continue;

			const srcPath = template.src.replace(/\\/g, "/");

			const templatePath = path
				.join(templatesSearchPath, srcPath)
				.replace(/\\/g, "/");

			const files = await fg.glob(templatePath);

			for (const file of files) {
				const fileName = path.basename(file.replace(".eta", ""));
				let dstPath = template.dst.replace(/\\/g, "/");

				// Template source path should be relative to the template search path received as an argument.
				const relativePath = path
					.relative(templatesSearchPath, file)
					.replace(/\\/g, "/");

				const rendered = eta.render(relativePath, {
					...data,
					timestamp: new Date().toISOString(),
					relativeFilePath: dstPath
				});

				if (isDir(dstPath)) {
					await fsp.mkdir(dstPath, { recursive: true });
					dstPath = path.join(dstPath, fileName);
				} else {
					await fsp.mkdir(path.dirname(dstPath), { recursive: true });
				}

				await fsp.writeFile(dstPath, rendered);
				filesCreated.push(dstPath);
			}
		} catch (error) {
			throw new Error(
				`Failed to render template from ${template.src} to ${
					template.dst
				}: ${(error as EtaError).message || String(error)}`
			);
		}
	}

	return filesCreated;
}

/**
 * Converts a module object containing utility functions into a single string representation.
 *
 * Takes an object where each property is a function and returns a concatenated string
 * containing all function definitions separated by newlines, with each function ending
 * with a semicolon.
 *
 * @param module - An object containing functions as values
 * @returns A string containing all functions from the module concatenated together
 *
 * @example
 * ```typescript
 * const module.exports = {
 *   add: (a: number, b: number) => a + b,
 *   subtract: (a: number, b: number) => a - b
 * };
 *
 * const result = stringifyUtilityModules(utils);
 * // Returns: "(a, b) => a + b;\n(a, b) => a - b;"
 * ```
 */
function stringifyUtilityModules(
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type, @typescript-eslint/ban-types
	module: Record<string, Function>
) {
	const entries = Object.values(module);

	const stringifiedFunctions = entries
		.map((fn) => `${fn.toString()};`)
		.join("\n");

	return stringifiedFunctions;
}
