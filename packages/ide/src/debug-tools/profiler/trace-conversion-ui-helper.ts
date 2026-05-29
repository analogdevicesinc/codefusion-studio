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
import * as vscode from "vscode";
import { getWorkspaceRoot } from "../../utils/utils";
import { convertTrace, TraceConversionOptions } from "./trace-conversion-service";
import { Recording } from "./recording";
import { IDEShellEnvProvider } from "../../toolchains/shell-env-provider";
import path from "node:path";


export async function startTraceConversion(
  recording: Recording,
  shellEnvProvider: IDEShellEnvProvider,
  options?: TraceConversionOptions,
): Promise<void> {
  const [files, fileLinks] = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Processing trace files...",
      cancellable: false,
    },
    async () => {
      try {
        const workspaceRoot = getWorkspaceRoot() ?? "";

        const files = await Promise.all(
          recording.capturedFiles.map((file) =>
            convertTrace(
              file,
              shellEnvProvider,
              options && {
                buildDir: options.buildDir && (path.isAbsolute(options.buildDir)
                  ? options.buildDir
                  : path.join(workspaceRoot, options.buildDir)),
                zephyrElfPath: options.zephyrElfPath && (path.isAbsolute(options.zephyrElfPath)
                  ? options.zephyrElfPath
                  : path.join(workspaceRoot, options.zephyrElfPath)),
              },
            ),
          ),
        ).catch((error) => {
          console.error("Trace conversion failed:", error);
          vscode.window.showErrorMessage(
            `Trace conversion failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          return [];
        });

        const fileLinks = (
          await Promise.all(
            files.map(async (file) => {
              let uri = vscode.Uri.file(file);

              // Check if we are in a Remote environment (WSL, SSH, Dev Container)
              // Without using asExternalUri, the link would point to the local filesystem which is not accessible in Remote contexts
              if (vscode.env.remoteName) {
                uri = vscode.Uri.from({
                  scheme: "command",
                  path: "vscode.open",
                  query: JSON.stringify(
                    (await vscode.env.asExternalUri(uri)).query,
                  ),
                });
              }
              return `[${path.basename(file)}](${uri.toString()})`;
            }),
          )
        ).join(", ");

        return [files, fileLinks];
      } catch (error: unknown) {
        console.error("Error processing trace files:", error);
        vscode.window.showErrorMessage(
          `Error processing trace files: ${error instanceof Error ? error.message : String(error)}`,
        );
        return [];
      }
    },
  );

  // in this case we had an error
  if (!files) {
    return;
  }

  if (files.length === 0) {
    vscode.window.showInformationMessage("No traces were captured.");
    return;
  }

  vscode.window
    .showInformationMessage(
      `Traces captured successfully: ${fileLinks}`,
      "Choose a file to open",
    )
    .then(async (selection) => {
      if (selection === "Choose a file to open") {
        const file = await vscode.window.showQuickPick(files);
        if (file) {
          vscode.commands.executeCommand("vscode.open", vscode.Uri.file(file));
        }
      }
    });
}
