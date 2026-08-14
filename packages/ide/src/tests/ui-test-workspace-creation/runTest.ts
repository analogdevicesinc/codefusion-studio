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

const EXTENSIONS_DIR = path.resolve(
  process.cwd(),
  "src",
  "tests",
  "ui-test-workspace-creation",
  ".vscode",
);
const COMMON_SETTINGS_PATH = path.resolve(
  process.cwd(),
  "src",
  "tests",
  "common-settings.json",
);
process.env.SKIP_OPEN_WORKSPACE = "true"; // Skip opening workspace in tests

async function main() {
  const settingsPath =
    process.env.SETTINGS_PATH ?? path.join(EXTENSIONS_DIR, "settings.json");

  const catalogPath = path.resolve(
    process.cwd(),
    "src",
    "tests",
    "ui-test-workspace-creation",
    ".catalog",
  );

  let socsPath = path.resolve(process.cwd(), "..", "cfs-data-models", "socs");

  let projectPluginsPath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "test-fixtures",
    "plugins",
    "project",
  );

  let workspaceTemplatesPath = path.resolve(
    process.cwd(),
    "..",
    "..",
    "test-fixtures",
    "plugins",
    "workspace-templates",
  );

  try {
    if (!fs.existsSync(projectPluginsPath)) {
      throw new Error(
        `Project plugin fixtures not found: ${projectPluginsPath}. See test fixture refresh instructions in DEVELOPMENT.md.`,
      );
    }

    if (!fs.existsSync(workspaceTemplatesPath)) {
      throw new Error(
        `Workspace template fixtures not found: ${workspaceTemplatesPath}. See test fixture refresh instructions in DEVELOPMENT.md.`,
      );
    }

    const commonSettingsRaw = await fs.promises.readFile(
      COMMON_SETTINGS_PATH,
      "utf-8",
    );
    const settingsObj = JSON.parse(commonSettingsRaw) as Record<
      string,
      unknown
    >;

    settingsObj["cfs.plugins.searchDirectories"] = [
      projectPluginsPath,
      workspaceTemplatesPath,
    ];
    settingsObj["cfs.plugins.dataModelSearchDirectories"] = [socsPath];
    settingsObj["cfs.catalogManager.checkForUpdates"] = false;
    settingsObj["cfs.catalogManager.catalogLocation"] = catalogPath;

    await fs.promises.writeFile(
      settingsPath,
      JSON.stringify(settingsObj, null, 2),
      "utf-8",
    );

    console.log("Generated plugin fixture search paths:", [
      projectPluginsPath,
      workspaceTemplatesPath,
    ]);

    // Support TEST_PATTERN environment variable for grouping tests by folder.
    const testPattern = process.env.TEST_PATTERN ?? "suite/*.test.js";
    console.log(`Using test pattern: ${testPattern}`);

    const tester = new ExTester(undefined, undefined, EXTENSIONS_DIR);

    // Download VS Code and ChromeDriver only (these are cached)
    // We skip setupRequirements() because it triggers the prepublish script and rebuilds the extension
    console.log(
      "⬇️  Downloading VS Code and ChromeDriver (cached after first run)...",
    );
    await tester.downloadCode();
    await tester.downloadChromeDriver();
    console.log("✅ VS Code and ChromeDriver ready!\n");

    // Install the VSIX so VS Code properly registers extension contributions.
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

    // Run tests
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
