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
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), "") };
  let devSoc;
  const devSocId = process.env.DEV_SOC_ID;

  if (mode === "development" && command === "serve") {
    try {
      await import(
        path.resolve(process.cwd(), `../cli/src/socs/${devSocId}.json`),
        { assert: { type: "json" } }
      ).then(({ default: soc }) => {
        devSoc = soc;
      });
    } catch (e) {
      console.error(e);
    }
  }

  return {
    root: path.resolve(__dirname, "./src/webviews/config-tools"),
    plugins: [react()],
    resolve: {
      alias: {
        "@common": path.resolve(__dirname, "./src/webviews/common/"),
        "@adi-ctx/harmonic-core-components-react": path.resolve(
          __dirname,
          "./src/webviews/config-tools",
          "./src/lib/drawing-engine/HarmonicPolyfill.js",
        ),
      },
    },
    build: {
      outDir: path.resolve(__dirname, "./out/config-tools"),
      emptyOutDir: true,
      target: "esnext",
      rollupOptions: {
        input: path.resolve(
          __dirname,
          "./src/webviews/config-tools/index.html",
        ),
      },
    },
    define: {
      __DEV_SOC__: JSON.stringify(devSoc),
    },
    css: {
      preprocessorOptions: {
        loadPaths: [path.resolve(__dirname, "./src/webviews/common/styles")],
      },
    },
  };
});
