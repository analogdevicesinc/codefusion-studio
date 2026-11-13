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
 * Resolves the manifests a `west.yml` imports to files on disk.
 *
 * Mirrors west's own rules so the editor lists what `west update` would
 * actually read. Filters on an import mapping (`name-allowlist`,
 * `path-prefix`, ...) shape the projects taken from a submanifest, not which
 * file it is, so they are ignored here: every manifest is listed as it is,
 * independently of the manifest importing it.
 *
 * Free of the VS Code API so it can be exercised against a temporary
 * directory in unit tests.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { WestImport, WestManifest, WestManifestImport } from "./types";
import {
  GIT_ENTRY,
  exists,
  isDirectory,
  readManifestConfig,
} from "./west/workspace";

/** west's manifest file name, used when an import names no file. */
const DEFAULT_MANIFEST_FILE = "west.yml";

/** Extensions west reads from an imported directory (its `_is_yml`). */
const MANIFEST_EXTENSIONS = [".yml", ".yaml"];

/**
 * Resolves the files an `import` value names, relative to the directory it is
 * resolved against.
 *
 * Accepts every form west does: a boolean (the failsafe schema hands it over
 * as `"true"` / `"false"`), a path, a mapping with an optional `file`, or a
 * sequence of paths and mappings. A path may still name a directory; that is
 * only known once the disk is read.
 *
 * @param value Raw `import` value.
 * @returns The imported paths, or an empty list when nothing is imported.
 */
export function resolveImportPaths(value: WestImport): string[] {
  if (value === undefined || value === null || value === "false") return [];

  if (value === true || value === "true") return [DEFAULT_MANIFEST_FILE];

  if (typeof value === "string") return value ? [value] : [];

  if (Array.isArray(value)) return value.flatMap(resolveImportPaths);

  if (typeof value === "object") {
    const { file } = value as { file?: unknown };

    return [typeof file === "string" && file ? file : DEFAULT_MANIFEST_FILE];
  }

  return [];
}

/**
 * Lists the manifests imported by `manifest`, resolved against the disk.
 *
 * - A project import is relative to the project's checkout path, which is
 *   itself relative to the workspace topdir.
 * - A `self.import` is relative to the root of the manifest repository.
 * - An import naming a directory expands to every `.yml` and `.yaml` file
 *   directly in it, in lexicographic order, as west imports them.
 *
 * An import that is not on disk yet (a project `west update` has not cloned)
 * is still listed, as the path the manifest names.
 *
 * @param manifest Manifest to read.
 * @param manifestPath Absolute path of the manifest file.
 * @param topdir Workspace topdir. Without one, project imports cannot be
 * located: they are listed unexpanded and without an absolute path.
 * @returns One entry per imported file, in manifest order, `self` first.
 */
export async function resolveManifestImports(
  manifest: WestManifest,
  manifestPath: string,
  topdir: string | undefined,
): Promise<WestManifestImport[]> {
  const manifestDir = path.dirname(manifestPath);
  const repoRoot = await findManifestRepo(manifestPath, topdir);
  // Paths are shown relative to the topdir, the root every path in a
  // manifest is written against. Outside a workspace, the manifest's own
  // directory is the only anchor there is.
  const displayRoot = topdir ?? manifestDir;

  const selfImports = await expandImports(
    manifest.self?.import,
    repoRoot,
    displayRoot,
  );

  const projectImports = await Promise.all(
    (manifest.projects ?? []).map(async (project) => {
      const projectPath = project.path ?? project.name;
      const entries: ResolvedImport[] = topdir
        ? await expandImports(
            project.import,
            path.join(topdir, projectPath),
            displayRoot,
          )
        : resolveImportPaths(project.import).map((file) => ({
            path: toPosix(path.join(projectPath, file)),
          }));

      return entries.map((entry) => ({
        projectName: project.name,
        ...entry,
      }));
    }),
  );

  return [...selfImports, ...projectImports.flat()];
}

/** An imported file, before the project it comes from is attached. */
type ResolvedImport = Pick<WestManifestImport, "path" | "absolutePath">;

/**
 * Resolves an `import` value against `baseDir` and expands directories.
 *
 * @returns The imported files, shown relative to `displayRoot`.
 */
async function expandImports(
  value: WestImport,
  baseDir: string,
  displayRoot: string,
): Promise<ResolvedImport[]> {
  const expanded = await Promise.all(
    resolveImportPaths(value).map(async (importPath) => {
      const absolute = path.resolve(baseDir, importPath);

      if (!(await isDirectory(absolute))) return [absolute];

      const entries = await fs.readdir(absolute, { withFileTypes: true });

      return selectManifestFiles(
        entries.filter((entry) => entry.isFile()).map((entry) => entry.name),
      ).map((name) => path.join(absolute, name));
    }),
  );

  return expanded.flat().map((absolute) => ({
    path: toPosix(path.relative(displayRoot, absolute)),
    absolutePath: absolute,
  }));
}

/**
 * Finds the directory a manifest's `self.import` is resolved against.
 *
 * For the workspace's main manifest this is the manifest repository west is
 * configured with, `<topdir>/<manifest.path>`: west reads it from
 * `.west/config` rather than searching for it. Any other manifest, such as
 * one opened from the imported list, is not described there, so its
 * enclosing repository is searched for instead.
 *
 * @param manifestPath Absolute path of the manifest file.
 * @param topdir Workspace topdir, if the manifest is in a workspace.
 */
async function findManifestRepo(
  manifestPath: string,
  topdir: string | undefined,
): Promise<string> {
  const manifestDir = path.dirname(manifestPath);

  if (!topdir) return findRepoRoot(manifestDir, topdir);

  const config = await readManifestConfig(topdir);

  if (config.path) {
    const repo = path.resolve(topdir, config.path);
    const mainManifest = path.resolve(
      repo,
      config.file ?? DEFAULT_MANIFEST_FILE,
    );

    if (path.resolve(manifestPath) === mainManifest) return repo;
  }

  return findRepoRoot(manifestDir, topdir);
}

/**
 * Finds the root of the repository holding a manifest: the nearest directory
 * with a `.git` entry, searched no higher than the topdir.
 *
 * Only a fallback: it guesses, and the nearest `.git` can belong to a parent
 * checkout. See {@link findManifestRepo} for when it is used.
 *
 * @returns The repository root, or `manifestDir` when none is found.
 */
async function findRepoRoot(
  manifestDir: string,
  topdir: string | undefined,
): Promise<string> {
  let dir = path.resolve(manifestDir);

  for (;;) {
    if (await exists(path.join(dir, GIT_ENTRY))) return dir;

    const parent = path.dirname(dir);

    if (dir === topdir || parent === dir) return manifestDir;

    dir = parent;
  }
}

/**
 * Picks the manifests west imports from a directory's file names, in the
 * order it imports them.
 *
 * Kept apart from the directory read because the order the disk returns is
 * already sorted on some file systems, which would hide a missing sort.
 *
 * @param fileNames Names of the regular files in the directory.
 * @returns The `.yml` and `.yaml` names, sorted by code point like Python's
 * `sorted`, so `B.yml` precedes `a.yml`.
 */
export function selectManifestFiles(fileNames: string[]): string[] {
  return fileNames
    .filter((name) => MANIFEST_EXTENSIONS.includes(path.extname(name)))
    .sort();
}

/** Manifest paths are shown with `/` on every platform, as west writes them. */
function toPosix(target: string): string {
  return target.split(path.sep).join("/");
}
