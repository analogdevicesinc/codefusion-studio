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

import util from "node:util";
import { execFile, ExecFileOptions } from "node:child_process";
import path from "node:path";

export class ConanRunner {
	// Environment used to configure conan, including:
	//  - CONAN_HOME properly
	//  - PATH includes conan executable location
	private readonly env: Record<string, string>;

	constructor(conanHome: string, cfsInstallDir?: string) {
		const conanExeFolder =
			process.platform === "win32" ? "Scripts" : "bin";
		const pythonScripts = cfsInstallDir
			? path.join(cfsInstallDir, "Tools", "python", conanExeFolder) +
				path.delimiter
			: ""; //delimiter added to simplify conditionally prepending to PATH below

		this.env = {
			...process.env,
			CONAN_HOME: conanHome,
			PATH: `${pythonScripts}${process.env.PATH ?? ""}`
		};
	}

	/**
	 * Executes a conan command with the given arguments.
	 *
	 * @param args - An array of strings representing the arguments to pass to the conan command.
	 * @returns A promise that resolves with the standard output of the command if it succeeds,
	 *          or rejects with an error if the command fails.
	 */
	async execute(
		args: string[],
		options: Omit<ExecFileOptions, "shell"> = {}
	): Promise<string> {
		const asyncExecFile = util.promisify(execFile);
		try {
			return (
				await asyncExecFile("conan", args, {
					env: this.env,
					...options,
					shell: false // Make sure caller cannot re-enable shell interpretation
				})
			).stdout
				.trim()
				.replace(/\r/g, ""); // Replace all occurrences of \r with an empty string
		} catch (error) {
			const execError = error as Error & {
				stderr?: string;
			};
			if (execError.stderr !== undefined) {
				const stderr = execError.stderr.trim().replace(/\r/g, "");
				if (stderr.includes("ERROR: Authentication error")) {
					const remoteNameMatches = Array.from(
						stderr.matchAll(
							/Authentication error on remote '([^']+)'/g
						)
					);
					const remoteNames = remoteNameMatches.map(
						(match) => match[1]
					);
					throw new ConanError("AUTH_ERROR", execError.stderr, {
						remotes: remoteNames.length > 0 ? remoteNames : undefined,
						cause: error
					});
				}
				if (stderr.match(/ERROR: Profile '.*' already exists/)) {
					throw new ConanError("PROFILE_EXISTS", stderr, {
						cause: error
					});
				}
				if (stderr.match(/ERROR: No remotes defined/)) {
					throw new ConanError("NO_REMOTE", stderr, {
						cause: error
					});
				}
				// If stderr is available, use it as error message, otherwise use a generic message
				throw new ConanError("EXEC_ERROR", stderr, {
					cause: error
				});
			}
			throw new ConanError(
				"UNKNOWN_ERROR",
				"An unknown error occurred",
				{ cause: error }
			);
		}
	}
}

type ConanErrorCode =
	| "AUTH_ERROR"
	| "PROFILE_EXISTS"
	| "EXEC_ERROR"
	| "NO_REMOTE"
	| "UNKNOWN_ERROR";

export class ConanError<T extends ConanErrorCode> extends Error {
	code: T;
	cause?: unknown;
	remotes?: string[];

	constructor(
		code: T,
		message?: string,
		options?: { cause?: unknown; remotes?: string[] }
	) {
		super(message);
		this.name = "ConanError";
		this.code = code;
		if (options?.remotes) {
			this.remotes = options.remotes;
		}
		if (options?.cause) {
			this.cause = options.cause;
		}
	}
}
