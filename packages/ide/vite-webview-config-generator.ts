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

import react from "@vitejs/plugin-react";
import type { PluginOption, UserConfigFn } from "vite";
import path from "path";
import { forceLegacyImports } from "./vite-legacy-importer";

/** Configuration for a webview's Vite build. */
interface CommonWebviewConfig {
  /** Webview directory name under `src/webviews/`. */
  name: string;
  /** Additional resolve aliases merged into the Vite config. */
  aliases?: Record<string, string>;
  plugins?: PluginOption[];
}

/**
 * Generates a Vite config function for a webview.
 */
export const viteWebviewConfigGenerator = ({
  aliases,
  name,
  plugins,
}: CommonWebviewConfig): UserConfigFn => {
  return ({ mode }) => {
    const isDev = mode === "development";

    return {
      root: path.resolve(__dirname, `./src/webviews/${name}`),
      plugins: [react(), ...(plugins ?? [])],
      resolve: {
        alias: {
          "@common": path.resolve(__dirname, "./src/webviews/common/"),
          ...aliases,
        },
      },
      build: {
        outDir: path.resolve(__dirname, `./out/${name}`),
        emptyOutDir: true,
        cssMinify: "esbuild", // replaces the newly default lightningcss because of incompatibilities with existing code
        target: "esnext",
        sourcemap: isDev ? "inline" : false,
        minify: isDev ? false : "terser",
        rolldownOptions: {
          input: path.resolve(__dirname, `./src/webviews/${name}/index.html`),
          output: {
            entryFileNames: `assets/[name].js`,
            chunkFileNames: `assets/[name].js`,
            assetFileNames: `assets/[name][extname]`,
          },
        },
      },
      css: {
        preprocessorOptions: {
          scss: {
            importer: forceLegacyImports,
          },
        },
      },
    };
  };
};
