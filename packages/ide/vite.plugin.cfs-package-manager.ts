/**
 *
 * Copyright (c) 2024 Analog Devices, Inc. All Rights Reserved.
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
      const outDir = path.resolve(
        __dirname,
        "./out/packages/cfs-package-manager/dist/conan-backend/config",
      );

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
          `Copied files from "cfs-package-manager/src/conan-backend/config" to "./out/packages/cfs-package-manager/dist/conan-backend/config"`,
        );
      }
    },
  };
}
