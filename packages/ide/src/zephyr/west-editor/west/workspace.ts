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

/**
 * Locates a west workspace on disk: its topdir and its `.west/config`.
 * Free of the VS Code API so it can be unit tested.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";

/** Directory that marks the root of a west workspace. */
const WEST_DIR = ".west";

/** The workspace's local configuration file, inside {@link WEST_DIR}. */
const WEST_CONFIG_FILE = "config";

/** Entry that marks the root of a git repository (a directory, or a file in a worktree). */
export const GIT_ENTRY = ".git";

/**
 * Finds the west workspace topdir: the nearest directory holding `.west`.
 *
 * Follows west's own search: walk up from `startDir`, and when that finds
 * nothing, walk up again from `ZEPHYR_BASE`.
 *
 * @param startDir Directory the search starts from.
 * @param zephyrBase Value of `ZEPHYR_BASE`, searched when `startDir` fails.
 * @returns The topdir, or `undefined` outside a west workspace.
 */
export async function findWestTopdir(
  startDir: string,
  zephyrBase: string | undefined = process.env.ZEPHYR_BASE,
): Promise<string | undefined> {
  return (
    (await findUpwards(startDir)) ??
    (zephyrBase ? await findUpwards(zephyrBase) : undefined)
  );
}

async function findUpwards(startDir: string): Promise<string | undefined> {
  let dir = path.resolve(startDir);

  for (;;) {
    if (await isDirectory(path.join(dir, WEST_DIR))) return dir;

    const parent = path.dirname(dir);

    if (parent === dir) return undefined;

    dir = parent;
  }
}

/** The `[manifest]` options of a workspace's `.west/config`. */
export type ManifestConfig = {
  /** `manifest.path`: the manifest repository, relative to the topdir. */
  path?: string;
  /** `manifest.file`: the manifest file, relative to that repository. */
  file?: string;
};

/**
 * Reads the `[manifest]` section of `<topdir>/.west/config`.
 *
 * The file is INI, as Python's `configparser` reads it: `key = value` or
 * `key: value` lines under `[section]` headers, with `#` and `;` comment
 * lines. Only the two keys the resolver needs are kept.
 *
 * @returns The options found; empty when the file is missing or unreadable.
 */
export async function readManifestConfig(
  topdir: string,
): Promise<ManifestConfig> {
  let text: string;

  try {
    text = await fs.readFile(
      path.join(topdir, WEST_DIR, WEST_CONFIG_FILE),
      "utf8",
    );
  } catch {
    return {};
  }

  const config: ManifestConfig = {};
  let inManifest = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#") || line.startsWith(";")) continue;

    const section = /^\[(.+)\]$/.exec(line);

    if (section) {
      inManifest = section[1].trim() === "manifest";
      continue;
    }

    const option = inManifest ? /^([^=:]+)[=:](.*)$/.exec(line) : null;

    if (!option) continue;

    // configparser matches option names case-insensitively.
    const key = option[1].trim().toLowerCase();
    const value = option[2].trim();

    if ((key === "path" || key === "file") && value) config[key] = value;
  }

  return config;
}

/** Whether `target` exists, whatever its type. */
export async function exists(target: string): Promise<boolean> {
  try {
    await fs.stat(target);

    return true;
  } catch {
    return false;
  }
}

/** Whether `target` exists and is a directory. */
export async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await fs.stat(target)).isDirectory();
  } catch {
    return false;
  }
}
