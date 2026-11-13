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

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import * as path from "node:path";

import type {
	CfsPackageManagerProvider,
	CfsPackageReference
} from "../api/api.js";
import { ConanPkgManager } from "../conan-backend/conan-backend.js";

/** Parses `cfspkg://<name>/<version>[#<recipe-revision>]` into a package reference. */
function parseReference(url: string): CfsPackageReference {
	const prefix = "cfspkg://";
	if (!url.startsWith(prefix)) {
		throw new Error(
			`Invalid cfspkg URL "${url}": expected "${prefix}"`
		);
	}
	const rest = url.slice(prefix.length);
	const slash = rest.indexOf("/");
	if (slash <= 0 || slash >= rest.length - 1) {
		throw new Error(
			`Invalid cfspkg URL "${url}": expected <name>/<version>`
		);
	}
	// version keeps any `#<recipe-revision>` suffix, which conan understands.
	return {
		name: rest.slice(0, slash),
		version: rest.slice(slash + 1)
	};
}

/**
 * Checks that a path is a git repository `git-upload-pack` can serve: a working
 * tree (has `.git`) or a bare repository (has `HEAD` and `objects`).
 */
function isGitRepository(repoPath: string): boolean {
	if (existsSync(path.join(repoPath, ".git"))) return true;
	return (
		existsSync(path.join(repoPath, "HEAD")) &&
		existsSync(path.join(repoPath, "objects"))
	);
}

/**
 * Resolves a `cfspkg://` URL to the on-disk path of the installed package.
 *
 * The package must already be installed with the CFS package manager; this
 * transport only locates it. The returned path is expected to be a git
 * repository that git clones/fetches from.
 */
async function resolveRepoPath(
	url: string,
	manager: CfsPackageManagerProvider
): Promise<string> {
	const ref = parseReference(url);
	await manager.init();

	// The package manager's getPath() method ignores the version.
	// Use getInstalledPackageInfo() to verify the installed version.
	const requestedVersion = ref.version.split("#")[0];
	const installed = await manager.getInstalledPackageInfo();
	const pkg = installed.find((entry) => entry.name === ref.name);

	if (pkg === undefined || pkg.version !== requestedVersion) {
		const problem =
			pkg === undefined
				? `${ref.name}/${ref.version} is not installed`
				: `${ref.name}/${ref.version} is not installed; the installed version is ${pkg.version}`;
		throw new Error(
			`${problem}. Install the requested version with the CFS package manager — ` +
				`\`cfsutil pkg install ${ref.name}/${ref.version}\` or the Package Manager ` +
				`view in the CFS IDE, and then retry the operation.`
		);
	}

	const repoPath = pkg.path;

	if (!isGitRepository(repoPath)) {
		throw new Error(
			`${ref.name}/${ref.version} resolved to "${repoPath}", which is not a ` +
				`git repository. The cfspkg transport requires packages distributed ` +
				`as git repositories.`
		);
	}

	return repoPath;
}

/**
 * Runs the `cfspkg` git remote-helper protocol on the given streams.
 *
 * Implements the `connect` capability: when git connects to `git-upload-pack`,
 * the URL is resolved to a local git repository (installing on demand) and
 * served by `git-upload-pack`, whose stdio is bridged to git. git then performs
 * the fetch/checkout natively.
 */
async function serve(
	url: string,
	pkgMgr: CfsPackageManagerProvider,
	stdin: NodeJS.ReadableStream,
	stdout: NodeJS.WritableStream
): Promise<void> {
	// Buffer stdin so command lines can be read without consuming the raw git
	// protocol bytes that follow `connect`.
	let buffer = Buffer.alloc(0);
	let ended = false;
	let notify: (() => void) | undefined;
	const onData = (chunk: Buffer) => {
		buffer = Buffer.concat([buffer, chunk]);
		notify?.();
	};
	const onEnd = () => {
		ended = true;
		notify?.();
	};
	stdin.on("data", onData);
	stdin.on("end", onEnd);

	const nextLine = async (): Promise<string | undefined> => {
		for (;;) {
			const newline = buffer.indexOf(0x0a);
			if (newline !== -1) {
				const line = buffer.subarray(0, newline).toString();
				buffer = buffer.subarray(newline + 1);
				return line;
			}
			if (ended) {
				if (buffer.length === 0) return undefined;
				const line = buffer.toString();
				buffer = Buffer.alloc(0);
				return line;
			}
			await new Promise<void>((resolve) => (notify = resolve));
		}
	};

	for (;;) {
		const line = await nextLine();
		if (line === undefined) return;

		const command = line.trim();
		if (command === "") continue;

		if (command === "capabilities") {
			stdout.write("connect\n\n");
			continue;
		}

		if (command.startsWith("connect ")) {
			const service = command.slice("connect ".length).trim();
			if (service !== "git-upload-pack") {
				throw new Error(`Unsupported service "${service}"`);
			}

			const repo = await resolveRepoPath(url, pkgMgr);

			// Blank line acks the connection; the raw git protocol follows.
			stdout.write("\n");
			const child = spawn("git-upload-pack", [repo], {
				stdio: ["pipe", "pipe", "inherit"]
			});
			// Stop accumulating into `buffer`; forward what we already read,
			// then stream the rest straight to git-upload-pack.
			stdin.removeListener("data", onData);
			stdin.removeListener("end", onEnd);
			if (buffer.length > 0) child.stdin.write(buffer);
			stdin.pipe(child.stdin);
			child.stdout.pipe(stdout);

			return new Promise<void>((resolve, reject) => {
				child.on("error", (error) => {
					reject(
						new Error(
							`Failed to run git-upload-pack: ${error.message}`
						)
					);
				});
				child.on("close", (code, signal) =>
					code === 0
						? resolve()
						: code !== null
							? reject(
									new Error(
										`git-upload-pack exited with code ${code}`
									)
								)
							: reject(
									new Error(
										`git-upload-pack exited with signal ${signal ?? "unknown"}`
									)
								)
				);
			});
		}

		throw new Error(`Unsupported command "${command}"`);
	}
}

/**
 * Runs the `git-remote-cfspkg` helper backed by the conan package manager.
 *
 * Shared by the CLI and IDE entry points, which each compile it into their own
 * bundle layout.
 */
export async function runGitRemoteCfspkg(
	conanConfigPath?: string,
	cfsInstallDir?: string
): Promise<void> {
	try {
		const pkgManager = new ConanPkgManager({
			conanConfigPath,
			cfsInstallDir
		});

		const argv = process.argv.slice(2);
		const stdin = process.stdin;
		const stdout = process.stdout;

		const url = argv[1] ?? argv[0];
		if (url === undefined) {
			throw new Error("Missing remote URL");
		}

		await serve(url, pkgManager, stdin, stdout);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : String(error);
		console.error("git-remote-cfspkg: fatal error:", message);
		process.exit(1);
	}
}
