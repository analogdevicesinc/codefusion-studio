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
import { Plugin } from "vite";
import fs from "fs";
import path from "path";
import fg from "fast-glob";

/**
 * serialport and its transitive dependencies.
 */
const SERIALPORT_DEPENDENCIES = [
  // Main packages
  "serialport",
  "@serialport",
  // Transitive dependencies
  "debug",
  "ms",
  "node-addon-api",
  "node-gyp-build",
];

/**
 * Converts a path to use forward slashes (POSIX style).
 * This is necessary for glob patterns to work correctly on Windows.
 */
function toPosixPath(p: string): string {
  return p.split(path.sep).join("/");
}

/**
 * Vite plugin that copies serialport to the vendor directory.
 *
 * serialport contains platform-specific .node bindings that cannot be bundled
 * by Vite/Rollup. This plugin copies it to a vendor directory so it can be
 * included in the VSIX package.
 */
export function copySerialport(): Plugin {
  return {
    name: "copy-serialport",
    apply: "build",
    closeBundle() {
      const vendorDir = path.resolve(__dirname, "vendor", "node_modules");

      fs.rmSync(vendorDir, { recursive: true, force: true });
      fs.mkdirSync(vendorDir, { recursive: true });

      // Search both package-level and root node_modules (yarn workspace hoisting)
      // Convert to POSIX paths for glob compatibility on Windows
      const packageNodeModules = toPosixPath(
        path.resolve(__dirname, "node_modules"),
      );
      const rootNodeModules = toPosixPath(
        path.resolve(__dirname, "..", "..", "node_modules"),
      );
      const deps = SERIALPORT_DEPENDENCIES.join(",");
      const pattern = `{${packageNodeModules},${rootNodeModules}}/{${deps}}`;

      const matches = fg.sync(pattern, { onlyDirectories: true });
      if (matches.length != SERIALPORT_DEPENDENCIES.length) {
        throw new Error(
          `Expected to find ${SERIALPORT_DEPENDENCIES.length} dependencies, but found ${matches.length}. Pattern: ${pattern}`,
        );
      }

      for (const srcPath of matches) {
        const normalizedSrcPath = path.normalize(srcPath);
        const moduleName = normalizedSrcPath
          .split(`node_modules${path.sep}`)
          .pop()!;
        const destPath = path.join(vendorDir, moduleName);
        fs.cpSync(normalizedSrcPath, destPath, { recursive: true });
      }

      console.log(`Copied serialport to ${vendorDir}`);
    },
  };
}
