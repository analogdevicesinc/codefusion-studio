/**
 *
 * Copyright (c) 2024-2025 Analog Devices, Inc.
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
import { copyConanFiles } from "./vite.plugin.cfs-package-manager";

// Bundle the extension and all it's depencencies to CJS
const extensionConfig = {
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] }), copyConanFiles()],
  build: {
    ssr: true, // the server side rendering preset uses rollup settings that support node modules properly
    commonjsOptions: {
      // These are used in conditional require statements in the `alasql` dependency
      // Ignoring leaves the require statements intact (e.g. not hoisted to the top of the module)
      ignore: ["react-native-fs", "react-native-fetch-blob"],
    },
    rollupOptions: {
      input: {
        extension: "src/extension.ts",
      },
      output: {
        dir: "out",
        format: "cjs",
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        exports: "named",
        dynamicImportInCjs: false, // not supported in vscode-loader
      },
      external: ["vscode"], // prevent error when rollup can't resolve vscode module
      watch: {
        exclude: [
          "node_modules/**",
          "src/tests/**",
          "**/webviews/**",
          "**/webview/**",
        ],
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
  ssr: {
    external: ["vscode"], // do not attempt to bundle (or resolve)
    noExternal: true, // bundle all the other dependencies
    target: "node",
  },
  appType: "custom",
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

export default defineConfig(({ mode }) => {
  if (mode === "extension") {
    return extensionConfig;
  }

  if (mode === "webview") {
    return webviewConfig;
  }

  return {};
});
