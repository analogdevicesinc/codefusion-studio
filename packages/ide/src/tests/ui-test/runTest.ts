/**
 *
 * Copyright (c) 2025-2026 Analog Devices, Inc.
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
import { findVsix } from "../ui-test-utils/vsix-utils";

const EXTENSIONS_DIR = path.resolve(
  process.cwd(),
  "src",
  "tests",
  "ui-test",
  ".vscode",
);
const COMMON_SETTINGS_PATH = path.resolve(
  process.cwd(),
  "src",
  "tests",
  "common-settings.json",
);

async function main() {
  const settingsPath =
    process.env.SETTINGS_PATH ?? path.join(EXTENSIONS_DIR, "settings.json");

  try {
    const commonSettingsRaw = await fs.promises.readFile(
      COMMON_SETTINGS_PATH,
      "utf-8",
    );
    const settingsObj = JSON.parse(commonSettingsRaw) as Record<
      string,
      unknown
    >;

    await fs.promises.writeFile(
      settingsPath,
      JSON.stringify(settingsObj, null, 2),
      "utf-8",
    );

    console.log("Settings file successfully created at", settingsPath);

    // Support TEST_PATTERN environment variable for grouping tests by folder.
    const testPattern = process.env.TEST_PATTERN ?? "**/*test*.js";
    console.log(`Using test pattern: ${testPattern}`);

    const tester = new ExTester(undefined, undefined, EXTENSIONS_DIR);

    console.log(
      "⬇️  Downloading VS Code and ChromeDriver (cached after first run)...",
    );
    await tester.downloadCode();
    await tester.downloadChromeDriver();
    console.log("✅ VS Code and ChromeDriver ready!\n");

    console.log("📥 Installing extension...");
    const vsixPath = await findVsix();
    console.log(`Found extension: ${vsixPath}`);
    await tester.installVsix({ vsixFile: vsixPath });
    console.log("✅ Extension installed!\n");

    const testGlob = path.resolve(__dirname, testPattern);
    console.log(`Running tests matching: ${testPattern}\n`);

    await tester.runTests(testGlob, {
      config: path.resolve(process.cwd(), ".mocharc.js"),
      resources: [],
      settings: settingsPath,
      cleanup: true,
      logLevel: "debug" as any,
      vscodeVersion: "max",
    });

    const reportPath = path.resolve(
      process.cwd(),
      "coverage",
      "test-results.json",
    );

    try {
      if (fs.existsSync(reportPath)) {
        const reportRaw = await fs.promises.readFile(reportPath, "utf-8");
        const report = JSON.parse(reportRaw);

        console.log("\n\n🎯 Test Summary:");
        console.log(`✔ Passed:   ${report.passes?.length || 0}`);
        console.log(`✖ Failed:   ${report.failures?.length || 0}`);
        console.log(`⏳ Pending:  ${report.pending?.length || 0}`);
        console.log(`⏱ Duration: ${report.stats?.duration || 0}ms`);
      } else {
        console.warn("⚠️  No report found at:", reportPath);
      }
    } catch (e) {
      console.error("❌ Failed to parse test summary report:", e);
    }
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
