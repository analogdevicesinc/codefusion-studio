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

import * as vscode from "vscode";
import { CoreDumpEngine } from "../services/core-dump-engine";
import { CoreDumpTreeProvider } from "../ui/core-dump-tree-provider";
import { CoreDumpManager } from "../services/core-dump-execution-manager";
import { CoreDumpConfig } from "../types";
import { EXTENSION_ID } from "../../../constants";
import { ZephyrLogCoreDumpParser } from "../parsers/zephyr-log-core-dump-parser";
import { CoreDumpNode } from "../ui/core-dump-node";
import * as fs from "fs/promises";
import { Utils } from "../../../utils/utils";
import {
  CORE_DUMP_ANALYZE_COMMAND_ID,
  CORE_DUMP_DOWNLOAD_REPORT_COMMAND_ID,
  CORE_DUMP_RETRIEVE_AND_ANALYZE_COMMAND_ID,
  CORE_DUMP_RETRIEVE_COMMAND_ID,
  CORE_DUMP_TREE_VIEW_COMMAND_ID,
  CORE_DUMP_RETRIEVE_TASK_NAME,
  CORE_DUMP_LOG_FILE_KEY,
  CORE_DUMP_ADDRESS_KEY,
  CORE_DUMP_SIZE_KEY,
  CORE_DUMP_ELF_FILE_KEY,
  CORE_DUMP_BIN_FILE_KEY,
  CORE_DUMP_NODE_CLICK_COMMAND_ID,
  CORE_DUMP_COPY_ADDRESS,
  CORE_DUMP_COPY_FILE_PATH,
} from "./constants";
import {
  ensureOutputDirectory,
  findTaskByName,
  getErrorMessage,
  getProjectCoreDumpConfig,
  selectCoreDumpFile,
  selectProjectFolder,
  validateCoreDumpConfig,
  exportCoreDumpReport,
} from "./utils";
import { SessionManager } from "../services/core-dump-session-manager";
import { openFileAtLine } from "../../../utils/open-file-location";

/**
 * Registers all core dump related commands for the extension.
 * Handles retrieval, analysis, and UI context for Zephyr core dumps.
 */
