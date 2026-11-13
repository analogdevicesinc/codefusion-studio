/**
 *
 * Copyright (c) 2024, 2026 Analog Devices, Inc. All Rights Reserved.
 * This software is proprietary to Analog Devices, Inc. and its licensors.
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

export function copyConanFiles(): Plugin {
  return {
    name: "copy-conan-files",
    apply: "build",
    closeBundle() {
      const sourceDir = path.resolve(
        __dirname,
        "../cfs-package-manager/src/conan-backend/config",
      );
      const outDir = path.resolve(__dirname, "./out/conan-config");

      if (fs.existsSync(sourceDir)) {
        fs.mkdirSync(outDir, { recursive: true });
        const files = fs.readdirSync(sourceDir);

        for (const file of files) {
          const sourceFile = path.join(sourceDir, file);
          const destFile = path.join(outDir, file);

          const stat = fs.statSync(sourceFile);
          if (stat.isDirectory()) {
            // Recursively copy directory (Node.js 16+)
            fs.cpSync(sourceFile, destFile, { recursive: true });
          } else {
            fs.copyFileSync(sourceFile, destFile);
          }
        }

        console.log(
          `Copied files from "cfs-package-manager/src/conan-backend/config" to "./out/conan-config"`,
        );
      }
    },
  };
}

/**
 * Copies the shared `git-remote-cfspkg` launcher scripts from cfs-package-manager
 * into `out/git-remote/`, next to the bundled helper entry, so the extension can
 * put them on PATH for spawned git/west processes.
 */
export function copyGitRemoteHelper(): Plugin {
  return {
    name: "copy-git-remote-helper",
    apply: "build",
    closeBundle() {
      const sourceDir = path.resolve(
        __dirname,
        "../cfs-package-manager/src/git-remote",
      );
      const outDir = path.resolve(__dirname, "./out/git-remote");

      fs.mkdirSync(outDir, { recursive: true });

      for (const file of ["git-remote-cfspkg", "git-remote-cfspkg.cmd"]) {
        const sourceFile = path.join(sourceDir, file);
        if (!fs.existsSync(sourceFile)) continue;
        const destFile = path.join(outDir, file);
        fs.copyFileSync(sourceFile, destFile);
      }

      // The POSIX launcher must be executable; git execs it directly.
      const shim = path.join(outDir, "git-remote-cfspkg");
      if (fs.existsSync(shim)) {
        fs.chmodSync(shim, 0o755);
      }

      console.log(`Copied git-remote-cfspkg launcher(s) to "./out/git-remote"`);
    },
  };
}
