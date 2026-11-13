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
import type { Messenger } from "vscode-messenger";
import type { ResponseError } from "vscode-messenger-common";
import { ViewProviderPanel } from "../../view-provider/view-provider-panel";
import * as path from "node:path";
import { DEFAULT_TEXT_EDITOR_ID, WEST_EDITOR_ID } from "./constants";
import {
  registerOpenWestAsTextCommand,
  registerOpenWestInEditorCommand,
} from "./commands";
import {
  westEditorChangedNotification,
  westEditorImportsRequest,
  westEditorOpenManifestRequest,
  westEditorProjectStatusRequest,
  westEditorRequestMessage,
  westEditorRevealRequest,
  westEditorStatusChangedNotification,
  westEditorUpdateRequest,
} from "./messages";
import type { WestManifest } from "./types";
import {
  applyManifestEdits,
  parseWestManifest,
  WestYamlError,
} from "./document";
import { resolveManifestImports } from "./imports";
import { WestEngine } from "./west/engine";
import { findWestTopdir } from "./west/workspace";
import type { IDEShellEnvProvider } from "../../toolchains/shell-env-provider";
import { getTelemetryManager } from "../../telemetry/telemetry";
import { TELEMETRY_ACTIONS } from "../../telemetry/action-names";
import { logger } from "../../utils/logger";

/**
 * Custom text editor for Zephyr `west.yml` manifests.
 *
 * The editor is a thin form over the {@link WestManifest} data model. It stays
 * in sync with the plain text editor in both directions: edits made in the
 * webview are applied to the `TextDocument` through a `WorkspaceEdit`, and
 * edits made to the document elsewhere push the webview a refresh
 * notification.
 */
export class WestEditor implements vscode.CustomTextEditorProvider {
  public static readonly viewType = WEST_EDITOR_ID;

