/**
 *
 * Copyright (c) 2025 Analog Devices, Inc.
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
  "ui-test",
  ".vscode",
);

async function main() {
  const settingsPath =
    process.env.SETTINGS_PATH ?? path.join(EXTENSIONS_DIR, "settings.json");

  const isWin = process.platform === "win32";

  try {
    let pluginsPath = path.resolve(
      process.cwd(),
      "..",
      "..",
      "submodules",
      "cfs-plugins",
      "plugins",
      "dist",
    );

    let socsPath = path.resolve(process.cwd(), "..", "cfs-data-models", "socs");

    if (isWin) {
      pluginsPath = pluginsPath.replace(/\\/g, "\\\\");
      socsPath = socsPath.replace(/\\/g, "\\\\");
    }

    await fs.promises.writeFile(
      settingsPath,
      `{"cfs.plugins.searchDirectories": ["${pluginsPath}"], "cfs.plugins.dataModelSearchDirectories": ["${socsPath}"]}`,
      "utf-8",
    );

    console.log("Settings file successfully created at", settingsPath);

    const tester = new ExTester(undefined, undefined, EXTENSIONS_DIR);

    await tester.setupAndRunTests(
      [
        // TODO: Use wildcard to run all tests, some tests are not being run now.
        path.resolve(__dirname, "general/command-test.js"),
        path.resolve(__dirname, "general/activation-test.js"),
        path.resolve(__dirname, "home/show-on-startup-test.js"),
        path.resolve(__dirname, "build/adi-sdkpath-prompt-test.js"),
        path.resolve(__dirname, "general/command-shortcut-settings.js"),
      ],
      "max",
      {
        useYarn: false,
        installDependencies: false,
      },
      {
        config: path.resolve(process.cwd(), ".mocharc.js"),
        resources: [],
        settings: settingsPath,
        cleanup: true,
        logLevel: "debug" as any,
      },
    );
  } catch (err) {
    console.error("Failed to run tests", err);
    process.exit(1);
  } finally {
    await fs.promises.unlink(settingsPath);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
