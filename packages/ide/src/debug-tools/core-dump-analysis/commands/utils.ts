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
import { CoreDumpConfig } from "../types";
import { EXTENSION_ID } from "../../../constants";
import { Utils } from "../../../utils/utils";
import path from "path";
import fs from "fs/promises";
import JSZip from "jszip";
import {
  CORE_DUMP_ADDRESS_KEY,
  CORE_DUMP_BIN_FILE_KEY,
  CORE_DUMP_ELF_FILE_KEY,
  CORE_DUMP_SIZE_KEY,
} from "./constants";
import { existsSync } from "fs";

/**
 * Returns the core dump config for the given workspace folder.
 * Resolves relative paths and provides defaults.
 */
export async function getProjectCoreDumpConfig(
  folder: vscode.WorkspaceFolder,
): Promise<CoreDumpConfig> {
  const config = vscode.workspace.getConfiguration(EXTENSION_ID, folder.uri);
  const binFileName = config.get<string>(
    CORE_DUMP_BIN_FILE_KEY,
    "core-dump.bin",
  );
  const binFile = path.isAbsolute(binFileName)
    ? binFileName
    : Utils.joinWorkspacePath(folder.uri.fsPath, binFileName);

  let elfFileRaw = config.get<string>(
    CORE_DUMP_ELF_FILE_KEY,
    "build/zephyr/zephyr.elf",
  );
  // Replace ${workspaceFolder} with the workspace folder name (not path), but avoid double prefix
  if (
    elfFileRaw.includes("${workspaceFolder}") &&
    !elfFileRaw.startsWith(folder.name)
  ) {
    elfFileRaw = elfFileRaw.replace(/\${workspaceFolder}/g, folder.name);
  }
  let elfFile: string;
  if (path.isAbsolute(elfFileRaw)) {
    elfFile = elfFileRaw;
  } else if (elfFileRaw.startsWith(folder.name)) {
    // Already starts with workspace folder name, join with parent of workspace root
    elfFile = Utils.joinWorkspacePath(
      path.dirname(folder.uri.fsPath),
      elfFileRaw,
    );
  } else {
    elfFile = Utils.joinWorkspacePath(folder.uri.fsPath, elfFileRaw);
  }

  const gdbPort = config.get<string>("coreDump.gdbServerPort");

  return {
    address: config.get<string>(CORE_DUMP_ADDRESS_KEY, ""),
    size: config.get<number>(CORE_DUMP_SIZE_KEY, 0),
    binFile,
    elfFile,
    gdbPort,
  };
}

/**
 * Finds a VS Code task by name.
 */
export async function findTaskByName(
  name: string,
): Promise<vscode.Task | undefined> {
  const tasks = await vscode.tasks.fetchTasks();
  return tasks.find((t) => t.name === name);
}

/**
 * Prompts the user to select a project folder for core dump analysis.
 * Filters out folders with '.cfs' in the name.
 */
export async function selectProjectFolder(): Promise<
  vscode.WorkspaceFolder | undefined
> {
  const folders = vscode.workspace.workspaceFolders || [];
  const projects = folders.filter(
    (f) => !f.name.toLowerCase().includes(".cfs"),
  );
  if (projects.length === 0) return;
  if (projects.length === 1) return projects[0];
  const items = projects.map((f) => ({
    label: f.name,
    description: f.uri.fsPath,
  }));
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: "Select the project for core dump analysis",
  });
  return projects.find((f) => f.name === selected?.label) || projects[0];
}

/**
 * Prompts the user to select a core dump file (.bin or .log) from the given project folder.
 * Allows browsing for files outside the project.
 */
export async function selectCoreDumpFile(
  projectFolder: vscode.WorkspaceFolder,
): Promise<string | undefined> {
  const binUris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(projectFolder, "**/*.bin"),
  );
  const logUris = await vscode.workspace.findFiles(
    new vscode.RelativePattern(projectFolder, "**/*.log"),
  );
  const allUris = [...binUris, ...logUris];
  const quickPickItems: vscode.QuickPickItem[] = allUris.map((uri) => ({
    label: vscode.workspace.asRelativePath(uri),
    description: uri.fsPath,
  }));
  quickPickItems.push({
    label: "$(file-directory) Browse for file...",
    description: "Select a core dump file from anywhere",
  });
  const selectedFile = await vscode.window.showQuickPick(quickPickItems, {
    placeHolder: "Select a core dump (.bin or .log) file to analyze",
  });
  if (!selectedFile) return undefined;
  if (selectedFile.label.includes("Browse")) {
    const files = await vscode.window.showOpenDialog({
      filters: { "Core Dump Files": ["bin", "log"], "All Files": ["*"] },
      canSelectMany: false,
    });
    if (!files || files.length === 0) return undefined;
    return files[0].fsPath;
  }
  return selectedFile.description;
}

