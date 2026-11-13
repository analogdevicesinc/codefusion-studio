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
import { glob } from "fast-glob";

const IGNORED = [
  "**/node_modules/**",
  "**/out/**",
  "**/.git/**",
  "**/test-resources/**",
];

/**
 * Locates the packaged extension.
 * @param searchRoot - Directory to search. Defaults to `CFS_VSIX_DIR` when set, otherwise the current working directory.
 * @returns The path to the most recently modified `.vsix`.
 * @throws When no VSIX file is found.
 */
export async function findVsix(
  searchRoot: string = process.env.CFS_VSIX_DIR ?? process.cwd(),
): Promise<string> {
  const entries = await glob("**/*.vsix", {
    cwd: searchRoot,
    absolute: true,
    onlyFiles: true,
    stats: true,
    deep: 3,
    ignore: IGNORED,
    suppressErrors: true,
  });

  if (entries.length === 0) {
    throw new Error(
      `No VSIX file found under ${searchRoot}. Run 'yarn ws:ide package' to generate one, ` +
        `or set CFS_VSIX_DIR to the directory holding the VSIX.`,
    );
  }

  entries.sort((a, b) => (b.stats?.mtimeMs ?? 0) - (a.stats?.mtimeMs ?? 0));

  if (entries.length > 1) {
    console.warn(
      `Found ${entries.length} VSIX files under ${searchRoot}, using the most recently modified one:\n` +
        entries
          .map(({ path }, index) => `${index === 0 ? "  ->" : "    "} ${path}`)
          .join("\n"),
    );
  }

  return entries[0].path;
}
