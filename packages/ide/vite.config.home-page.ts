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

import react from "@vitejs/plugin-react-swc";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname, "./src/webviews/home-page"),
  plugins: [react()],
  resolve: {
    alias: {
      "@common": path.resolve(__dirname, "./src/webviews/common/"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "./out/home-page"),
    emptyOutDir: true,
    target: "esnext",
    rollupOptions: {
      input: path.resolve(__dirname, "./src/webviews/home-page/index.html"),
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
  css: {
    preprocessorOptions: {
      loadPaths: [path.resolve(__dirname, "./src/webviews/common/styles")],
    },
  },
});
