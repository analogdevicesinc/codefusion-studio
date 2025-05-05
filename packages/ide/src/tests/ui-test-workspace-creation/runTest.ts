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
  "ui-test-workspace-creation",
  ".vscode",
);

async function main() {
  const settingsPath =
    process.env.SETTINGS_PATH ?? path.join(EXTENSIONS_DIR, "settings.json");

  try {
    await fs.promises.writeFile(settingsPath, "{}", "utf-8");

    await fs.promises.writeFile(
      settingsPath,
      JSON.stringify({
        "cfs.catalogManager.checkForUpdates": false,
        "cfs.catalogManager.catalogLocation": path.join(
          path.dirname(EXTENSIONS_DIR),
          ".catalog",
        ),
      }),
      "utf-8",
    );

    const settings = await fs.promises.readFile(settingsPath, "utf-8");
    console.debug("Settings", settings);

    const tester = new ExTester(undefined, undefined, EXTENSIONS_DIR);

    await tester.setupAndRunTests(
      path.resolve(__dirname, "suite/*.test.js"),
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
