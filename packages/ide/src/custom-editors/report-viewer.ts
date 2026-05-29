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
import { ViewProviderPanel } from "../view-provider/view-provider-panel";

import { Messenger } from "vscode-messenger";
import {
  layerDataRequestMessage,
  reportRequestMessage,
} from "../constants/messages/report-view-messages";
import { AIModelProfileReport, Report } from "../types/report-view-types";
import {
  createLayerDataBase,
  handleLayerDataQuery,
} from "./report-viewer/query-handler";
import { parseAndValidateReport } from "./report-viewer/report-schema";

export class ReportViewer implements vscode.CustomTextEditorProvider {
  public static readonly viewType = "cfs.reportViewer";
  public static readonly viewTypeJson = "cfs.reportViewer.json";

  public static register(
    context: vscode.ExtensionContext,
    messenger: Messenger,
  ): vscode.Disposable {
    const provider = new ReportViewer(context, messenger);

    const providerRegistration = vscode.window.registerCustomEditorProvider(
      ReportViewer.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );
    const providerRegistrationJson = vscode.window.registerCustomEditorProvider(
      ReportViewer.viewTypeJson,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      },
    );

    return vscode.Disposable.from(
      providerRegistration,
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
    const viewProviderPanel = new ViewProviderPanel(this.context, {
      distDir: "out/report-viewer",
      indexPath: "out/report-viewer/index.html",
    });

    try {
      const report = parseAndValidateReport(document.getText());

      this.registerHandlers(webviewPanel, report);
      await viewProviderPanel.resolveWebviewView(webviewPanel);
    } catch (error) {
      console.error("Error resolving custom text editor", error);
      await viewProviderPanel.resolveWebviewErrorView(webviewPanel, error);
    }
  }

  private registerHandlers(webviewPanel: vscode.WebviewPanel, report: Report) {
    const participant = this.messenger.registerWebviewPanel(webviewPanel);

    const disposables: vscode.Disposable[] = [];
    webviewPanel.onDidDispose(() => {
      disposables.forEach((d) => d.dispose());
    });

    disposables.push(
      this.messenger.onRequest(
        reportRequestMessage,
        () => {
          return report;
        },
        { sender: participant },
      ),
    );

    if (report.info.type === "profile") {
      const db = createLayerDataBase(report as AIModelProfileReport);

      disposables.push(
        this.messenger.onRequest(
          layerDataRequestMessage,
          (params) => handleLayerDataQuery(params.query, db),
          { sender: participant },
        ),
      );
    }
  }
}
