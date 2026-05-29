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

import * as path from "path";

export type { PortInfo } from "@serialport/bindings-interface";

/**
 * Loads a module from the vendor/node_modules directory.
 * Native modules like serialport cannot be bundled and must be loaded at runtime.
 * Uses a relative path from the compiled output location (out/debug-tools/).
 */
function vendorRequire<T>(moduleName: string): T {
  const modulePath = path.join(
    __dirname,
    "..",
    "..",
    "vendor",
    "node_modules",
    moduleName,
  );
  return require(modulePath);
}

let serialportModule: typeof import("serialport") | undefined;

export function requireSerialPort() {
  if (!serialportModule) {
    serialportModule = vendorRequire<typeof import("serialport")>("serialport");
  }
  return serialportModule;
}