/**
 * Ensures the output directory exists, sanitizing Windows paths.
 */
export async function ensureOutputDirectory(
  config: CoreDumpConfig,
): Promise<string> {
  let dir = path.dirname(config.binFile);
  if (!/^[a-zA-Z]:$/.test(dir)) dir = dir.replace(/:/g, "");
  await vscode.workspace.fs.createDirectory(vscode.Uri.file(dir));
  return dir;
}

/**
 * Validates the core dump config and returns an error message or null if valid.
 */
export async function validateCoreDumpConfig(
  config: CoreDumpConfig,
): Promise<string | null> {
  if (!config.binFile) return "Missing bin file path in core dump config.";
  if (!config.elfFile) return "Missing ELF file path in core dump config.";
  if (!(config.size > 0)) return "Invalid core dump size in config.";
  return null;
}

/**
 * Safely extracts an error message from any error type.
 */
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function generateMarkdownReport(parsedData: any): string {
  let md = `# Core Dump Analysis Report\n`;
  md += `\n---\n`;
  md += `## Summary\n`;
  md += `${parsedData.summary ?? "No summary available"}\n`;

  // Crash Cause Section
  md += `\n## Crash Cause\n`;
  const crash = parsedData.details?.crashCause;
  if (Array.isArray(crash) && crash.length) {
    for (const cause of crash) {
      md += `- **Type:** ${cause.type ?? "Unknown"}\n`;
      md += `  - **Address:** ${cause.address ?? "Unknown"}\n`;
      md += `  - **Faulting IP:** ${cause.pc ?? "Unknown"}\n`;
      md += `  - **Location:** ${cause.symtab ?? "Unknown"}:${cause.line ?? "Unknown"}\n`;
      md += `  - **Details:** ${cause.details ?? "Unknown"}\n`;
      if (cause.reason) {
        md += `  - **Reason:** ${cause.reason.message ?? "Unknown"} (code: ${cause.reason.code ?? "?"})\n`;
      }
    }
  } else {
    md += `No crash cause info available.\n`;
  }

  // Tasks Section
  md += `\n## Tasks\n`;
  const tasks = parsedData.details?.tasks;
  if (Array.isArray(tasks) && tasks.length) {
    for (const task of tasks) {
      md += `- **Name:** ${task.name ?? "Unknown"}\n`;
      md += `  - **Status:** ${task.status ?? "Unknown"}\n`;
      md += `  - **Thread Address:** ${task.address ?? "Unknown"}\n`;
      if (task.stack) {
        md += `  - **Stack Usage:**\n`;
        md += `    - Used: ${task.stack.used ?? "Unknown"} KB\n`;
        md += `    - Total: ${task.stack.total ?? "Unknown"} KB\n`;
        md += `    - Watermark: ${task.stack.max_usage_percent ?? "Unknown"}%\n`;
      }
      if (task.execution_info) {
        md += `  - **Execution Info:**\n`;
        md += `    - PC: ${task.execution_info.pc ?? "Unknown"}\n`;
        md += `    - SP: ${task.execution_info.sp ?? "Unknown"}\n`;
        md += `    - LR: ${task.execution_info.lr ?? "Unknown"}\n`;
      }
      if (Array.isArray(task.trace) && task.trace.length) {
        md += `  - **Stack Trace:**\n`;
        for (const frame of task.trace) {
          md += `    - ${frame.function ?? "Unknown"} at ${frame.file ?? "Unknown"}:${frame.line ?? "Unknown"}\n`;
        }
      }
      if (task.reason) {
        md += `  - **Reason:** ${task.reason.message ?? "Unknown"} (code: ${task.reason.code ?? "?"})\n`;
      }
    }
  } else {
    md += `No task stack info available.\n`;
  }

  // Heap Usage Section
  md += `\n## Heap Usage\n`;
  const heap = parsedData.details?.heap;
  if (heap && typeof heap === "object") {
    md += `- **Total:** ${heap.total ?? "Unknown"} KB\n`;
    md += `- **Used:** ${heap.used ?? "Unknown"} KB\n`;
    md += `- **Peak:** ${heap.max ?? "Unknown"} KB\n`;
    if (heap.message) md += `- **Message:** ${heap.message}\n`;
  } else {
    md += `No heap usage info available.\n`;
  }

  // Additional Details Section
  if (parsedData.details?.additional) {
    md += `\n## Additional Details\n`;
    for (const [key, value] of Object.entries(parsedData.details.additional)) {
      md += `- **${key}:** ${value}\n`;
    }
  }

  md += `\n---\n`;
  md += `*Report generated by CodeFusion Studio on ${new Date().toLocaleString()}*\n`;
  return md;
}

