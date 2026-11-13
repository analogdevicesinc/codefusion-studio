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
import { convertTrace, Recording, TraceConversionOptions } from "cfs-lib";
import { IDEShellEnvProvider } from "../../toolchains/shell-env-provider";
import path from "node:path";

// VS Code truncates notification messages at 1000 raw characters; stay well under that.
const NOTIFICATION_CHAR_BUDGET = 700;
const TRACE_SUCCESS_PREFIX = "Traces captured successfully: ";

/**
 * Joins file links into a single string that keeps the success notification
 * within {@link NOTIFICATION_CHAR_BUDGET}. Links that do not fit are replaced by
 * an "and N more" note. When not even one link fits, returns a plain "N files"
 * count so the message doesn't get truncated by VS Code.
 */
function buildTraceLinksSummary(links: string[]): string {
  const separator = ", ";
  const overflowReserve = 32; // room for the ", and N more" note
  const included: string[] = [];
  let length = TRACE_SUCCESS_PREFIX.length;

  for (const link of links) {
    const addition = (included.length > 0 ? separator.length : 0) + link.length;
    if (length + addition + overflowReserve > NOTIFICATION_CHAR_BUDGET) {
      break;
    }
    included.push(link);
    length += addition;
  }

  if (included.length === 0) {
    // No links fit the character limit. Fallback to a simple count of files.
    return `${links.length} files`;
  }

  let summary = included.join(separator);
  const omitted = links.length - included.length;
  if (omitted > 0) {
    summary += `${separator}and ${omitted} more`;
  }

  return summary;
}

// Raw text captures (e.g. from MSDK workspaces, see Recording's
// `format: "txt"` option) cannot be converted to a CTF trace or a report,
// so they are only listed in the notification/quick pick, never converted.
const RAW_TEXT_EXTENSION = ".txt";

export async function startTraceConversion(
  recording: Recording,
  shellEnvProvider: IDEShellEnvProvider,
  options?: TraceConversionOptions,
): Promise<string[]> {
  const rawTextFiles = recording.capturedFiles.filter(
    (file) => path.extname(file) === RAW_TEXT_EXTENSION,
  );
  const traceFiles = recording.capturedFiles.filter(
    (file) => path.extname(file) !== RAW_TEXT_EXTENSION,
  );

  const [files, fileLinksText] = await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: "Processing trace files...",
      cancellable: false,
    },
    async () => {
      try {
        let files: string[] = [];

        if (traceFiles.length > 0) {
          const workspaceRoot = getWorkspaceRoot() ?? "";

          const environment = await shellEnvProvider.getShellEnvironment();
          if (!environment) {
            throw new Error("Failed to get shell environment.");
          }

          files = await Promise.all(
            traceFiles.map((file) =>
              convertTrace(
                file,
                environment,
                options && {
                  buildDir:
                    options.buildDir &&
                    (path.isAbsolute(options.buildDir)
                      ? options.buildDir
                      : path.join(workspaceRoot, options.buildDir)),
                  zephyrElfPath:
                    options.zephyrElfPath &&
                    (path.isAbsolute(options.zephyrElfPath)
                      ? options.zephyrElfPath
                      : path.join(workspaceRoot, options.zephyrElfPath)),
                },
              ),
            ),
          ).catch((error) => {
            console.error("Trace conversion failed:", error);
            vscode.window.showErrorMessage(
              `Trace conversion failed: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            return [];
          });
        }

        // Raw text captures are already final output: list them alongside
        // the converted trace files, but don't attempt to convert them.
        const displayFiles = [...files, ...rawTextFiles];

        const fileLinks = await Promise.all(
          displayFiles.map(async (file) => {
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
        );

        const fileLinksText = buildTraceLinksSummary(fileLinks);

        return [files, fileLinksText];
      } catch (error: unknown) {
        console.error("Error processing trace files:", error);
        vscode.window.showErrorMessage(
          `Error processing trace files: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return [];
      }
    },
  );

  // in this case we had an error
  if (!files) {
    return [];
  }

  if (files.length === 0 && rawTextFiles.length === 0) {
    vscode.window.showInformationMessage("No traces were captured.");
    return [];
  }

  const pickableFiles = [...files, ...rawTextFiles];

  vscode.window
    .showInformationMessage(
      `${TRACE_SUCCESS_PREFIX}${fileLinksText}`,
      "Choose a file to open",
    )
    .then(async (selection) => {
      if (selection === "Choose a file to open") {
        const file = await vscode.window.showQuickPick(pickableFiles);
        if (file) {
          vscode.commands.executeCommand("vscode.open", vscode.Uri.file(file));
        }
      }
    });

  // Only converted trace files are returned: raw text captures are not
  // converted to a CTF trace and cannot be turned into a report, so callers
  // that generate reports from the returned files must not see them here.
  return files;
}
