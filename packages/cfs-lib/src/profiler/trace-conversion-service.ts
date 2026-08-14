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

import * as path from "node:path";
import { spawn } from "node:child_process";
import { platform } from "node:process";
import { checkIfFileExists } from "../utils/file-utils.js";

/**
 * Options for trace conversion.
 */
export interface TraceConversionOptions {
	/** Working directory for the conversion command. */
	cwd?: string;
	/** Path to the Zephyr build directory */
	buildDir?: string;
	/** Path to the Zephyr ELF file for symbol resolution */
	zephyrElfPath?: string;
	/** Paths to AI model files. Currently only supports TFLM models */
	aiModelPaths?: string[];
	/**
	 * Explicit output file path. When omitted, the output path is derived
	 * from the input trace path by replacing its extension with `.tef`.
	 */
	outputPath?: string;
	/**
	 * Callback invoked with chunks of the conversion command's standard
	 * output as they are produced. Supplying this enables live streaming
	 * of output (e.g. for a verbose CLI mode). Standard output is always
	 * drained but never buffered, so high-volume runs cannot exhaust
	 * memory or abort the conversion.
	 */
	onStdout?: (chunk: string) => void;
	/**
	 * Callback invoked with chunks of the conversion command's standard
	 * error as they are produced. Standard error is buffered regardless
	 * for inclusion on the rejected error's `stderr` property. See
	 * {@link onStdout}.
	 */
	onStderr?: (chunk: string) => void;
}

/**
 * Converts a trace file from CTF to TEF format by running `west zpl-prepare-trace`.
 *
 * @param inputTracePath - Path to the trace file to convert
 * @param environment - Shell environment containing tool paths and variables
 * @param options - Optional conversion options (ELF path, TFLM model
 * paths, and `onStdout`/`onStderr` hooks for live output streaming)
 * @returns Path to the converted trace file (.tef)
 * @example
 * ```typescript
 * await convertTrace("my-trace.ctf", environment);
 * // Produces: my-trace.tef
 * ```
 */
export async function convertTrace(
	inputTracePath: string,
	environment: Record<string, string>,
	options?: TraceConversionOptions
): Promise<string> {
	const parsedPath = path.parse(inputTracePath);
	const outputFile =
		options?.outputPath ??
		path.join(parsedPath.dir, `${parsedPath.name}.tef`);

	const westArgs = [
		"zpl-prepare-trace",
		inputTracePath,
		"-o",
		outputFile
	];
	if (options?.buildDir) {
		westArgs.push("--build-dir", options.buildDir);
	}
	if (options?.zephyrElfPath) {
		westArgs.push("--zephyr-elf-path", options.zephyrElfPath);
	}
	if (options?.aiModelPaths) {
		for (const modelPath of options.aiModelPaths) {
			westArgs.push("--tflm-model-paths", modelPath);
		}
	}

	const cppFiltPath = environment.ZEPHYR_SDK_INSTALL_DIR
		? path.join(
				environment.ZEPHYR_SDK_INSTALL_DIR,
				"arm-zephyr-eabi",
				"bin",
				platform === "win32"
					? "arm-zephyr-eabi-c++filt.exe"
					: "arm-zephyr-eabi-c++filt"
			)
		: undefined;

	const traceConversionEnv = { ...process.env, ...environment };
	if (checkIfFileExists(cppFiltPath)) {
		traceConversionEnv.ZPL_DEMANGLE_CMD = cppFiltPath;
	}

	const { onStdout, onStderr } = options ?? {};

	return await new Promise<string>((resolve, reject) => {
		const child = spawn("west", westArgs, {
			cwd: options?.cwd,
			env: traceConversionEnv,
			shell: false
		});

		// Standard output is drained to avoid blocking the child, but
		// never buffered, so high-volume runs cannot exhaust memory or
		// hit an output limit that would abort a valid conversion.
		child.stdout.on("data", (chunk: Buffer) => {
			onStdout?.(chunk.toString());
		});

		// Standard error is buffered so it can be surfaced on the
		// rejected error for diagnostics.
		const stderrChunks: string[] = [];
		child.stderr.on("data", (chunk: Buffer) => {
			const text = chunk.toString();
			stderrChunks.push(text);
			onStderr?.(text);
		});

		child.on("error", (error) => {
			reject(Object.assign(error, { stderr: stderrChunks.join("") }));
		});

		child.on("close", (code) => {
			if (code === 0) {
				resolve(outputFile);
			} else {
				reject(
					Object.assign(
						new Error(
							`west zpl-prepare-trace exited with code ${String(code)}`
						),
						{ stderr: stderrChunks.join(""), code }
					)
				);
			}
		});
	});
}
