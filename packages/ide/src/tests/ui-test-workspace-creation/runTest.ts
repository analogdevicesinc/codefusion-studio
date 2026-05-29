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
    "src",
    "tests",
    "fixtures",
    "plugins",
    "project",
  );

  let workspaceTemplatesPath = path.resolve(
    process.cwd(),
    "src",
    "tests",
    "fixtures",
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

    const settingsObj = {
      "cfs.plugins.searchDirectories": [
        projectPluginsPath,
        workspaceTemplatesPath,
      ],
      "cfs.plugins.dataModelSearchDirectories": [socsPath],
      "cfs.catalogManager.checkForUpdates": false,
      "cfs.catalogManager.catalogLocation": catalogPath,
      "cfs.telemetry.enable": false,
      "cfs.sdk.path": "some/fake/path",
    };

    await fs.promises.writeFile(
      settingsPath,
      JSON.stringify(settingsObj, null, 2),
      "utf-8",
    );

    console.log("Generated plugin fixture search paths:", [
      projectPluginsPath,
      workspaceTemplatesPath,
    ]);

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
