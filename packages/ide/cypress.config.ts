/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
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
import { defineConfig } from "cypress";
import { defineConfig as defineViteConfig } from "vite";
import path from "node:path";
import react from "@vitejs/plugin-react-swc";

const viteConfig = defineViteConfig(() => {
  return {
    root: path.resolve(process.cwd(), "./src/webviews/config-tools"),
    plugins: [react()],
    resolve: {
      alias: {
        "@common": path.resolve(process.cwd(), "./src/webviews/common/"),
        "@wrksp-common": path.resolve(
          __dirname,
          "./src/webviews/workspace-creation/src/common/",
        ),
        "@adi-ctx/harmonic-core-components-react": path.resolve(
          process.cwd(),
          "./src/webviews/config-tools",
          "./src/lib/drawing-engine/HarmonicPolyfill.js",
        ),
        "@socs": path.resolve(process.cwd(), `../cfs-data-models/socs/`),
      },
    },
    build: {
      outDir: path.resolve(process.cwd(), "./out/config-tools"),
      emptyOutDir: true,
      target: "esnext",
      rollupOptions: {
        input: path.resolve(
          process.cwd(),
          "./src/webviews/config-tools/index.html",
        ),
      },
    },
    css: {
      preprocessorOptions: {
        loadPaths: [
          path.resolve(process.cwd(), "./src/webviews/common/styles"),
        ],
      },
    },
  };
});

export default defineConfig({
  component: {
    devServer: {
      framework: "react",
      bundler: "vite",
      viteConfig,
    },
    setupNodeEvents(on) {
      on("task", {
        log(message) {
          console.log(message);

          return null;
        },
      });
    },
  },
  fileServerFolder: path.resolve(process.cwd(), "src/webviews/"),
});