  /**
   * Registers the editor with VS Code, along with the title bar commands that
   * switch a `west.yml` between this editor and the plain text editor.
   *
   * @param context Extension context used to resolve webview assets.
   * @param messenger Shared messenger used for typed webview communication.
   * @param shellEnvProvider Supplies the SDK environment west and git run in.
   * @returns A disposable that unregisters the provider and its commands.
   */
  public static register(
    context: vscode.ExtensionContext,
    messenger: Messenger,
    shellEnvProvider: IDEShellEnvProvider,
  ): vscode.Disposable {
    const engine = new WestEngine({
      getEnvironment: () => shellEnvProvider.getShellEnvironment(),
      onProjectError: (name, error) => {
        logger.warn(`Could not read the status of west project ${name}`, error);
      },
      // Badges relative to the open file; "workspace" limits them to the resolved workspace.
      scope: "file",
    });

    return vscode.Disposable.from(
      vscode.window.registerCustomEditorProvider(
        WestEditor.viewType,
        new WestEditor(context, messenger, engine),
        {
          webviewOptions: {
            retainContextWhenHidden: true,
          },
        },
      ),
      registerOpenWestAsTextCommand(),
      registerOpenWestInEditorCommand(),
    );
  }

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly messenger: Messenger,
    private readonly engine: WestEngine,
  ) {}

  /**
   * Renders the webview for a `west.yml` document and wires up two-way sync.
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    void getTelemetryManager().then((telemetryManager) => {
      telemetryManager.logAction(TELEMETRY_ACTIONS.FEATURE_ACCESSED, {
        feature: "west_editor",
      });
    });

    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/west-editor",
      indexPath: "out/west-editor/index.html",
    });

    // Handlers are wired before the view is resolved, and unconditionally: a
    // malformed manifest is reported to the webview as a failed request, not
    // by swapping in the static error view. `resolveCustomTextEditor` runs
    // once per panel, so a panel that bailed out here would have no document
    // listener and could never recover once the YAML was fixed.
    this.registerHandlers(document, webviewPanel);

    try {
      await viewProviderPanel.resolveWebviewView(webviewPanel);
    } catch (error) {
      logger.error("Error resolving west editor", error);
      await viewProviderPanel.resolveWebviewErrorView(webviewPanel, error);
    }
  }

  /**
   * Wires the request/notification handlers and the document change listener
   * for a single webview panel. All per-panel state lives in this closure
   * because the provider instance is shared across every open panel.
   */
  private registerHandlers(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): void {
    const participant = this.messenger.registerWebviewPanel(webviewPanel);

    const disposables: vscode.Disposable[] = [];
    webviewPanel.onDidDispose(() => {
      disposables.forEach((disposable) => disposable.dispose());
    });

    // Text this editor last wrote into the document. Used to recognise the
    // change event caused by our own write-back so the webview is not told to
    // reload state it already has.
    let lastWrittenText: string | undefined;
    let pendingChangeNotification = false;

    const notifyManifestChanged = () => {
      pendingChangeNotification = false;
      void this.messenger.sendNotification(
        westEditorChangedNotification,
        participant,
        undefined,
      );
    };

    const notifyStatusChanged = () => {
      void this.messenger.sendNotification(
        westEditorStatusChangedNotification,
        participant,
        undefined,
      );
    };

    // vscode-messenger drops notifications sent to a hidden webview (its
    // `ignoreHiddenViews` option defaults to true), so defer until the tab is
    // visible again instead of losing the refresh.
    let wasVisible = webviewPanel.visible;
    disposables.push(
      webviewPanel.onDidChangeViewState((e) => {
        const visible = e.webviewPanel.visible;

        if (visible && pendingChangeNotification) {
          notifyManifestChanged();
        }

        // Git state can change while the tab is hidden.
        if (visible && !wasVisible) notifyStatusChanged();

        wasVisible = visible;
      }),
    );

    // Webview -> extension: read the current document. The messenger sends
    // an Error's stack as its data, so a YAML error is rethrown as a plain
    // response error to carry its problems instead.
    disposables.push(
      this.messenger.onRequest(
        westEditorRequestMessage,
        () => {
          try {
            return parseWestManifest(document.getText());
          } catch (error) {
            if (error instanceof WestYamlError) {
              throw {
                message: error.message,
                data: error.problems,
              } satisfies ResponseError;
            }

            throw error;
          }
        },
        { sender: participant },
      ),
    );

    // Webview -> extension: show a span of the document in the text editor.
    // A text tab already open for the document is reused, in its own group.
    disposables.push(
      this.messenger.onRequest(
        westEditorRevealRequest,
        async ({ start, end }) => {
          const openGroup = vscode.window.tabGroups.all.find((group) =>
            group.tabs.some(
              (tab) =>
                tab.input instanceof vscode.TabInputText &&
                tab.input.uri.toString() === document.uri.toString(),
            ),
          );

          try {
            await vscode.commands.executeCommand(
              "vscode.openWith",
              document.uri,
              DEFAULT_TEXT_EDITOR_ID,
              {
                viewColumn: openGroup?.viewColumn,
                selection: new vscode.Range(
                  document.positionAt(start),
                  document.positionAt(end),
                ),
              } satisfies vscode.TextDocumentShowOptions,
            );
          } catch (error) {
            logger.error(
              "Could not show the YAML error in the text editor",
              error,
            );
            throw error;
          }
        },
        { sender: participant },
      ),
    );

    // Webview -> extension: list the manifests the given manifest imports.
    // The topdir is searched on every request rather than cached: the
    // workspace can be initialised while the editor is open.
    disposables.push(
      this.messenger.onRequest(
        westEditorImportsRequest,
        async (manifest: WestManifest) =>
          resolveManifestImports(
            manifest,
            document.uri.fsPath,
            await findWestTopdir(path.dirname(document.uri.fsPath)),
          ),
        { sender: participant },
      ),
    );

    // Webview -> extension: compare each project on disk with the workspace.
    // A newer request cancels the one still running.
    let statusRequest: AbortController | undefined;
    disposables.push(
      { dispose: () => statusRequest?.abort() },
      this.messenger.onRequest(
        westEditorProjectStatusRequest,
        async () => {
          statusRequest?.abort();
          statusRequest = new AbortController();

          const result = await this.engine.getProjectStatuses(
            document.uri.fsPath,
            parseWestManifest(document.getText()),
            statusRequest.signal,
          );

          const unavailable = result.unavailable;
          const message = `West project statuses: ${unavailable?.message}`;

          // Outside a workspace is expected; anything else is worth a warning.
          if (unavailable?.reason === "not-a-workspace") {
            logger.info(message);
          } else if (unavailable) {
            logger.warn(message);
          }

          return result;
        },
        { sender: participant },
      ),
    );

    // West reads the saved file, so saving can change the statuses.
    disposables.push(
      vscode.workspace.onDidSaveTextDocument((saved) => {
        if (saved.uri.toString() === document.uri.toString()) {
          notifyStatusChanged();
        }
      }),
    );

    // Webview -> extension: open an imported manifest in this editor.
    // `vscode.openWith` rather than `vscode.open`: a submanifest is rarely
    // named `west.yml`, so the selector alone would leave it as plain text.
    // The explicit stat turns a missing file into a failed request rather
    // than an editor tab showing VS Code's own "file not found" error.
    disposables.push(
      this.messenger.onRequest(
        westEditorOpenManifestRequest,
        async (absolutePath: string) => {
          const uri = vscode.Uri.file(absolutePath);

          try {
            await vscode.workspace.fs.stat(uri);
            await vscode.commands.executeCommand(
              "vscode.openWith",
              uri,
              WestEditor.viewType,
            );
          } catch (error) {
            // Most often a project `west update` has not cloned yet. Logged
            // here, in the Output Channel, rather than in the webview.
            logger.error(
              `Could not open the imported manifest ${absolutePath}`,
              error,
            );
            throw error;
          }
        },
        { sender: participant },
      ),
    );

    // Webview -> extension: write an edited manifest back to the document.
    disposables.push(
      this.messenger.onRequest(
        westEditorUpdateRequest,
        async (manifest: WestManifest) => {
          const currentText = document.getText();
          const updatedText = applyManifestEdits(currentText, manifest);

          if (updatedText === currentText) return;

          const edit = new vscode.WorkspaceEdit();
          edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            updatedText,
          );

          lastWrittenText = updatedText;

          if (!(await vscode.workspace.applyEdit(edit))) {
            lastWrittenText = undefined;
            throw new Error("Failed to apply changes to west.yml.");
          }
        },
        { sender: participant },
      ),
    );

    // Extension -> webview: the document changed somewhere else, most often
    // the plain text editor opened via the editor title button.
    disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() !== document.uri.toString()) return;

        if (e.document.getText() === lastWrittenText) {
          // Echo of our own write-back; the webview is already up to date.
          return;
        }

        lastWrittenText = undefined;

        if (webviewPanel.visible) {
          notifyManifestChanged();
        } else {
          pendingChangeNotification = true;
        }
      }),
    );
  }
}
