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

import { createHash } from "node:crypto";
import { createWriteStream, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { URL } from "node:url";

import { CodeGenJsonMsg } from "./index.js";
import { checkIfFileExists } from "../utils/file-utils.js";
import type { AIModel, AIModelBackend, SocControl } from "cfs-types";

export function sanitizeToCIdentifier(s: string): string {
	s = s.trim();
	s = s.replace(/[^a-zA-Z0-9_]/g, "_");

	if (!/^[a-zA-Z_]/.test(s)) {
		s = "_" + s;
	}

	return s;
}

export function parseAICodegenEvents(
	output: string
): CodeGenJsonMsg[] {
	const parsed = output
		.split("\n")
		.filter((line) => line.length > 0)
		.flatMap((line) => {
			try {
				const parsed = JSON.parse(line) as CodeGenJsonMsg;
				return [parsed];
			} catch (e) {
				return [];
			}
		});

	return parsed;
}

export function getCFSCachePath(cfsVersion: string): string {
	return path.resolve(
		os.homedir(),
		"cfs",
		cfsVersion,
		".cache",
		"ai"
	);
}

function convertToHttpUrl(input: string): URL | undefined {
	try {
		const url = new URL(input);
		return url.protocol === "http:" || url.protocol === "https:"
			? url
			: undefined;
	} catch {
		return undefined;
	}
}

export async function resolveSource(
	cfsVersion: string,
	input: string,
	ignoreCache: boolean,
	cwd: string = process.cwd()
): Promise<string> {
	const url: URL | undefined = convertToHttpUrl(input);

	if (!url) {
		// If the input is not a valid URL, resolve path relative to cwd (if provided)
		let filePath = input;

		if (cwd && !path.isAbsolute(input)) {
			filePath = path.resolve(cwd, input);
		}

		if (checkIfFileExists(filePath)) {
			return filePath;
		}

		throw new Error(`FILE NOT FOUND: ${filePath}`);
	}

	const cacheDir = getCFSCachePath(cfsVersion);
	const dir = createHash("sha256").update(input).digest("hex");
	const filename = path.basename(url.pathname);
	const fileDestination = path.join(cacheDir, dir, filename);

	if (ignoreCache || !checkIfFileExists(fileDestination)) {
		return downloadToCache(input, fileDestination);
	}

	return fileDestination;
}

async function downloadToCache(
	url: string,
	destination: string
): Promise<string> {
	const dir = path.dirname(destination);
	await fs.mkdir(dir, { recursive: true });

	const res = await fetch(url);

	if (!res.ok) {
		switch (res.status) {
			case 403: {
				throw new Error(`Failed to download, access denied: ${url}`);
			}

			case 404: {
				throw new Error(`Failed to download, not found: ${url}`);
			}

			default: {
				throw new Error(`Failed to download, server error: ${url}`);
			}
		}
	}

	if (!res.body) {
		throw new Error(
			`Failed to download, empty response body: ${url}`
		);
	}

	await pipeline(res.body, createWriteStream(destination));
	return destination;
}

export function enforceMaxActiveModels(
	models: AIModel[],
	changedModel: AIModel,
	maxModels: number,
	jsonOutput = false
): AIModel[] {
	const disabledModels: string[] = [];

	const relevantModels = models.filter(
		(m) =>
			m.Target.Core.toUpperCase() ===
				changedModel.Target.Core.toUpperCase() &&
			(m.Backend?.Name ?? "").toUpperCase() ===
				(changedModel.Backend?.Name ?? "").toUpperCase()
	);

	const enabledModels = relevantModels.filter((m) => m.Enabled);

	if (enabledModels.length > maxModels) {
		const modelsToDisable = enabledModels.length - maxModels;
		enabledModels
			.filter((m) => m.Name !== changedModel.Name)
			.slice(0, modelsToDisable)
			.forEach((m) => {
				disabledModels.push(m.Name);
				m.Enabled = false;
			});
	}

	if (!jsonOutput) {
		disabledModels.length > 0 &&
			console.warn(
				`Maximum number of models exceeded. The following model ${disabledModels.length > 1 ? "s have" : "has"} been disabled: ${disabledModels.map((name) => name).join(", ")}`
			);
	}

	return models;
}

export function getValidExtensions(
	extensions: string[],
	validProperties: SocControl[],
	includeDefaults = true
): AIModelBackend["Extensions"] {
	const validExtensions: AIModelBackend["Extensions"] = {};
	const errors: string[] = [];

	const propertyMap = new Map(
		validProperties.map((property) => {
			if (property.Default !== undefined && includeDefaults) {
				// pre-populate with "Default" from backend
				validExtensions[property.Id] = property.Default;
			}
			return [property.Id.toLowerCase(), property];
		})
	);

	for (const ext of extensions) {
		let [key, value] = ext.split("=");

		key = key.toLowerCase();

		if (!value) {
			errors.push(
				`Invalid extension format: ${ext}. Expected format is key=value.`
			);
			continue;
		}

		const property = propertyMap.get(key);

		if (!property) {
			errors.push(
				`Invalid extension "${key}", valid options: ${validProperties.map((property) => property.Id).join(", ")}`
			);
			continue;
		}

		switch (property.Type) {
			case "boolean":
				value = String(value).toLowerCase();
				if (value !== "true" && value !== "false") {
					errors.push(
						`Invalid value for '${key}', expected one of: true, false`
					);
				} else {
					validExtensions[property.Id] = value === "true";
				}
				break;
			case "enum":
				const validValue = property.EnumValues?.find(
					(e) => e.Value === value
				);

				if (!validValue) {
					errors.push(
						`Invalid value for '${key}', expected one of: ${property.EnumValues ? property.EnumValues.map((p) => p.Value).join(", ") : "[]"} ${property.Default !== undefined ? `(default: ${String(property.Default)})` : ""}`
					);
					break;
				}

				validExtensions[property.Id] = value;
				break;
			// Trust user input & file path checks
			case "string":
			case "File":
				validExtensions[property.Id] = value;
				break;
			default:
				break;
		}
	}

	if (errors.length > 0) {
		throw new Error(errors.join("\n"));
	}

	return validExtensions;
}
