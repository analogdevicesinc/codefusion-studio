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

import { EditorView, TextEditor, Workbench } from "vscode-extension-tester";

/** Command palette title of the built-in VS Code startup performance report */
export const STARTUP_PERFORMANCE_COMMAND = "Developer: Startup Performance";

/** Editor tab title of the startup performance report */
export const STARTUP_PERFORMANCE_EDITOR_TITLE = "Startup Performance";

/** Markdown heading of the extension activation table in the report */
const EXTENSION_ACTIVATION_STATS_HEADING = "## Extension Activation Stats";

/**
 * A single row of the "Extension Activation Stats" table of the
 * "Developer: Startup Performance" report. All times are in milliseconds.
 */
export interface ExtensionActivationStats {
  extensionId: string;
  eager: boolean;
  loadCodeMs: number;
  callActivateMs: number;
  finishActivateMs: number;
  /** Sum of load code, call activate and finish activate times */
  totalMs: number;
  event: string;
  activatedBy: string;
}

/**
 * Parses the "Extension Activation Stats" table of the startup performance
 * report and returns the row for the given extension.
 * @param report - The full markdown text of the startup performance report
 * @param extensionId - The extension id, e.g. "analogdevices.cfs-ide"
 * @returns The parsed row, or undefined if the table or row is not present
 */
export function parseExtensionActivationStats(
  report: string,
  extensionId: string,
): ExtensionActivationStats | undefined {
  const lines = report.split(/\r?\n/);
  const headingIndex = lines.findIndex(
    (line) => line.trim() === EXTENSION_ACTIVATION_STATS_HEADING,
  );

  if (headingIndex === -1) {
    return undefined;
  }

  const tableRows: string[][] = [];

  for (const line of lines.slice(headingIndex + 1)) {
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      break;
    }

    if (trimmed.startsWith("|")) {
      tableRows.push(
        trimmed
          .split("|")
          .slice(1, -1)
          .map((cell) => cell.trim()),
      );
    }
  }

  // First row is the header, second row is the markdown separator
  const [header, , ...rows] = tableRows;

  if (!header) {
    return undefined;
  }

  const row = rows.find((cells) => cells[0] === extensionId);

  if (!row) {
    return undefined;
  }

  const cell = (column: string): string => {
    const index = header.indexOf(column);

    if (index === -1) {
      throw new Error(
        `Column "${column}" not found in extension activation stats table`,
      );
    }

    return row[index];
  };

  const loadCodeMs = Number(cell("Load Code"));
  const callActivateMs = Number(cell("Call Activate"));
  const finishActivateMs = Number(cell("Finish Activate"));

  for (const [name, value] of [
    ["Load Code", loadCodeMs],
    ["Call Activate", callActivateMs],
    ["Finish Activate", finishActivateMs],
  ] as const) {
    if (Number.isNaN(value)) {
      throw new Error(`Column "${name}" did not contain a numeric value`);
    }
  }

  return {
    extensionId,
    eager: cell("Eager") === "true",
    loadCodeMs,
    callActivateMs,
    finishActivateMs,
    totalMs: loadCodeMs + callActivateMs + finishActivateMs,
    event: cell("Event"),
    activatedBy: cell("By"),
  };
}

/**
 * Opens the "Developer: Startup Performance" report and waits until the
 * activation stats for the given extension are available.
 * The report is read via `TextEditor.getText()`, which goes through the system
 * clipboard, so the test process and VS Code must share a clipboard (as they
 * do under `xvfb-run` in CI).
 * @param workbench - The workbench used to execute the command
 * @param extensionId - The extension id to wait for
 * @param timeout - Maximum time to wait for the stats in milliseconds
 * @returns The parsed activation stats of the extension
 */
export async function getExtensionActivationStats(
  workbench: Workbench,
  extensionId: string,
  timeout = 30000,
): Promise<ExtensionActivationStats> {
  await workbench.executeCommand(STARTUP_PERFORMANCE_COMMAND);

  const editor = (await new EditorView().openEditor(
    STARTUP_PERFORMANCE_EDITOR_TITLE,
  )) as TextEditor;

  let stats: ExtensionActivationStats | undefined;

  // The report is filled in asynchronously, so poll until the row shows up
  await workbench.getDriver().wait(
    async () => {
      stats = parseExtensionActivationStats(
        await editor.getText(),
        extensionId,
      );

      return stats !== undefined;
    },
    timeout,
    `Activation stats for ${extensionId} not found in startup performance report`,
    1000,
  );

  return stats!;
}
