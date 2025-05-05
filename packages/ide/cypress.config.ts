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
import { defineConfig as defineViteConfig, loadEnv } from "vite";
import path from "node:path";
import { readFile } from "node:fs/promises";
import react from "@vitejs/plugin-react-swc";

const viteConfig = defineViteConfig(async () => {
  const devSocId = loadEnv("development", process.cwd(), "").DEV_SOC_ID;

  const devSoc = await readFile(
    path.resolve(process.cwd(), `../cli/src/socs/${devSocId}.json`),
    'utf-8'
  ).then((data) => JSON.parse(data));

  return {
    root: path.resolve(process.cwd(), "./src/webviews/config-tools"),
    plugins: [react()],
    resolve: {
      alias: {
        "@common": path.resolve(process.cwd(), "./src/webviews/common/"),
        "@adi-ctx/harmonic-core-components-react": path.resolve(
          process.cwd(),
          "./src/webviews/config-tools",
          "./src/lib/drawing-engine/HarmonicPolyfill.js",
        ),
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
    define: {
      __DEV_SOC__: JSON.stringify(devSoc),
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
  env: {
    DEV_SOC_ID: "max32690-tqfn",
    CLOCK_CONFIG_DEV_SOC_ID: "max32690-wlp",
    VITE_FIRMWARE_PLATFORM: "MSDK",
  },
  fileServerFolder: path.resolve(process.cwd(), "src/webviews/"),
});