export function registerCoreDumpCommands(context: vscode.ExtensionContext) {
  const sessionManager = new SessionManager();
  const treeProvider = new CoreDumpTreeProvider(sessionManager);
  CoreDumpManager.instance.setTreeProvider(treeProvider);
  vscode.window.registerTreeDataProvider(
    CORE_DUMP_TREE_VIEW_COMMAND_ID,
    treeProvider,
  );

  // Command: Retrieve and analyze core dump
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CORE_DUMP_RETRIEVE_AND_ANALYZE_COMMAND_ID,
      async () => {
        try {
          const folder = await selectProjectFolder();
          if (!folder) return;
          const config = await getProjectCoreDumpConfig(folder);
          const validationError = await validateCoreDumpConfig(config);
          if (validationError) return Utils.displayAndLogError(validationError);
          await ensureOutputDirectory(config);
          const engine = new CoreDumpEngine(
            config,
            treeProvider,
            folder,
            sessionManager,
          );
          await engine.runAnalysis({
            retrieve: true,
            parse: true,
            analyze: true,
          });
        } catch (err) {
          Utils.displayAndLogError(
            "Core dump analysis failed: " + getErrorMessage(err),
          );
        }
      },
    ),
  );

  // Command: Analyze existing core dump file
  async function handleAnalyzeCoreDump(
    treeProvider: CoreDumpTreeProvider,
  ): Promise<void> {
    const folder = await selectProjectFolder();
    if (!folder) return;
    const file = await selectCoreDumpFile(folder);
    if (!file) return;
    const config = vscode.workspace.getConfiguration(EXTENSION_ID, folder.uri);
    let binFile = file;
    if (file.endsWith(".log")) {
      await config.update(
        CORE_DUMP_LOG_FILE_KEY,
        file,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      binFile = file.replace(/\.log$/, ".bin");
      await config.update(
        CORE_DUMP_BIN_FILE_KEY,
        binFile,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await ZephyrLogCoreDumpParser.parse(file, binFile);
      const maxWaitMs = 10000,
        pollIntervalMs = 200;
      let waited = 0;
      while (waited < maxWaitMs) {
        try {
          await fs.access(binFile);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, pollIntervalMs));
          waited += pollIntervalMs;
        }
      }
      try {
        await fs.access(binFile);
      } catch {
        return Utils.displayAndLogError(
          "Core dump bin file was not created after parsing log. Aborting analysis.",
        );
      }
    } else {
      await config.update(
        CORE_DUMP_BIN_FILE_KEY,
        binFile,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }

    const coreDumpConfig: CoreDumpConfig = {
      address: config.get(CORE_DUMP_ADDRESS_KEY, ""),
      size: config.get(CORE_DUMP_SIZE_KEY, 0),
      binFile: binFile,
      elfFile: config.get(
        CORE_DUMP_ELF_FILE_KEY,
        Utils.joinWorkspacePath(
          folder.uri.fsPath,
          "build",
          "zephyr",
          "zephyr.elf",
        ),
      ),
    };

    const error = await validateCoreDumpConfig(coreDumpConfig);

    if (error) return Utils.displayAndLogError(error);

    await new CoreDumpEngine(
      coreDumpConfig,
      treeProvider,
      folder,
      sessionManager,
    ).runAnalysis({
      retrieve: false,
      parse: true,
      analyze: true,
    });
  }

  // Command: Analyze core dump
  context.subscriptions.push(
    vscode.commands.registerCommand(CORE_DUMP_ANALYZE_COMMAND_ID, async () => {
      try {
        await handleAnalyzeCoreDump(treeProvider);
      } catch (err) {
        Utils.displayAndLogError(
          "Core dump analysis failed: " + getErrorMessage(err),
        );
      }
    }),
  );

  // Command: Download report (multi-project aware)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      CORE_DUMP_DOWNLOAD_REPORT_COMMAND_ID,
      async () => {
        try {
          await exportCoreDumpReport(treeProvider);
        } catch (err) {
          Utils.displayAndLogError(
            "Failed to export core dump report: " + getErrorMessage(err),
          );
        }
      },
    ),
  );

  // Command: Retrieve core dump
  context.subscriptions.push(
    vscode.commands.registerCommand(CORE_DUMP_RETRIEVE_COMMAND_ID, async () => {
      try {
        const coreDumpTask = await findTaskByName(CORE_DUMP_RETRIEVE_TASK_NAME);
        if (coreDumpTask) {
          vscode.tasks.executeTask(coreDumpTask);
        } else {
          Utils.displayAndLogError("Core dump task not found.");
        }
      } catch (err) {
        Utils.displayAndLogError(
          "Failed to start core dump task: " + getErrorMessage(err),
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      CORE_DUMP_NODE_CLICK_COMMAND_ID,
      async (node: CoreDumpNode) => {
        const contextValue = node.contextValue;

        switch (contextValue) {
          case "crash-location":
            const { symtab, line } = node.clickData || {};
            if (symtab && line) {
              openFileAtLine(symtab, line);
            } else {
              vscode.window.showErrorMessage("Source location not available");
            }
            break;

          case "crash-address":
            const { address } = node.clickData || {};
            if (address) {
              await vscode.commands.executeCommand(
                "mcu-debug.memory-view.addMemoryView",
                address,
              );
            } else {
              vscode.window.showErrorMessage("Address not available");
            }
            break;

          default:
            break;
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CORE_DUMP_COPY_ADDRESS, (treeItem) => {
      const label = treeItem.label;
      const match = label.match(/(Address: )(0x[0-9A-z]+)/);
      if (match) {
        vscode.env.clipboard.writeText(match[2]);
      } else {
        vscode.window.showErrorMessage("Could not copy address to clipboard");
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(CORE_DUMP_COPY_FILE_PATH, (treeItem) => {
      const label = treeItem.label;
      const match = label.match(/(Faulting Location|symtab):\s+(.+):(\d*)/);
      if (match) {
        vscode.env.clipboard.writeText(match[2]);
      } else {
        vscode.window.showInformationMessage(
          "Could not copy file path to clipboard",
        );
      }
    }),
  );
}
