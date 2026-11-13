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
import * as path from "path";
import { ViewProviderPanel } from "../view-provider/view-provider-panel";

import { Messenger } from "vscode-messenger";
import {
  layerDataRequestMessage,
  reportRequestMessage,
  reportUpdatedNotification,
} from "../constants/messages/report-view-messages";
import type { Report } from "../types/report-view-types";
import {
  createLayerDataBase,
  handleLayerDataQuery,
} from "./report-viewer/query-handler";
import { parseAndValidateReport } from "./report-viewer/report-schema";
import { buildRuntimeReportFromTef } from "cfs-lib";
import { getTelemetryManager } from "../telemetry/telemetry";
import { TELEMETRY_ACTIONS } from "../telemetry/action-names";

type LayerDatabase = ReturnType<typeof createLayerDataBase>;

type ReportState = {
  report: Report;
  db?: LayerDatabase;
  isRuntime: boolean;
};

export class ReportViewer implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "cfs.reportViewer";
  public static readonly viewTypeTef = "cfs.reportViewer.tef";
  public static readonly viewTypeJson = "cfs.reportViewer.json";

  public static register(
    context: vscode.ExtensionContext,
    messenger: Messenger,
  ): vscode.Disposable {
    const provider = new ReportViewer(context, messenger);
    const webviewOptions = {
      webviewOptions: {
        retainContextWhenHidden: true,
      },
    };

    const providerRegistration = vscode.window.registerCustomEditorProvider(
      ReportViewer.viewType,
      provider,
      webviewOptions,
    );
    const providerRegistrationTef = vscode.window.registerCustomEditorProvider(
      ReportViewer.viewTypeTef,
      provider,
      webviewOptions,
    );
    const providerRegistrationJson = vscode.window.registerCustomEditorProvider(
      ReportViewer.viewTypeJson,
      provider,
      webviewOptions,
    );

    return vscode.Disposable.from(
      providerRegistration,
      providerRegistrationTef,
      providerRegistrationJson,
    );
  }

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly messenger: Messenger,
  ) {}

  async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
  ): Promise<void> {
    void getTelemetryManager().then((telemetryManager) => {
      telemetryManager.logAction(TELEMETRY_ACTIONS.FEATURE_ACCESSED, {
        feature: "report_viewer",
      });
    });

    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/report-viewer",
      indexPath: "out/report-viewer/index.html",
    });

    try {
      const report = await this.loadReport(
        document.uri.fsPath,
        document.getText(),
      );
      const updateReport = this.registerHandlers(webviewPanel, report);

      // Watch the report file directly on the file system rather than
      // relying on VS Code's document model to notice the external
      // change: `onDidChangeTextDocument` does not reliably fire for a
      // document that only ever backs this custom editor and is never
      // rendered as a plain text editor.
      const watcher = vscode.workspace.createFileSystemWatcher(
        new vscode.RelativePattern(
          vscode.Uri.file(path.dirname(document.uri.fsPath)),
          path.basename(document.uri.fsPath),
        ),
      );
      const changeSubscription = watcher.onDidChange(async () => {
        try {
          const bytes = await vscode.workspace.fs.readFile(document.uri);
          updateReport(
            await this.loadReport(
              document.uri.fsPath,
              Buffer.from(bytes).toString("utf-8"),
            ),
          );
        } catch (error) {
          console.error("Error handling updated report file", error);
        }
      });
      webviewPanel.onDidDispose(() => {
        changeSubscription.dispose();
        watcher.dispose();
      });

      await viewProviderPanel.resolveWebviewView(webviewPanel);
    } catch (error) {
      console.error("Error resolving custom text editor", error);
      await viewProviderPanel.resolveWebviewErrorView(webviewPanel, error);
    }
  }

  /**
   * Loads a report, converting `.tef` trace files into report content
   * in memory (no `.cfsreport` file is written to disk) before validating.
   * Files that are already `.cfsreport`/JSON are parsed directly from `text`.
   */
  private async loadReport(fsPath: string, text: string): Promise<Report> {
    if (path.extname(fsPath).toLowerCase() === ".tef") {
      const report = await buildRuntimeReportFromTef(fsPath);
      return parseAndValidateReport(JSON.stringify(report));
    }

    return parseAndValidateReport(text);
  }

  private static buildReportState(report: Report): ReportState {
    if (report.type === "profile" || report.type === "runtime-profile") {
      return {
        report,
        isRuntime: report.type === "runtime-profile",
        db: createLayerDataBase(report),
      };
    }

    return { report, isRuntime: false };
  }

  private registerHandlers(
    webviewPanel: vscode.WebviewPanel,
    initialReport: Report,
  ): (report: Report) => void {
    const participant = this.messenger.registerWebviewPanel(webviewPanel);

    const disposables: vscode.Disposable[] = [];
    webviewPanel.onDidDispose(() => {
      disposables.forEach((d) => d.dispose());
    });

    let state = ReportViewer.buildReportState(initialReport);
    let pendingUpdateNotification = false;

    const notifyReportUpdated = () => {
      pendingUpdateNotification = false;
      void this.messenger.sendNotification(
        reportUpdatedNotification,
        participant,
        undefined,
      );
    };

    // vscode-messenger silently drops notifications sent to a hidden
    // webview (its `ignoreHiddenViews` option defaults to true) - which is
    // exactly the state this tab is normally in while the user regenerates
    // the report from the AI tab. Defer the notification until the tab is
    // actually visible again instead of losing it.
    disposables.push(
      webviewPanel.onDidChangeViewState((e) => {
        if (e.webviewPanel.visible && pendingUpdateNotification) {
          notifyReportUpdated();
        }
      }),
    );

    disposables.push(
      this.messenger.onRequest(reportRequestMessage, () => state.report, {
        sender: participant,
      }),
    );

    disposables.push(
      this.messenger.onRequest(
        layerDataRequestMessage,
        (params) => {
          if (!state.db) {
            throw new Error(
              "Layer data is not available for this report type.",
            );
          }

          return handleLayerDataQuery(params.query, state.db, state.isRuntime);
        },
        { sender: participant },
      ),
    );

    return (report: Report) => {
      state = ReportViewer.buildReportState(report);

      if (webviewPanel.visible) {
        notifyReportUpdated();
      } else {
        pendingUpdateNotification = true;
      }
    };
  }
}
