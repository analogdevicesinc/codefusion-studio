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
import fs from "fs";
import path from "path";

/**
 * A resolved package in a native module's dependency closure.
 */
export type ResolvedPackage = {
  /** The package name, e.g. `serialport` or `@serialport/bindings-cpp`. */
  name: string;
  /** Absolute path to the package's installed directory. */
  dir: string;
};

/**
 * The `node_modules` directories a native module dependency might resolve from.
 * The package-level directory comes first, then the repo-root directory to
 * account for yarn workspace hoisting.
 */
const NODE_MODULES_ROOTS = [
  path.resolve(__dirname, "node_modules"),
  path.resolve(__dirname, "..", "..", "node_modules"),
];

/**
 * Locates the installed directory of a package by name, searching the known
 * `node_modules` roots in order.
 * @param name - The package name to locate.
 * @returns The absolute path to the package directory, or `undefined` if it
 * cannot be found in any known root.
 */
function findPackageDir(name: string): string | undefined {
  for (const root of NODE_MODULES_ROOTS) {
    const candidate = path.join(root, name);
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }

  return undefined;
}

/**
 * Reads the runtime `dependencies` of a package from its `package.json`.
 * @param dir - Absolute path to the package directory.
 * @returns The dependency names, or an empty array if none are declared.
 */
function readDependencies(dir: string): string[] {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string> };

  return Object.keys(manifest.dependencies ?? {});
}

/**
 * Computes the full runtime dependency closure of one or more native modules
 * (such as `serialport` and `usb`) by transitively walking each package's
 * declared `dependencies`, starting from the provided root packages.
 *
 * This is the single source of truth for both externalizing native modules
 * from the extension bundle and copying them into `node_modules` for
 * packaging, so neither has to hardcode the (version-dependent) dependency
 * list.
 * @param roots - The root package names to start the walk from.
 * @returns The resolved packages in the closure, sorted by name. Throws if any
 * root or transitive dependency cannot be located on disk.
 */
export function resolveNativeModuleClosure(roots: string[]): ResolvedPackage[] {
  const resolved = new Map<string, string>();
  const queue = [...roots];

  while (queue.length > 0) {
    const name = queue.shift()!;
    if (resolved.has(name)) {
      continue;
    }

    const dir = findPackageDir(name);
    if (!dir) {
      throw new Error(
        `Unable to locate native module dependency "${name}" in any of: ${NODE_MODULES_ROOTS.join(
          ", ",
        )}`,
      );
    }

    resolved.set(name, dir);
    queue.push(...readDependencies(dir));
  }

  return Array.from(resolved.entries())
    .map(([name, dir]) => ({ name, dir }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Extracts the package name from an import specifier, handling scoped packages
 * and subpath imports (e.g. `@serialport/stream/dist/index.js` → `@serialport/stream`).
 * @param source - The import specifier.
 * @returns The package name.
 */
function packageNameOf(source: string): string {
  const segments = source.split("/");

  return source.startsWith("@") ? segments.slice(0, 2).join("/") : segments[0];
}

/**
 * Builds a predicate that determines whether an import specifier belongs to the
 * given native module dependency closure and must therefore be left external to
 * the extension bundle (native `.node` bindings cannot be bundled).
 * @param closure - The resolved dependency closure.
 * @returns A predicate returning `true` when the specifier resolves to a
 * package in the closure.
 */
export function createExternalPredicate(
  closure: ResolvedPackage[],
): (source: string) => boolean {
  const closureNames = new Set(closure.map((pkg) => pkg.name));

  return (source: string) => closureNames.has(packageNameOf(source));
}
