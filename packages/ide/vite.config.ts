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

import path from "path";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import react from "@vitejs/plugin-react";

const extensionConfig = {
  plugins: [react(), tsconfigPaths({ projects: ["./tsconfig.json"] })],
  build: {
    lib: {
      entry: "src",
      formats: ["cjs"],
      fileName: "cfs-ide",
    },
    rollupOptions: {
      input: {
        extension: "src/extension.ts",
        tests: "src/tests/test-index.ts",
      },
      output: {
        dir: "out",
        format: "cjs",
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
      external: [
        "vscode",
        "fs/promises",
        "fs",
        "node:child_process",
        "os",
        "rm",
        "path",
        "node:process",
        "node:child_process",
        "public",
        "timers/promises",
        "glob",
        "xml2js",
        "htmlparser2",
        "lodash.debounce",
        /node_modules/,
        "node:fs",
        "node:path",
        "node:buffer",
        "alasql"
      ],
      watch: {
        exclude: ["node_modules/**"],
        include: ["src/**/*"],
        clearScreen: false,
        chokidar: {
          usePolling: true,
          interval: 1000,
        },
        skipWrite: false,
      },
    },
    sourcemap: true,
    emptyOutDir: true,
    minify: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", "..."],
  },
};

const webviewConfig = {
  plugins: [react(), tsconfigPaths({ projects: ["./tsconfig.webview.json"] })],
  build: {
    outDir: "out/webview",
    emptyOutDir: true,
    rollupOptions: {
      input: "./src/webview/index.tsx",
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", "..."],
  },
};

const newProjectConfig = {
  plugins: [react(), tsconfigPaths({ projects: ["./tsconfig.webview.json"] })],
  build: {
    outDir: "out/new-project-wizard",
    emptyOutDir: true,
    rollupOptions: {
      input: "./src/webview/pages/new-project-wizard/index.tsx",
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
        inlineDynamicImports: true,
      },
    },
    cssCodeSplit: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", "..."],
  },
};

export default defineConfig(({ mode }) => {
  if (mode === "extension") {
    return extensionConfig;
  }

  if (mode === "webview") {
    return webviewConfig;
  }

  if (mode === "new-project-wizard") {
    return newProjectConfig;
  }

  return {};
});