/**
 * Exports a ZIP archive containing core dump analysis reports for all workspace projects.
 * Each project gets a subfolder with its bin, elf, and Markdown report. Missing files are noted in the report.
 * The .cfs directory is ignored. All paths are absolute and platform-consistent.
 */
export async function exportCoreDumpReport(treeProvider: any): Promise<void> {
  const zip = new JSZip();
  const folders =
    vscode.workspace.workspaceFolders?.filter((f) => f.name !== ".cfs") || [];
  if (folders.length === 0) {
    vscode.window.showErrorMessage(
      "No valid workspace folders found for core dump export.",
    );
    return;
  }

  let anyExported = false;
  for (const folder of folders) {
    const config = vscode.workspace.getConfiguration(EXTENSION_ID, folder.uri);
    const binFile = config.get<string>(CORE_DUMP_BIN_FILE_KEY, "");
    const elfFile = config.get<string>(CORE_DUMP_ELF_FILE_KEY, "");
    const address = config.get<string>(CORE_DUMP_ADDRESS_KEY, "");
    const size = config.get<number>(CORE_DUMP_SIZE_KEY, 0);
    const subZip = zip.folder(folder.name);
    let reportMd = `# Core Dump Analysis Report for ${folder.name}\n\n`;
    const missing: string[] = [];

    let exportedAnyFile = false;

    if (binFile && existsSync(binFile)) {
      const binData = await fs.readFile(binFile);
      subZip?.file(path.basename(binFile), binData);
      reportMd += `- Bin file: ${binFile}\n`;
      exportedAnyFile = true;
    } else {
      missing.push("bin");
      reportMd += `- Bin file: MISSING\n`;
    }
    // Normalize elfFile path if it contains ${workspaceFolder}
    let normalizedElfFile = elfFile;
    if (elfFile.includes("${workspaceFolder}")) {
      normalizedElfFile = path.join(
        folder.uri.fsPath,
        elfFile.replace("${workspaceFolder}/", ""),
      );
    }
    if (normalizedElfFile && existsSync(normalizedElfFile)) {
      const elfData = await fs.readFile(normalizedElfFile);
      subZip?.file("zephyr.elf", elfData);
      reportMd += `- ELF file: ${normalizedElfFile}\n`;
      exportedAnyFile = true;
    } else {
      missing.push("elf");
      reportMd += `- ELF file: MISSING\n`;
    }
    reportMd += `- Address: ${address}\n- Size: ${size}\n`;
    if (missing.length) {
      reportMd += `\n**Missing files:** ${missing.join(", ")}\n`;
    }
    // Instead of treeProvider?.getMarkdownReport, use generateMarkdownReport for each project
    let parsedData = treeProvider?.getCoreDumpInfo?.(folder) || {};
    reportMd += generateMarkdownReport(parsedData);
    subZip?.file("report.md", reportMd);
    if (exportedAnyFile) {
      anyExported = true;
    }
  }

  if (!anyExported) {
    vscode.window.showErrorMessage(
      "No valid core dump data found in any workspace folder.",
    );
    return;
  }

  const cfsDirectory = vscode.workspace.workspaceFolders?.filter(
    (f) => f.name === ".cfs",
  )[0];

  let savePath: string;
  if (cfsDirectory) {
    savePath = path.join(cfsDirectory.uri.fsPath, "core-dump-report.zip");
  } else {
    vscode.window.showErrorMessage(
      "Failed to export core dump report: Could not find .cfs directory",
    );
    return;
  }

  try {
    const zipData = await zip.generateAsync({ type: "nodebuffer" });
    await fs.writeFile(savePath, zipData);
    vscode.window
      .showInformationMessage(
        `Core dump reports exported to ${savePath}`,
        "Open Report",
      )
      .then((action) => {
        if (action === "Open Report") {
          vscode.commands.executeCommand(
            "revealInExplorer",
            vscode.Uri.file(savePath),
          );
        }
      });
  } catch (err) {
    vscode.window.showErrorMessage(
      `Failed to export core dump reports: ${getErrorMessage(err)}`,
    );
  }
}
