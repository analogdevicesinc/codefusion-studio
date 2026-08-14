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
import { ResolvedPackage } from "./native-module-closure";

/**
 * Vite plugin that copies a native module dependency closure into the built
 * output's `out/node_modules` directory.
 *
 * Native modules such as `serialport` and `usb` contain platform-specific
 * `.node` bindings that cannot be bundled by Vite/Rollup, so they are marked
 * external (see native-module-closure.ts) and must be resolved from
 * `node_modules` at runtime. The closure is copied into `out/node_modules`
 * (alongside the bundled `out/extension.js`) for two reasons:
 *
 * 1. Runtime resolution: `out/node_modules` is the first location Node's
 *    resolver checks for a bare `require("serialport")`/`require("usb")` from
 *    `out/extension.js`.
 * 2. Packaging: `vsce` (configured with `dependencies: false`) collects files
 *    with a hardcoded `node_modules/**` ignore anchored at the extension root,
 *    which would drop a top-level `node_modules`. A nested `out/node_modules`
 *    does not match that pattern, so it ships in the VSIX.
 *
 * The package list is computed by {@link resolveNativeModuleClosure} rather than
 * hardcoded, so it stays correct across native module version bumps.
 * @param closure - The resolved dependency closure to copy.
 */
export function copyNativeModules(closure: ResolvedPackage[]): Plugin {
  return {
    name: "copy-native-modules",
    apply: "build",
    closeBundle() {
      const nodeModulesDir = path.resolve(__dirname, "out", "node_modules");

      for (const { name, dir } of closure) {
        const destPath = path.join(nodeModulesDir, name);

        // Only replace the specific closure packages; never wipe the whole
        // node_modules directory.
        fs.rmSync(destPath, { recursive: true, force: true });
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.cpSync(dir, destPath, { recursive: true });
      }

      console.log(
        `Copied ${closure.length} native module closure packages to ${nodeModulesDir}`,
      );
    },
  };
}
