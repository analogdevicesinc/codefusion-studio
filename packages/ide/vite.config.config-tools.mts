/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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

import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import { viteWebviewConfigGenerator } from "./vite-webview-config-generator";

export default defineConfig(
  viteWebviewConfigGenerator({
    name: "config-tools",
    plugins: [
      {
        name: "copy-drawing-engine",
        writeBundle() {
          const src = path.resolve(
            __dirname,
            "./src/webviews/config-tools/src/lib/drawing-engine",
          );
          const dest = path.resolve(__dirname, "./out/config-tools/assets");
          fs.mkdirSync(dest, { recursive: true });

          const files = fs
            .readdirSync(src)
            .filter((file) => !file.endsWith(".d.ts"));
          for (const file of files) {
            fs.copyFileSync(path.join(src, file), path.join(dest, file));
          }
        },
      },
    ],
    aliases: {
      "@adi-ctx/harmonic-core-components-react": path.resolve(
        __dirname,
        "./src/webviews/config-tools",
        "./src/lib/drawing-engine/HarmonicPolyfill.js",
      ),
    },
  }),
);
