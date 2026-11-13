/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
 * Copyright (c) 2026 Antmicro <www.antmicro.com>
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
import { ExTester } from "vscode-extension-tester";
import * as fs from "fs";

const EXTENSIONS_DIR = path.resolve(
  process.cwd(),
  "src",
  "tests",
  "ui-test-zephelin",
  ".vscode",
);

/**
 * Recorded trace replayed by the Zephelin backend during the gather-traces
 * test.
 */
const MOCK_TRACE_FILE = path.resolve(
  process.cwd(),
  "src",
  "tests",
  "fixtures",
  "traces",
  "mock-trace.tef"
);

async function main() {
  if (!process.env.ZEPHELIN_PATH) {
    throw new Error("ZEPHELIN_PATH is not set.");
  }

  const settingsPath =
    process.env.SETTINGS_PATH ?? path.join(EXTENSIONS_DIR, "settings.json");

  const isWin = process.platform === "win32";

  const mockBackendSettingsPath = path.join(
    EXTENSIONS_DIR,
    "settings.mock-backend.json",
  );

  try {
    let socsPath = path.resolve(process.cwd(), "..", "cfs-data-models", "socs");

    let zephelinPath = path.resolve(process.env.ZEPHELIN_PATH);
    let pythonPath = isWin
      ? path.resolve(zephelinPath, ".venv", "Scripts", "python.exe")
      : path.resolve(zephelinPath, ".venv", "bin", "python");

    if (isWin) {
      socsPath = socsPath.replace(/\\/g, "\\\\");
      zephelinPath = zephelinPath.replace(/\\/g, "\\\\");
      pythonPath = pythonPath.replace(/\\/g, "\\\\");
    }

    // ui-test-zephelin does not consume plugins, so use empty search directories
    const settings = {
      "cfs.plugins.searchDirectories": [],
      "cfs.plugins.dataModelSearchDirectories": [socsPath],
      "zephelin.backendPath": zephelinPath,
      "zephelin.pythonPath": pythonPath,
      "cfs.traceCapture.configuration": {
        source: { type: "uart", serialPort: "/dev/ttyUSB0" },
      },
    };

    await fs.promises.writeFile(
      settingsPath,
      JSON.stringify(settings),
      "utf-8",
    );

    await fs.promises.writeFile(
      mockBackendSettingsPath,
      JSON.stringify({
        ...settings,
        "zephelin.mockTraceFile": MOCK_TRACE_FILE,
      }),
      "utf-8",
    );

    console.log("Settings file successfully created at", settingsPath);

    const tester = new ExTester(undefined, undefined, EXTENSIONS_DIR);

    await tester.setupRequirements({
      vscodeVersion: "max",
      useYarn: false,
      installDependencies: false,
    });

    await tester.runTests(
      [
        path.resolve(__dirname, "general/cfs-ztv-integration-test.js"),
      ],
      {
        config: path.resolve(process.cwd(), ".mocharc.js"),
        resources: [],
        settings: settingsPath,
        cleanup: false,
        logLevel: "debug" as any,
        vscodeVersion: "max",
      },
    );

    await tester.runTests(
      [
        path.resolve(__dirname, "general/gather-traces.js"),
      ],
      {
        config: path.resolve(process.cwd(), ".mocharc.js"),
        resources: [],
        settings: mockBackendSettingsPath,
        cleanup: true,
        logLevel: "debug" as any,
        vscodeVersion: "max",
      },
    );
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  } finally {
    await fs.promises.rm(settingsPath, { force: true });
    await fs.promises.rm(mockBackendSettingsPath, { force: true });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
