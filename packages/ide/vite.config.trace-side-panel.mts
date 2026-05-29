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

import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig(({ command, mode }) => {
  return (async () => {
    const isWatchMode = process.argv.includes("--watch");
    const isDev = mode === "development";

    return {
      root: path.resolve(__dirname, "./src/webviews/trace-side-panel"),
      plugins: [react()],
      resolve: {
        alias: {
          "@common": path.resolve(__dirname, "./src/webviews/common/"),
          "@constants": path.resolve(__dirname, "./src/constants/"),
          "@ide-types": path.resolve(__dirname, "./src/types/"),
        },
      },
      build: {
        outDir: path.resolve(__dirname, "./out/trace-side-panel"),
        emptyOutDir: true,
        target: "esnext",
        sourcemap: isDev ? "inline" : false,
        minify: isDev ? false : "terser",
        rollupOptions: {
          input: path.resolve(
            __dirname,
            "./src/webviews/trace-side-panel/index.html",
          ),
          output: {
            entryFileNames: `assets/[name].js`,
            chunkFileNames: `assets/[name].js`,
            assetFileNames: `assets/[name][extname]`,
          },
        },
        ...(isWatchMode && {
          watch: {
            include: "src/webviews/trace-side-panel/**",
            exclude: "src/webviews/trace-side-panel/**/*.cy.ts*",
            clearScreen: true,
          },
        }),
      },
      css: {
        preprocessorOptions: {
          loadPaths: [path.resolve(__dirname, "./src/webviews/common/styles")],
        },
      },
    };
  })();
});
