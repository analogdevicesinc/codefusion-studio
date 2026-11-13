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

import path from "path";
import { defineConfig, type Plugin } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

import react from "@vitejs/plugin-react";
import {
  copyConanFiles,
  copyGitRemoteHelper,
} from "./vite.plugin.cfs-package-manager";
import { copyNativeModules } from "./vite.plugin.copy-native-modules";
import {
  createExternalPredicate,
  resolveNativeModuleClosure,
} from "./native-module-closure";

// serialport and usb ship platform-specific native `.node` bindings that
// cannot be bundled; their whole dependency closures must stay external to the
// bundle and be resolved from node_modules at runtime. See
// native-module-closure.ts.
const NATIVE_MODULE_ROOTS = ["serialport", "usb"];
const nativeModuleClosure = resolveNativeModuleClosure(NATIVE_MODULE_ROOTS);
const nativeModuleExternals = nativeModuleClosure.map((pkg) => pkg.name);
const isNativeModuleExternal = createExternalPredicate(nativeModuleClosure);

/**
 * Creates a config that bundles a single Node entry point and all its
 * dependencies (except native modules) into one CJS file.
 * @param name - The output file name (without extension), relative to `out`.
 * @param entry - The entry point source file.
 * @param plugins - Extra plugins to run as part of this build.
 * @param emptyOutDir - Whether to clear `out` before building.
 * @returns The Vite config.
 */
const createNodeBundleConfig = (
  name: string,
  entry: string,
  plugins: Plugin[],
  emptyOutDir: boolean,
) => ({
  plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] }), ...plugins],
  build: {
    ssr: true, // the server side rendering preset uses rollup settings that support node modules properly
    cssMinify: "esbuild",
    rolldownOptions: {
      input: { [name]: entry },
      output: {
        dir: "out",
        format: "cjs",
        codeSplitting: false, // emit everything into a single file
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
        exports: "named",
        dynamicImportInCjs: false, // not supported in vscode-loader
      },
      external: (source: string) => {
        const staticExternals = [
          "vscode", // prevent error when rollup can't resolve vscode module
          "proper-lockfile", // unused optional dependency of @ster5/global-mutex
          "react-native-fs",
          "react-native-fetch-blob",
          "encoding", // optional peer dependency of node-fetch
        ];

        return (
          staticExternals.includes(source) || isNativeModuleExternal(source)
        );
      },
      watch: {
        exclude: [
          "node_modules/**",
          "src/tests/**",
          "**/webviews/**",
          "**/webview/**",
        ],
        include: ["src/**/*"],
        clearScreen: false,
        watcher: {
          usePolling: true,
          pollInterval: 1000,
        },
        skipWrite: false,
      },
    },
    sourcemap: true,
    emptyOutDir,
    minify: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    extensions: [".ts", ".tsx", ".js", ".jsx", "..."],
  },
  ssr: {
    // do not attempt to bundle (or resolve) these; the serialport and usb
    // native closures must be require()'d from node_modules at runtime. In Vite
    // SSR, `external` entries win over `noExternal: true`.
    external: ["vscode", ...nativeModuleExternals],
    noExternal: true, // bundle all the other dependencies
    target: "node",
  },
  appType: "custom",
});

// Bundle the extension and all its dependencies into out/extension.js
const extensionConfig = createNodeBundleConfig(
  "extension",
  "src/extension.ts",
  [copyConanFiles(), copyNativeModules(nativeModuleClosure)],
  true,
);

// Standalone git remote helper for the cfspkg:// transport. Emitted as
// out/git-remote/entry.js and run by git/west as a separate Node process. It
// must not import the `vscode` module. Built after the extension so that it
// does not clear the extension output.
const gitRemoteConfig = createNodeBundleConfig(
  "git-remote/entry",
  "src/git-remote/entry.ts",
  [copyGitRemoteHelper()],
  false,
);

const webviewConfig = {
  plugins: [react(), tsconfigPaths({ projects: ["./tsconfig.webview.json"] })],
  build: {
    outDir: "out/webview",
    emptyOutDir: true,
    rolldownOptions: {
      input: "./src/webview/index.tsx",
      output: {
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`,
        inlineDynamicImports: true,
      },
    },
    cssMinify: "esbuild",
    cssCodeSplit: false,
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

  if (mode === "git-remote") {
    return gitRemoteConfig;
  }

  if (mode === "webview") {
    return webviewConfig;
  }

  return {};
});
