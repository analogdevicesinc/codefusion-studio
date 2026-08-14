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

import { checkIfFileExists } from "../utils/file-utils.js";
import type { AIModelBackend, SocControl } from "cfs-types";

export const C_CPP_RESERVED_KEYWORDS = new Set<string>([
	"alignas",
	"alignof",
	"and",
	"and_eq",
	"asm",
	"auto",
	"bitand",
	"bitor",
	"bool",
	"break",
	"case",
	"catch",
	"char",
	"char8_t",
	"char16_t",
	"char32_t",
	"class",
	"compl",
	"concept",
	"const",
	"consteval",
	"constexpr",
	"constinit",
	"const_cast",
	"continue",
	"co_await",
	"co_return",
	"co_yield",
	"decltype",
	"default",
	"delete",
	"do",
	"double",
	"dynamic_cast",
	"else",
	"enum",
	"explicit",
	"export",
	"extern",
	"false",
	"float",
	"for",
	"friend",
	"goto",
	"if",
	"inline",
	"int",
	"long",
	"mutable",
	"namespace",
	"new",
	"noexcept",
	"not",
	"not_eq",
	"nullptr",
	"operator",
	"or",
	"or_eq",
	"private",
	"protected",
	"public",
	"register",
	"reinterpret_cast",
	"requires",
	"return",
	"short",
	"signed",
	"sizeof",
	"static",
	"static_assert",
	"static_cast",
	"struct",
	"switch",
	"template",
	"this",
	"thread_local",
	"throw",
	"true",
	"try",
	"typedef",
	"typeid",
	"typename",
	"union",
	"unsigned",
	"using",
	"virtual",
	"void",
	"volatile",
	"wchar_t",
	"while",
	"xor",
	"xor_eq",
	"_Alignas",
	"_Alignof",
	"_Atomic",
	"_BitInt",
	"_Bool",
	"_Complex",
	"_Decimal32",
	"_Decimal64",
	"_Decimal128",
	"_Generic",
	"_Imaginary",
	"_Noreturn",
	"_Static_assert",
	"_Thread_local"
]);

export function sanitizeToCIdentifier(s: string): string {
	s = s.trim();
	s = s.replace(/[^a-zA-Z0-9_]/g, "_");

	if (!/^[a-zA-Z_]/.test(s)) {
		s = "_" + s;
	}

	if (C_CPP_RESERVED_KEYWORDS.has(s)) {
		s = "_" + s;
	}

	return s;
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

export function getValidExtensions(
	extensions: string[],
	validProperties: SocControl[],
	includeDefaults = true
): NonNullable<AIModelBackend["Extensions"]> {
	const validExtensions: NonNullable<AIModelBackend["Extensions"]> =
		{};
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
			case "integer":
				const trimmed = String(value).trim();
				if (trimmed.length === 0) {
					errors.push(
						`Invalid value for '${key}', expected an integer.`
					);
					break;
				}
				const numValue = Number(trimmed);

				if (isNaN(numValue) || !Number.isInteger(numValue)) {
					errors.push(
						`Invalid value for '${key}', expected an integer.`
					);
					break;
				}

				if (
					(property.MinimumValue !== undefined &&
						numValue < Number(property.MinimumValue)) ||
					(property.MaximumValue !== undefined &&
						numValue > Number(property.MaximumValue))
				) {
					errors.push(
						`Invalid value for '${key}', expected a value between ${
							property.MinimumValue !== undefined
								? String(property.MinimumValue)
								: "-∞"
						} and ${
							property.MaximumValue !== undefined
								? String(property.MaximumValue)
								: "∞"
						}.`
					);
					break;
				}

				validExtensions[property.Id] = numValue;
				break;
			// Trust user input & file path checks
			case "string":
			case "File":
				validExtensions[property.Id] = value;
				break;
			case "array":
				const array = value
					.split(",")
					.map((v) => v.trim())
					.filter((v) => v.length > 0);

				if (array.length === 0) {
					errors.push(
						`Invalid value for '${key}', expected format: key=value,value,...`
					);
					break;
				}

				validExtensions[property.Id] = array.toString();
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

export function getGeneratedFileComment({
	soc,
	Package
}: {
	soc: string;
	Package: string;
}): string {
	const date = new Date();
	const target =
		Package.length > 0
			? `${soc.toUpperCase()}-${Package.toUpperCase()}`
			: soc.toUpperCase();
	return `/**
 * Generated for ${target}.
 *
 * This file was generated using Analog Devices CodeFusion Studio.
 * https://github.com/analogdevicesinc/codefusion-studio
 *
 * Generated at: ${date.toISOString()}
 * SPDX-License-Identifier: Apache-2.0
 * Copyright (c) ${String(date.getFullYear())} Analog Devices, Inc.
 */\n
`;
}
