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
import * as path from "path";
import { ExTester } from "vscode-extension-tester";
import * as fs from "fs";

const EXTENSIONS_DIR = path.resolve(
  process.cwd(),
  "src",
  "tests",
  "ui-test-config-tools",
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

  const isWin = process.platform === "win32";
  const projectPluginFixturesPath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "test-fixtures",
    "plugins",
    "project",
  );

  try {
    let socsPath = path.resolve(process.cwd(), "..", "cfs-data-models", "socs");
    let dfgsocsPath = path.resolve(
      process.cwd(),
      "src",
      "tests",
      "ui-test-config-tools",
      "dfg-data-model",
      "socs",
    );

    let pluginsPath = projectPluginFixturesPath;

    if (isWin) {
      pluginsPath = pluginsPath.replace(/\\/g, "\\\\");
      socsPath = socsPath.replace(/\\/g, "\\\\");
      dfgsocsPath = dfgsocsPath.replace(/\\/g, "\\\\");
    }

    const commonSettingsRaw = await fs.promises.readFile(
      COMMON_SETTINGS_PATH,
      "utf-8",
    );
    const settingsObj = JSON.parse(commonSettingsRaw) as Record<
      string,
      unknown
    >;

    settingsObj["cfs.plugins.searchDirectories"] = [pluginsPath];
    settingsObj["cfs.plugins.dataModelSearchDirectories"] = [
      socsPath,
      dfgsocsPath,
    ];

    await fs.promises.writeFile(
      settingsPath,
      JSON.stringify(settingsObj, null, 2),
      "utf-8",
    );

    console.log("Generated path to plugins:", pluginsPath);

    // Support TEST_PATTERN environment variable for grouping tests by folder.
    // Multiple patterns can be comma-separated, e.g.
    // TEST_PATTERN="suite/a01-setup/**/*.test.js,suite/pin-config/**/*.test.js"
    // To run locally pls use the ENV variable TEST_PATTERN="suite/a01-setup/**/*.test.js,suite/pin-config/**/*.test.js"
    const testPatternRaw = process.env.TEST_PATTERN ?? "**/*.test.js";
    const testPatterns = testPatternRaw
      .split(",")
      .map((pattern) => pattern.trim())
      .filter(Boolean);
    console.log(`Using test pattern(s): ${testPatterns.join(", ")}`);

    const tester = new ExTester(undefined, undefined, EXTENSIONS_DIR);

    // Download VS Code and ChromeDriver only (these are cached)
    // We skip setupRequirements() because it triggers the prepublish script and rebuilds the extension
    console.log(
      "⬇️  Downloading VS Code and ChromeDriver (cached after first run)...",
    );
    await tester.downloadCode();
    await tester.downloadChromeDriver();
    console.log("✅ VS Code and ChromeDriver ready!\n");

    // Install the VSIX so VS Code properly registers the custom editor.
    // installVsix calls `code --install-extension` which is required for .cfsconfig
    // files to open in the System Planner webview instead of plain text.
    console.log("📥 Installing extension...");
    const findVsix = async (dir: string): Promise<string | undefined> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".vsix")) {
          return path.join(dir, entry.name);
        }
        if (entry.isDirectory()) {
          const found = await findVsix(path.join(dir, entry.name));
          if (found) return found;
        }
      }
      return undefined;
    };

    const vsixPath = await findVsix(process.cwd());
    if (!vsixPath) {
      throw new Error(
        `No VSIX file found under ${process.cwd()}. ` +
          `Run 'yarn build:extension && yarn package' to generate the VSIX.`,
      );
    }
    console.log(`Found extension: ${vsixPath}`);
    await tester.installVsix({ vsixFile: vsixPath });
    console.log("✅ Extension installed!\n");

    // Run tests once, passing all resolved patterns as an array.
    const testGlob = testPatterns.map((pattern) =>
      path.resolve(__dirname, pattern),
    );
    console.log(`Running tests matching: ${testPatterns.join(", ")}\n`);

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
